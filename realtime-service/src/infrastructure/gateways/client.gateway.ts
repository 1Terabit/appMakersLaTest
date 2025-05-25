import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, Inject } from '@nestjs/common';

import { Server, Socket } from 'socket.io';
import { IRealtimeService } from '../../ports/in/realtime-service.port';
import { IDriverService } from '../../ports/out/driver-service.port';

/**
 * WebSocket Gateway for clients to receive driver location updates
 */
@WebSocketGateway({
  namespace: 'client',
  cors: {
    origin: '*', // In production, this should be more restrictive
  },
})
export class ClientGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ClientGateway.name);
  private clientIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly ONLINE_UPDATE_INTERVAL = 5000; // 5 seconds
  private readonly OFFLINE_UPDATE_INTERVAL = 60000; // 1 minute

  constructor(
    @Inject('IRealtimeService') private readonly realtimeService: IRealtimeService,
    @Inject('IDriverService') private readonly driverService: IDriverService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clear update intervals
    if (this.clientIntervals.has(client.id)) {
      clearInterval(this.clientIntervals.get(client.id));
      this.clientIntervals.delete(client.id);
    }
  }

  /**
   * Handles client subscription to driver updates
   */
  @SubscribeMessage('subscribe-driver')
  async handleSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() driverId: string,
  ) {
    try {
      this.logger.log(`Client ${client.id} subscribing to driver ${driverId}`);
      
      // Subscribe the client to driver updates
      await this.realtimeService.subscribeToDriverUpdates(client.id, driverId);
      
      // Send latest known location and driver profile immediately
      await this.sendDriverUpdate(client.id, driverId);
      
      // Clear previous interval if exists
      if (this.clientIntervals.has(client.id)) {
        clearInterval(this.clientIntervals.get(client.id));
      }
      
      // Configure interval to send periodic updates
      const interval = setInterval(async () => {
        await this.sendDriverUpdate(client.id, driverId);
      }, this.ONLINE_UPDATE_INTERVAL);
      
      this.clientIntervals.set(client.id, interval);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Error subscribing client ${client.id} to driver ${driverId}`, error.stack);
      // Use the to() method to emit to the specific socket
      this.server.to(client.id).emit('error', { message: 'Error subscribing to driver' });
      return { success: false, error: 'Error subscribing to driver' };
    }
  }

  /**
   * Sends driver location and profile update to the client
   * @param clientId The ID of the client socket
   * @param driverId The ID of the driver to track
   */
  private async sendDriverUpdate(clientId: string, driverId: string) {
    try {
      // In Socket.IO v4, we use server.in() or server.to() to emit events to a specific socket
      // instead of server.sockets.get()
      // Verify if the socket exists in the connection
      if (!this.server.sockets.adapter.rooms.has(clientId)) {
        this.logger.warn(`Client ${clientId} not found when trying to send update`);
        return;
      }
      
      const driverData = await this.realtimeService.getDriverLocationAndProfile(driverId);
      
      if (!driverData) {
        // Emit event to client using to() instead of get().emit()
        this.server.to(clientId).emit('driver-offline', {
          driverId,
          errorCode: 'OFFLINE_DRIVER',
          message: 'Driver is not available',
          lastUpdateTime: null,
        });
        
        // Change to offline update interval for offline drivers
        if (this.clientIntervals.has(clientId)) {
          clearInterval(this.clientIntervals.get(clientId));
          const offlineInterval = setInterval(async () => {
            await this.sendDriverUpdate(clientId, driverId);
          }, this.OFFLINE_UPDATE_INTERVAL);
          
          this.clientIntervals.set(clientId, offlineInterval);
        }
        
        return;
      }
      
      const { location, profile } = driverData;
      
      // Check if the driver is online (data is less than 10 minutes old)
      if (location.isRecent()) {
        // The driver is online, send the current location
        this.server.to(clientId).emit('driver-update', {
          driverId,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp,
          },
          profile: {
            name: profile.name,
            profileImage: profile.profileImage,
          },
          isOnline: true,
        });
        
        // Make sure we are using the interval for online drivers
        if (this.clientIntervals.has(clientId)) {
          const currentInterval = this.clientIntervals.get(clientId);
          clearInterval(currentInterval);
          const onlineInterval = setInterval(async () => {
            await this.sendDriverUpdate(clientId, driverId);
          }, this.ONLINE_UPDATE_INTERVAL);
          
          this.clientIntervals.set(clientId, onlineInterval);
        }
      } else {
        // The driver is offline (data is more than 10 minutes old)
        this.server.to(clientId).emit('driver-offline', {
          driverId,
          errorCode: 'OFFLINE_DRIVER',
          message: 'The driver has not sent their location in the last 10 minutes',
          lastUpdateTime: location.timestamp,
        });
        
        // Reset the interval for offline drivers
        if (this.clientIntervals.has(clientId)) {
          const currentInterval = this.clientIntervals.get(clientId);
          clearInterval(currentInterval);
          const offlineInterval = setInterval(async () => {
            await this.sendDriverUpdate(clientId, driverId);
          }, this.OFFLINE_UPDATE_INTERVAL);
          
          this.clientIntervals.set(clientId, offlineInterval);
        }
      }
    } catch (error) {
      this.logger.error(`Error sending update to client ${clientId} for driver ${driverId}`, error.stack);
    }
  }
}

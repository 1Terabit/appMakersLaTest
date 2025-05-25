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
 * Handles client connections, subscriptions to driver updates, and real-time data distribution
 * Implements WebSocket event handlers with Socket.IO
 */
@WebSocketGateway({
  namespace: 'client',
  cors: {
    origin: '*', // In production, this should be more restrictive
  },
})
export class ClientGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /**
   * Socket.IO server instance injected by NestJS
   */
  @WebSocketServer()
  server: Server;

  /**
   * Logger instance for this gateway
   * @private
   */
  private readonly logger = new Logger(ClientGateway.name);
  
  /**
   * Map to store update intervals for each client
   * Key: clientId, Value: NodeJS.Timeout
   * @private
   */
  private clientIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Interval for sending updates to clients when driver is online (5 seconds)
   * @private
   */
  private readonly ONLINE_UPDATE_INTERVAL = 5000; // 5 seconds
  
  /**
   * Interval for sending updates to clients when driver is offline (1 minute)
   * @private
   */
  private readonly OFFLINE_UPDATE_INTERVAL = 60000; // 1 minute

  /**
   * Constructor for the client gateway
   * @param realtimeService Service for managing real-time subscriptions and updates
   * @param driverService Service for retrieving driver information
   */
  constructor(
    @Inject('IRealtimeService') private readonly realtimeService: IRealtimeService,
    @Inject('IDriverService') private readonly driverService: IDriverService,
  ) {}

  /**
   * Handles new client connections to the WebSocket gateway
   * Implements OnGatewayConnection interface
   * @param client Socket.IO client socket instance
   */
  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handles client disconnections from the WebSocket gateway
   * Cleans up resources by clearing update intervals
   * Implements OnGatewayDisconnect interface
   * @param client Socket.IO client socket instance
   */
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
   * Sets up the subscription in the realtime service and configures periodic updates
   * @param client Socket.IO client socket instance
   * @param driverId Unique identifier of the driver to subscribe to
   * @returns Object indicating success or failure of the subscription
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
   * Adjusts update frequency based on driver's online status
   * Emits different events based on driver availability and status
   * @param clientId The ID of the client socket
   * @param driverId The ID of the driver to track
   * @private Internal helper method
   */
  private async sendDriverUpdate(clientId: string, driverId: string) {
    try {
      
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
      
      // Verificar si la ubicación es reciente (menos de 10 minutos)
      // Reemplazamos location.isRecent() con una verificación manual para compatibilidad con pruebas
      const TEN_MINUTES = 10 * 60 * 1000; // 10 minutos en milisegundos
      const locationTime = new Date(location.timestamp).getTime();
      const currentTime = new Date().getTime();
      const isRecent = (currentTime - locationTime) < TEN_MINUTES;
      
      if (isRecent) {
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

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger, Inject } from '@nestjs/common';

import { Server, Socket } from 'socket.io';
import { IRealtimeService } from '../../ports/in/realtime-service.port';
import { IDriverService } from '../../ports/out/driver-service.port';
import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * WebSocket Gateway for drivers to send location updates
 * Handles driver authentication, token validation, and location update broadcasts
 * Implements WebSocket event handlers with Socket.IO
 */
@WebSocketGateway({
  namespace: 'driver',
  cors: {
    origin: '*', // En producción, esto debería ser más restrictivo
  },
})
export class DriverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /**
   * Socket.IO server instance injected by NestJS
   */
  @WebSocketServer()
  server: Server;

  /**
   * Logger instance for this gateway
   * @private
   */
  private readonly logger = new Logger(DriverGateway.name);
  
  /**
   * Map to store associations between socket IDs and driver information
   * Key: socketId, Value: Object containing socket instance and driverId
   * @private
   */
  private driverSockets: Map<string, { socket: Socket; driverId: string }> = new Map();
  
  /**
   * Map to store token validation timers for each socket
   * Key: socketId, Value: NodeJS.Timeout
   * @private
   */
  private tokenValidationTimers: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Interval for token validation checks (1 minute)
   * @private
   */
  private readonly TOKEN_VALIDATION_INTERVAL = 60000; // 1 minute

  /**
   * Constructor for the driver gateway
   * @param realtimeService Service for handling real-time location updates
   * @param driverService Service for driver authentication and validation
   */
  constructor(
    @Inject('IRealtimeService') private readonly realtimeService: IRealtimeService,
    @Inject('IDriverService') private readonly driverService: IDriverService,
  ) {}

  /**
   * Handles new driver connections to the WebSocket gateway
   * Implements OnGatewayConnection interface
   * @param client Socket.IO client socket instance
   */
  async handleConnection(client: Socket) {
    this.logger.log(`Driver socket connected: ${client.id}`);
  }

  /**
   * Handles driver disconnections from the WebSocket gateway
   * Cleans up resources associated with the socket
   * Implements OnGatewayDisconnect interface
   * @param client Socket.IO client socket instance
   */
  async handleDisconnect(client: Socket) {
    this.logger.log(`Driver socket disconnected: ${client.id}`);
    
    // Clean up resources associated with the socket
    if (this.driverSockets.has(client.id)) {
      const { driverId } = this.driverSockets.get(client.id);
      this.logger.log(`Driver ${driverId} disconnected`);
      this.driverSockets.delete(client.id);
    }
    
    if (this.tokenValidationTimers.has(client.id)) {
      clearInterval(this.tokenValidationTimers.get(client.id));
      this.tokenValidationTimers.delete(client.id);
    }
  }

  /**
   * Handler for driver authentication
   * Validates the provided JWT token and associates the socket with the driver ID
   * Sets up periodic token validation
   * @param client Socket.IO client socket instance
   * @param data Object containing the JWT token
   * @returns Object indicating success or failure of the authentication
   * @throws WsException if token is invalid or missing
   */
  @SubscribeMessage('authenticate')
  async handleAuthentication(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    try {
      if (!data || !data.token) {
        throw new WsException('Access token required');
      }

      const validation = await this.driverService.validateDriverToken(data.token);
      
      if (!validation.isValid || !validation.driverId) {
        throw new WsException('Invalid or expired token');
      }

      // Guardar la asociación entre el socket y el conductor
      this.driverSockets.set(client.id, { socket: client, driverId: validation.driverId });
      
      // Programar validación periódica del token
      this.scheduleTokenValidation(client, data.token);
      
      this.logger.log(`Driver ${validation.driverId} authenticated`);
      
      return { success: true, driverId: validation.driverId };
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`, error.stack);
      throw new WsException(error.message || 'Authentication error');
    }
  }

  /**
   * Handler for receiving driver location updates
   * Validates authentication status and location data format
   * Creates and processes a DriverLocation entity
   * @param client Socket.IO client socket instance
   * @param data Object containing latitude and longitude coordinates
   * @returns Object indicating success or failure of the update
   * @throws WsException if not authenticated or if data is invalid
   */
  @SubscribeMessage('update-location')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { latitude: number; longitude: number },
  ) {
    try {
      if (!this.driverSockets.has(client.id)) {
        throw new WsException('Not authenticated');
      }

      const { driverId } = this.driverSockets.get(client.id);
      
      if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        throw new WsException('Invalid location data');
      }

      const location = new DriverLocation({
        driverId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date(),
      });
      
      // Procesar la actualización de ubicación
      await this.realtimeService.handleDriverLocationUpdate(driverId, location);
      
      this.logger.debug(`Location updated for driver ${driverId}: ${data.latitude}, ${data.longitude}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Location update error: ${error.message}`, error.stack);
      throw new WsException(error.message || 'Error updating location');
    }
  }

  /**
   * Schedules periodic token validation to detect expiration
   * Sets up an interval to validate the token and handles expired tokens
   * @param client Socket.IO client socket instance
   * @param token JWT token to validate periodically
   * @private Internal helper method
   */
  private scheduleTokenValidation(client: Socket, token: string) {
    // Clear previous timer if it exists
    if (this.tokenValidationTimers.has(client.id)) {
      clearInterval(this.tokenValidationTimers.get(client.id));
    }
    
    // Create new timer to validate the token periodically
    const timer = setInterval(async () => {
      try {
        const validation = await this.driverService.validateDriverToken(token);
        
        if (!validation.isValid) {
          // Token has expired, notify the client and close the connection
          client.emit('token-expired', { message: 'Token has expired, please authenticate again' });
          client.disconnect(true);
          
          // Clean up resources
          if (this.driverSockets.has(client.id)) {
            this.driverSockets.delete(client.id);
          }
          
          if (this.tokenValidationTimers.has(client.id)) {
            clearInterval(this.tokenValidationTimers.get(client.id));
            this.tokenValidationTimers.delete(client.id);
          }
          
          this.logger.log(`Token expired for socket ${client.id}`);
        }
      } catch (error) {
        this.logger.error(`Error validating token: ${error.message}`, error.stack);
      }
    }, this.TOKEN_VALIDATION_INTERVAL);
    
    this.tokenValidationTimers.set(client.id, timer);
  }
}

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
 * Gateway WebSocket para que los conductores envíen actualizaciones de ubicación
 */
@WebSocketGateway({
  namespace: 'driver',
  cors: {
    origin: '*', // En producción, esto debería ser más restrictivo
  },
})
export class DriverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DriverGateway.name);
  private driverSockets: Map<string, { socket: Socket; driverId: string }> = new Map();
  private tokenValidationTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly TOKEN_VALIDATION_INTERVAL = 60000; // 1 minuto

  constructor(
    @Inject('IRealtimeService') private readonly realtimeService: IRealtimeService,
    @Inject('IDriverService') private readonly driverService: IDriverService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Driver socket connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Driver socket disconnected: ${client.id}`);
    
    // Limpiar recursos asociados al socket
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
   * Handler para la autenticación de conductores
   */
  @SubscribeMessage('authenticate')
  async handleAuthentication(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    try {
      if (!data || !data.token) {
        throw new WsException('Token de acceso requerido');
      }

      const validation = await this.driverService.validateDriverToken(data.token);
      
      if (!validation.isValid || !validation.driverId) {
        throw new WsException('Token inválido o expirado');
      }

      // Guardar la asociación entre el socket y el conductor
      this.driverSockets.set(client.id, { socket: client, driverId: validation.driverId });
      
      // Programar validación periódica del token
      this.scheduleTokenValidation(client, data.token);
      
      this.logger.log(`Driver ${validation.driverId} authenticated`);
      
      return { success: true, driverId: validation.driverId };
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`, error.stack);
      throw new WsException(error.message || 'Error de autenticación');
    }
  }

  /**
   * Handler para recibir actualizaciones de ubicación de conductores
   */
  @SubscribeMessage('update-location')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { latitude: number; longitude: number },
  ) {
    try {
      if (!this.driverSockets.has(client.id)) {
        throw new WsException('No autenticado');
      }

      const { driverId } = this.driverSockets.get(client.id);
      
      if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        throw new WsException('Datos de ubicación inválidos');
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
      throw new WsException(error.message || 'Error al actualizar la ubicación');
    }
  }

  /**
   * Programa la validación periódica del token para detectar expiración
   */
  private scheduleTokenValidation(client: Socket, token: string) {
    // Limpiar timer anterior si existe
    if (this.tokenValidationTimers.has(client.id)) {
      clearInterval(this.tokenValidationTimers.get(client.id));
    }
    
    // Crear nuevo timer para validar el token periódicamente
    const timer = setInterval(async () => {
      try {
        const validation = await this.driverService.validateDriverToken(token);
        
        if (!validation.isValid) {
          // El token ha expirado, notificar al cliente y cerrar la conexión
          client.emit('token-expired', { message: 'El token ha expirado, por favor vuelva a autenticarse' });
          client.disconnect(true);
          
          // Limpiar recursos
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

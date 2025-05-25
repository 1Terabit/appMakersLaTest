import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DriverLocation } from '../../domain/driver-location.entity';
import { IRealtimeMessaging } from '../../ports/out/messaging.port';

@Injectable()
export class RedisRealtimeMessaging implements IRealtimeMessaging, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisRealtimeMessaging.name);
  private publisher: Redis;
  private subscriber: Redis;
  private locationUpdateHandler: (driverId: string, location: DriverLocation) => void;

  constructor(private configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    
    // Conexión para publicar mensajes
    this.publisher = new Redis({
      host: redisHost,
      port: redisPort,
    });
    
    // Conexión para suscribirse a mensajes
    this.subscriber = new Redis({
      host: redisHost,
      port: redisPort,
    });

    this.handleError();
  }

  async onModuleInit() {
    // Configurar manejador de mensajes
    this.subscriber.on('message', (channel, message) => {
      try {
        if (channel === 'driver:location:updates') {
          const locationData = JSON.parse(message);
          const location = new DriverLocation({
            driverId: locationData.driverId,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: new Date(locationData.timestamp),
          });
          
          if (this.locationUpdateHandler) {
            this.locationUpdateHandler(location.driverId, location);
          }
        } else if (channel.startsWith('driver:') && channel.endsWith(':location')) {
          const driverId = channel.split(':')[1];
          const locationData = JSON.parse(message);
          const location = new DriverLocation({
            driverId: locationData.driverId,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: new Date(locationData.timestamp),
          });
          
          if (this.locationUpdateHandler) {
            this.locationUpdateHandler(driverId, location);
          }
        }
      } catch (error) {
        this.logger.error(`Error processing Redis message: ${error.message}`, error.stack);
      }
    });
    
    // Suscribirse al canal general
    await this.subscriber.subscribe('driver:location:updates');
    this.logger.log('Subscribed to driver:location:updates channel');
  }

  async onModuleDestroy() {
    // Cerrar conexiones Redis al terminar
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  async subscribeToDriverLocationUpdates(driverId: string): Promise<void> {
    const channel = `driver:${driverId}:location`;
    await this.subscriber.subscribe(channel);
    this.logger.log(`Subscribed to ${channel}`);
  }

  async unsubscribeFromDriverLocationUpdates(driverId: string): Promise<void> {
    const channel = `driver:${driverId}:location`;
    await this.subscriber.unsubscribe(channel);
    this.logger.log(`Unsubscribed from ${channel}`);
  }

  async publishDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void> {
    const channel = `driver:${driverId}:location`;
    const message = JSON.stringify(location);
    
    await this.publisher.publish(channel, message);
    this.logger.debug(`Published location update for driver ${driverId}`);
  }

  onDriverLocationUpdate(handler: (driverId: string, location: DriverLocation) => void): void {
    this.locationUpdateHandler = handler;
  }

  private handleError() {
    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', err);
    });
    
    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error', err);
    });
  }
}

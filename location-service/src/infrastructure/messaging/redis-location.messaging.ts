import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DriverLocation } from '../../domain/driver-location.entity';
import { ILocationMessaging } from '../../ports/out/messaging.port';

/**
 * Implementación Redis del sistema de mensajería para ubicaciones
 */
@Injectable()
export class RedisLocationMessaging implements ILocationMessaging {
  private readonly logger = new Logger(RedisLocationMessaging.name);
  private publisher: Redis;

  constructor(private configService: ConfigService) {
    // Conexión a Redis para publicar mensajes
    this.publisher = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', err);
    });

    this.logger.log('Redis publisher connected');
  }

  async publishLocationUpdate(location: DriverLocation): Promise<void> {
    try {
      const channel = `driver:${location.driverId}:location`;
      const message = JSON.stringify(location);
      
      await this.publisher.publish(channel, message);
      
      // También publicamos en un canal general para que cualquier instancia pueda recibir actualizaciones
      await this.publisher.publish('driver:location:updates', message);
      
      this.logger.debug(`Published location update for driver ${location.driverId}`);
    } catch (error) {
      this.logger.error(`Error publishing location update for driver ${location.driverId}`, error.stack);
      throw error;
    }
  }
}

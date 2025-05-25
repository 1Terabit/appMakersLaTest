import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DriverLocation } from '../../domain/driver-location.entity';
import { ILocationMessaging } from '../../ports/out/messaging.port';

/**
 * Redis implementation of the location messaging system
 * Handles publishing driver location updates to Redis channels
 * Implementation of the ILocationMessaging port from the hexagonal architecture
 */
@Injectable()
export class RedisLocationMessaging implements ILocationMessaging {
  /**
   * Logger instance for this service
   * @private
   */
  private readonly logger = new Logger(RedisLocationMessaging.name);
  
  /**
   * Redis client instance for publishing messages
   * @private
   */
  private publisher: Redis;

  /**
   * Constructor for the Redis location messaging service
   * Initializes the Redis publisher client using configuration
   * @param configService NestJS configuration service for environment variables
   */
  constructor(private configService: ConfigService) {
    // Connect to Redis for publishing messages
    this.publisher = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', err);
    });

    this.logger.log('Redis publisher connected');
  }

  /**
   * Publishes a driver location update to Redis channels
   * Published to both driver-specific and general channels for flexibility
   * @param location Driver location entity to publish
   * @returns Promise that resolves when the publish operation completes
   * @throws Error if the publish operation fails
   */
  async publishLocationUpdate(location: DriverLocation): Promise<void> {
    try {
      const channel = `driver:${location.driverId}:location`;
      const message = JSON.stringify(location);
      
      await this.publisher.publish(channel, message);
      
      // Also publish to a general channel so any instance can receive updates
      await this.publisher.publish('driver:location:updates', message);
      
      this.logger.debug(`Published location update for driver ${location.driverId}`);
    } catch (error) {
      this.logger.error(`Error publishing location update for driver ${location.driverId}`, error.stack);
      throw error;
    }
  }
}

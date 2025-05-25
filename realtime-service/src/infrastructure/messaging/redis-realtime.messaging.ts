import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DriverLocation } from '../../domain/driver-location.entity';
import { IRealtimeMessaging } from '../../ports/out/messaging.port';

/**
 * Redis implementation of the IRealtimeMessaging port
 * Handles driver location updates through Redis pub/sub system
 * Implements NestJS lifecycle hooks for proper connection management
 */
@Injectable()
export class RedisRealtimeMessaging implements IRealtimeMessaging, OnModuleInit, OnModuleDestroy {
  /**
   * Logger instance for this messaging service
   * @private
   */
  private readonly logger = new Logger(RedisRealtimeMessaging.name);
  
  /**
   * Redis client for publishing messages
   * @private
   */
  private publisher: Redis;
  
  /**
   * Redis client for subscribing to messages
   * @private
   */
  private subscriber: Redis;
  
  /**
   * Callback function for handling driver location updates
   * @private
   */
  private locationUpdateHandler: (driverId: string, location: DriverLocation) => void;

  /**
   * Creates an instance of RedisRealtimeMessaging
   * Sets up Redis connections for publishing and subscribing
   * @param configService NestJS config service for retrieving Redis configuration
   */
  constructor(private configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    
    // Connection for publishing messages
    this.publisher = new Redis({
      host: redisHost,
      port: redisPort,
    });
    
    // Connection for subscribing to messages
    this.subscriber = new Redis({
      host: redisHost,
      port: redisPort,
    });

    this.handleError();
  }

  /**
   * NestJS lifecycle hook executed when the module is initialized
   * Sets up Redis message handlers and subscribes to the main channel
   * @implements OnModuleInit
   */
  async onModuleInit() {
    // Configure message handler
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
    
    // Subscribe to the general channel
    await this.subscriber.subscribe('driver:location:updates');
    this.logger.log('Subscribed to driver:location:updates channel');
  }

  /**
   * NestJS lifecycle hook executed when the module is being destroyed
   * Closes Redis connections gracefully
   * @implements OnModuleDestroy
   */
  async onModuleDestroy() {
    // Close Redis connections on shutdown
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  /**
   * Subscribes to location updates for a specific driver
   * @param driverId The ID of the driver to subscribe to
   * @returns Promise that resolves when subscription is complete
   * @implements IRealtimeMessaging.subscribeToDriverLocationUpdates
   */
  async subscribeToDriverLocationUpdates(driverId: string): Promise<void> {
    const channel = `driver:${driverId}:location`;
    await this.subscriber.subscribe(channel);
    this.logger.log(`Subscribed to ${channel}`);
  }

  /**
   * Unsubscribes from location updates for a specific driver
   * @param driverId The ID of the driver to unsubscribe from
   * @returns Promise that resolves when unsubscription is complete
   * @implements IRealtimeMessaging.unsubscribeFromDriverLocationUpdates
   */
  async unsubscribeFromDriverLocationUpdates(driverId: string): Promise<void> {
    const channel = `driver:${driverId}:location`;
    await this.subscriber.unsubscribe(channel);
    this.logger.log(`Unsubscribed from ${channel}`);
  }

  /**
   * Publishes a location update for a specific driver
   * @param driverId The ID of the driver whose location is being updated
   * @param location The new location data for the driver
   * @returns Promise that resolves when the message is published
   * @implements IRealtimeMessaging.publishDriverLocationUpdate
   */
  async publishDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void> {
    const channel = `driver:${driverId}:location`;
    const message = JSON.stringify(location);
    
    await this.publisher.publish(channel, message);
    this.logger.debug(`Published location update for driver ${driverId}`);
  }

  /**
   * Registers a callback function to be called when a driver location update is received
   * @param handler Function to call when a driver location update is received
   * @implements IRealtimeMessaging.onDriverLocationUpdate
   */
  onDriverLocationUpdate(handler: (driverId: string, location: DriverLocation) => void): void {
    this.locationUpdateHandler = handler;
  }

  /**
   * Sets up error handlers for Redis connections
   * @private Internal helper method
   */
  private handleError() {
    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', err);
    });
    
    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error', err);
    });
  }
}

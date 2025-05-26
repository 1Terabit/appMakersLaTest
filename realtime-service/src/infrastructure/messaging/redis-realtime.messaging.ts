import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { DriverLocation } from "../../domain/driver-location.entity";
import { IRealtimeMessaging } from "../../ports/out/messaging.port";

/**
 * Redis implementation of the IRealtimeMessaging port
 * Handles driver location updates through Redis pub/sub system
 * Implements NestJS lifecycle hooks for proper connection management
 */
@Injectable()
export class RedisRealtimeMessaging
  implements IRealtimeMessaging, OnModuleInit, OnModuleDestroy
{
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
  private locationUpdateHandler: (
    driverId: string,
    location: DriverLocation
  ) => void;

  /**
   * Flag to track publisher connection status
   * @private
   */
  private isPublisherConnected = false;

  /**
   * Flag to track subscriber connection status
   * @private
   */
  private isSubscriberConnected = false;

  /**
   * Creates an instance of RedisRealtimeMessaging
   * @param configService NestJS config service for retrieving Redis configuration
   */
  constructor(private configService: ConfigService) {}

  /**
   * Initialize Redis connections when the module starts
   * Implements OnModuleInit from NestJS lifecycle
   */
  async onModuleInit() {
    await this.setupRedisConnections();
  }

  /**
   * Setup Redis connections with retry strategy
   * @private
   */
  private async setupRedisConnections() {
    const redisHost =
      this.configService.get<string>("REDIS_HOST") || "localhost";
    const redisPort = this.configService.get<number>("REDIS_PORT") || 6379;

    this.logger.log(
      `Setting up Redis connections to ${redisHost}:${redisPort}`
    );

    // Common Redis options with retry strategy
    const redisOptions = {
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        this.logger.log(
          `Redis connection attempt failed. Retrying in ${delay}ms...`
        );
        return delay;
      },
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    };

    // Connection for publishing messages
    this.publisher = new Redis(redisOptions);

    this.publisher.on("connect", () => {
      this.isPublisherConnected = true;
      this.logger.log("Redis publisher connected");
    });

    this.publisher.on("ready", () => {
      this.logger.log("Redis publisher ready");
    });

    this.publisher.on("error", (err) => {
      this.logger.error("Redis publisher error", err);
    });

    this.publisher.on("close", () => {
      this.isPublisherConnected = false;
      this.logger.warn("Redis publisher connection closed");
    });

    this.publisher.on("reconnecting", () => {
      this.logger.log("Reconnecting Redis publisher...");
    });

    // Connection for subscribing to messages
    this.subscriber = new Redis(redisOptions);

    this.subscriber.on("connect", () => {
      this.isSubscriberConnected = true;
      this.logger.log("Redis subscriber connected");
    });

    this.subscriber.on("ready", () => {
      this.logger.log("Redis subscriber ready");
    });

    this.subscriber.on("error", (err) => {
      this.logger.error("Redis subscriber error", err);
    });

    this.subscriber.on("close", () => {
      this.isSubscriberConnected = false;
      this.logger.warn("Redis subscriber connection closed");
    });

    this.subscriber.on("reconnecting", () => {
      this.logger.log("Reconnecting Redis subscriber...");
    });

    try {
      // Wait for initial connection attempts
      await Promise.all([this.publisher.ping(), this.subscriber.ping()]);
      this.logger.log("Successfully connected to Redis");
    } catch (err) {
      this.logger.warn(
        "Initial Redis connection failed, but service will keep trying to reconnect"
      );
      // We don't throw an error here - the service will continue and retry connections
    }

    // Setup message handlers
    this.setupMessageHandlers();
  }

  /**
   * Set up handlers for Redis pub/sub messages
   * @private
   */
  private setupMessageHandlers() {
    // Pattern to match all driver location channels
    const locationChannelPattern = "driver:*:location";

    this.subscriber.on("message", (channel, message) => {
      try {
        const driverId = this.extractDriverIdFromChannel(channel);
        const location = JSON.parse(message) as DriverLocation;

        if (this.locationUpdateHandler) {
          this.locationUpdateHandler(driverId, location);
        }
      } catch (error) {
        this.logger.error(
          `Error handling message from channel ${channel}`,
          error.stack
        );
      }
    });

    this.subscriber.on("pmessage", (pattern, channel, message) => {
      try {
        const driverId = this.extractDriverIdFromChannel(channel);
        const location = JSON.parse(message) as DriverLocation;

        if (this.locationUpdateHandler) {
          this.locationUpdateHandler(driverId, location);
        }
      } catch (error) {
        this.logger.error(
          `Error handling pattern message from channel ${channel}`,
          error.stack
        );
      }
    });

    // Subscribe to the general location updates channel
    this.subscriber.subscribe("driver:location:updates", (err) => {
      if (err) {
        this.logger.error("Error subscribing to location updates channel", err);
        return;
      }
      this.logger.log("Subscribed to driver:location:updates channel");
    });

    // Subscribe to the pattern for individual driver channels
    this.subscriber.psubscribe(locationChannelPattern, (err) => {
      if (err) {
        this.logger.error(
          `Error subscribing to pattern ${locationChannelPattern}`,
          err
        );
        return;
      }
      this.logger.log(`Subscribed to pattern ${locationChannelPattern}`);
    });
  }

  /**
   * Extract driver ID from a Redis channel name
   * @param channel Redis channel name in format 'driver:<driverId>:location'
   * @returns The extracted driver ID
   * @private
   */
  private extractDriverIdFromChannel(channel: string): string {
    const parts = channel.split(":");
    return parts.length >= 2 ? parts[1] : "";
  }

  /**
   * Registers a handler for driver location updates
   * @param handler Function to call when a driver location is updated
   */
  registerLocationUpdateHandler(
    handler: (driverId: string, location: DriverLocation) => void
  ): void {
    this.locationUpdateHandler = handler;
    this.logger.log("Location update handler registered");
  }

  /**
   * Clean up Redis connections when the module is destroyed
   * Implements OnModuleDestroy from NestJS lifecycle
   */
  async onModuleDestroy() {
    this.logger.log("Cleaning up Redis connections");

    try {
      if (this.subscriber) {
        await this.subscriber.quit();
      }
    } catch (err) {
      this.logger.error("Error closing subscriber connection", err);
    }

    try {
      if (this.publisher) {
        await this.publisher.quit();
      }
    } catch (err) {
      this.logger.error("Error closing publisher connection", err);
    }
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
  async publishDriverLocationUpdate(
    driverId: string,
    location: DriverLocation
  ): Promise<void> {
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
  onDriverLocationUpdate(
    handler: (driverId: string, location: DriverLocation) => void
  ): void {
    this.registerLocationUpdateHandler(handler);
  }
}

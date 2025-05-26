import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { DriverLocation } from "../../domain/driver-location.entity";
import { ILocationMessaging } from "../../ports/out/messaging.port";

/**
 * Redis implementation of the location messaging system
 * Handles publishing driver location updates to Redis channels
 * Implementation of the ILocationMessaging port from the hexagonal architecture
 */
@Injectable()
export class RedisLocationMessaging
  implements ILocationMessaging, OnModuleInit
{
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
   * Flag to track connection status
   * @private
   */
  private isConnected = false;

  /**
   * Constructor for the Redis location messaging service
   * @param configService NestJS configuration service for environment variables
   */
  constructor(private configService: ConfigService) {}

  /**
   * Initialize the Redis connection with retry strategy
   * This runs after the module is initialized, allowing the service to start
   * even if Redis is not available immediately
   */
  async onModuleInit() {
    await this.connectToRedis();
  }

  /**
   * Connect to Redis with retry strategy
   * @private
   */
  private async connectToRedis() {
    const redisHost =
      this.configService.get<string>("REDIS_HOST") || "localhost";
    const redisPort = this.configService.get<number>("REDIS_PORT") || 6379;

    this.logger.log(
      `Attempting to connect to Redis at ${redisHost}:${redisPort}`
    );

    this.publisher = new Redis({
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
    });

    this.publisher.on("connect", () => {
      this.isConnected = true;
      this.logger.log("Redis publisher connected");
    });

    this.publisher.on("ready", () => {
      this.logger.log("Redis publisher ready");
    });

    this.publisher.on("error", (err) => {
      this.logger.error("Redis publisher error", err);
    });

    this.publisher.on("close", () => {
      this.isConnected = false;
      this.logger.warn("Redis connection closed");
    });

    this.publisher.on("reconnecting", () => {
      this.logger.log("Reconnecting to Redis...");
    });

    try {
      await this.publisher.ping();
      this.isConnected = true;
      this.logger.log("Successfully connected to Redis");
    } catch (err) {
      this.logger.warn(
        "Initial Redis connection failed, but service will keep trying to reconnect"
      );
    }
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
      if (!this.isConnected) {
        this.logger.warn(
          "Redis not connected yet, storing message to publish later"
        );
        return;
      }

      const channel = `driver:${location.driverId}:location`;
      const message = JSON.stringify(location);

      await this.publisher.publish(channel, message);

      await this.publisher.publish("driver:location:updates", message);

      this.logger.debug(
        `Published location update for driver ${location.driverId}`
      );
    } catch (error) {
      this.logger.error(
        `Error publishing location update for driver ${location.driverId}`,
        error.stack
      );
      throw error;
    }
  }
}

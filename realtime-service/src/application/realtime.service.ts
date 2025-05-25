import { Inject, Injectable, Logger } from '@nestjs/common';
import { DriverLocation } from '../domain/driver-location.entity';
import { DriverProfile } from '../domain/driver-profile.entity';
import { DriverLocationUpdate, IRealtimeService } from '../ports/in/realtime-service.port';
import { IDriverService } from '../ports/out/driver-service.port';
import { IRealtimeMessaging } from '../ports/out/messaging.port';

/**
 * Realtime Service Implementation
 * Manages WebSocket subscriptions and real-time updates for driver locations
 * Handles caching and distribution of driver location updates to clients
 * Follows the hexagonal architecture pattern implementing the IRealtimeService port
 */
@Injectable()
export class RealtimeService implements IRealtimeService {
  /**
   * Logger instance for this service
   * @private
   */
  private readonly logger = new Logger(RealtimeService.name);
  
  /**
   * Map that stores the relationship between clients and drivers they are subscribed to
   * Key: clientId, Value: driverId
   * @private
   */
  private clientSubscriptions: Map<string, string> = new Map();
  
  /**
   * Inverse map that stores for each driver, the set of clients following them
   * Key: driverId, Value: Set of clientIds
   * @private
   */
  private driverSubscribers: Map<string, Set<string>> = new Map();
  
  /**
   * Cache of driver locations indexed by driver ID
   * Helps reduce external service calls by keeping recent location data in memory
   * @private
   */
  private locationCache: Map<string, DriverLocation> = new Map();
  
  /**
   * Cache of driver profiles indexed by driver ID
   * Helps reduce external service calls by keeping profile data in memory
   * @private
   */
  private profileCache: Map<string, DriverProfile> = new Map();

  /**
   * Constructor for the realtime service
   * Sets up the messaging handler for location updates from other instances
   * @param driverService Service for retrieving driver information
   * @param messaging Messaging system for real-time communication
   */
  constructor(
    @Inject('IDriverService') private driverService: IDriverService,
    @Inject('IRealtimeMessaging') private messaging: IRealtimeMessaging,
  ) {
    // Configure handler to receive location updates from other instances
    this.messaging.onDriverLocationUpdate(this.handleDriverLocationUpdate.bind(this));
  }

  /**
   * Subscribes a client to a driver's location updates
   * If the client was already subscribed to another driver, it unsubscribes first
   * Also loads driver profile and last known location into cache if not already present
   * @param clientId Unique identifier of the client (socket ID)
   * @param driverId Unique identifier of the driver to subscribe to
   * @returns Promise that resolves when the subscription is complete
   * @throws Error if the subscription process fails
   */
  async subscribeToDriverUpdates(clientId: string, driverId: string): Promise<void> {
    try {
      // If client was already subscribed to another driver, unsubscribe them
      if (this.clientSubscriptions.has(clientId)) {
        const previousDriverId = this.clientSubscriptions.get(clientId);
        await this.unsubscribeClientFromDriver(clientId, previousDriverId);
      }

      // Subscribe client to the new driver
      this.clientSubscriptions.set(clientId, driverId);
      
      // Add client to the driver's list of subscribers
      if (!this.driverSubscribers.has(driverId)) {
        this.driverSubscribers.set(driverId, new Set());
        
        // If this is the first subscriber, subscribe this instance to Redis updates
        await this.messaging.subscribeToDriverLocationUpdates(driverId);
      }
      
      this.driverSubscribers.get(driverId).add(clientId);
      
      this.logger.log(`Client ${clientId} subscribed to driver ${driverId}`);
      
      // Try to load the driver profile if not in cache
      if (!this.profileCache.has(driverId)) {
        const profile = await this.driverService.getDriverProfile(driverId);
        if (profile) {
          this.profileCache.set(driverId, profile);
        }
      }
      
      // Try to load the last known location if not in cache
      if (!this.locationCache.has(driverId)) {
        const location = await this.driverService.getLastKnownLocation(driverId);
        if (location) {
          this.locationCache.set(driverId, location);
        }
      }
    } catch (error) {
      this.logger.error(`Error subscribing client ${clientId} to driver ${driverId}`, error.stack);
      throw error;
    }
  }

  /**
   * Unsubscribes a client from all driver updates
   * Removes the client from all subscription maps and updates driver subscribers
   * @param clientId Unique identifier of the client (socket ID)
   * @returns Promise that resolves when the unsubscription is complete
   * @throws Error if the unsubscription process fails
   */
  async unsubscribeFromDriverUpdates(clientId: string): Promise<void> {
    try {
      if (this.clientSubscriptions.has(clientId)) {
        const driverId = this.clientSubscriptions.get(clientId);
        await this.unsubscribeClientFromDriver(clientId, driverId);
        this.logger.log(`Client ${clientId} unsubscribed from all drivers`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing client ${clientId}`, error.stack);
      throw error;
    }
  }

  /**
   * Handles an incoming driver location update
   * Updates the location cache and publishes the update to other instances
   * @param driverId Unique identifier of the driver
   * @param location Updated driver location
   * @returns Promise that resolves when the update handling is complete
   * @throws Error if the update handling process fails
   */
  async handleDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void> {
    try {
      // Update the location cache
      this.locationCache.set(driverId, location);
      
      // If there are no subscribers for this driver, do nothing more
      if (!this.driverSubscribers.has(driverId) || this.driverSubscribers.get(driverId).size === 0) {
        return;
      }
      
      // Publish the location update through Redis for other instances
      await this.messaging.publishDriverLocationUpdate(driverId, location);
      
      this.logger.debug(`Received location update for driver ${driverId}`);
    } catch (error) {
      this.logger.error(`Error handling location update for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves a driver's location and profile information
   * Attempts to use cached data first, then falls back to service calls
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves to driver location and profile, or null if not found
   * @throws Error if the retrieval process fails
   */
  async getDriverLocationAndProfile(driverId: string): Promise<DriverLocationUpdate | null> {
    try {
      let location = this.locationCache.get(driverId);
      let profile = this.profileCache.get(driverId);
      
      // If we don't have the location in cache, request it from the service
      if (!location) {
        location = await this.driverService.getLastKnownLocation(driverId);
        if (location) {
          this.locationCache.set(driverId, location);
        } else {
          return null;
        }
      }
      
      // If we don't have the profile in cache, request it from the service
      if (!profile) {
        profile = await this.driverService.getDriverProfile(driverId);
        if (profile) {
          this.profileCache.set(driverId, profile);
        } else {
          return null;
        }
      }
      
      return { location, profile };
    } catch (error) {
      this.logger.error(`Error getting location and profile for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  /**
   * Checks if a driver is currently online based on their last location update
   * A driver is considered online if they have a recent location update
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves to a boolean indicating if the driver is online
   * @throws Error if the check process fails
   */
  async isDriverOnline(driverId: string): Promise<boolean> {
    try {
      const location = this.locationCache.get(driverId) || 
                      await this.driverService.getLastKnownLocation(driverId);
      
      if (!location) {
        return false;
      }
      
      return location.isRecent();
    } catch (error) {
      this.logger.error(`Error checking if driver ${driverId} is online`, error.stack);
      throw error;
    }
  }

  /**
   * Helper method to unsubscribe a client from a driver
   * Manages both the client-to-driver and driver-to-clients mappings
   * If no subscribers remain for a driver, unsubscribes from Redis updates
   * @param clientId Unique identifier of the client (socket ID)
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves when the unsubscription is complete
   * @private Internal helper method
   */
  private async unsubscribeClientFromDriver(clientId: string, driverId: string): Promise<void> {
    // Remove the client from the driver's subscriber list
    if (this.driverSubscribers.has(driverId)) {
      this.driverSubscribers.get(driverId).delete(clientId);
      
      // If no subscribers remain, unsubscribe this instance from Redis updates
      if (this.driverSubscribers.get(driverId).size === 0) {
        await this.messaging.unsubscribeFromDriverLocationUpdates(driverId);
        this.driverSubscribers.delete(driverId);
      }
    }
    
    // Remove the client's subscription
    this.clientSubscriptions.delete(clientId);
  }
}

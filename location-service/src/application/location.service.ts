import { Inject, Injectable, Logger } from '@nestjs/common';
import { DriverLocation } from '../domain/driver-location.entity';
import { ILocationService } from '../ports/in/location-service.port';
import { ILocationRepository } from '../ports/out/location-repository.port';
import { ILocationMessaging } from '../ports/out/messaging.port';

/**
 * Location Service Implementation
 * Handles driver location updates, retrieval, and online status verification
 * Follows the hexagonal architecture pattern implementing the ILocationService port
 */
@Injectable()
export class LocationService implements ILocationService {
  /**
   * Logger instance for this service
   * @private
   */
  private readonly logger = new Logger(LocationService.name);

  /**
   * Constructor for the location service
   * @param locationRepository Repository for storing and retrieving driver locations
   * @param locationMessaging Messaging system for publishing location updates
   */
  constructor(
    @Inject('ILocationRepository') private locationRepository: ILocationRepository,
    @Inject('ILocationMessaging') private locationMessaging: ILocationMessaging,
  ) {}

  /**
   * Updates a driver's location and publishes the update to other services
   * @param driverId Unique identifier of the driver
   * @param latitude Current latitude coordinate of the driver
   * @param longitude Current longitude coordinate of the driver
   * @returns Promise that resolves when the update is complete
   * @throws Error if the update operation fails
   */
  async updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    try {
      const location = new DriverLocation({
        driverId,
        latitude,
        longitude,
        timestamp: new Date(),
      });

      // Save the location in the repository
      await this.locationRepository.saveLocation(location);
      
      // Publish the update for other services to consume
      await this.locationMessaging.publishLocationUpdate(location);
      
      this.logger.log(`Updated location for driver ${driverId}: ${latitude}, ${longitude}`);
    } catch (error) {
      this.logger.error(`Error updating location for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves the last known location for a driver
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves to the driver's last known location or null if not found
   * @throws Error if the retrieval operation fails
   */
  async getLastKnownLocation(driverId: string): Promise<DriverLocation | null> {
    try {
      return await this.locationRepository.getLastLocation(driverId);
    } catch (error) {
      this.logger.error(`Error getting last location for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  /**
   * Checks if a driver is currently online based on their last location update timestamp
   * A driver is considered online if they have a recent location update
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves to a boolean indicating if the driver is online
   * @throws Error if the check operation fails
   */
  async isDriverOnline(driverId: string): Promise<boolean> {
    try {
      const lastLocation = await this.locationRepository.getLastLocation(driverId);
      
      if (!lastLocation) {
        return false;
      }
      
      return lastLocation.isRecent();
    } catch (error) {
      this.logger.error(`Error checking if driver ${driverId} is online`, error.stack);
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { DriverLocation } from '../../domain/driver-location.entity';
import { ILocationRepository } from '../../ports/out/location-repository.port';

/**
 * In-memory implementation of the location repository
 * In a real environment, this would connect to a database
 * Used for development and testing purposes
 */
@Injectable()
export class InMemoryLocationRepository implements ILocationRepository {
  /**
   * Logger instance for this repository
   * @private
   */
  private readonly logger = new Logger(InMemoryLocationRepository.name);
  
  /**
   * Simulates an in-memory database with driver locations
   * Map of driver IDs to arrays of locations ordered by timestamp
   * @private
   */
  private locationsByDriver: Map<string, DriverLocation[]> = new Map();

  /**
   * Saves a driver location to the in-memory repository
   * Creates a new array for a driver if it doesn't exist yet
   * Maintains a maximum of 100 locations per driver
   * @param location Driver location entity to save
   * @returns Promise that resolves when the save operation completes
   */
  async saveLocation(location: DriverLocation): Promise<void> {
    const driverId = location.driverId;
    
    if (!this.locationsByDriver.has(driverId)) {
      this.locationsByDriver.set(driverId, []);
    }
    
    const driverLocations = this.locationsByDriver.get(driverId);
    driverLocations.push(location);
    
    // Keep only the last 100 locations for each driver
    if (driverLocations.length > 100) {
      driverLocations.shift();
    }
    
    this.logger.debug(`Saved location for driver ${driverId}: ${JSON.stringify(location)}`);
  }

  /**
   * Retrieves the last known location for a driver
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves to the driver's last location or null if not found
   */
  async getLastLocation(driverId: string): Promise<DriverLocation | null> {
    const driverLocations = this.locationsByDriver.get(driverId) || [];
    
    if (driverLocations.length === 0) {
      return null;
    }
    
    return driverLocations[driverLocations.length - 1];
  }

  /**
   * Retrieves location history for a driver within a specified time range
   * @param driverId Unique identifier of the driver
   * @param startTime Start of the time range to retrieve locations from
   * @param endTime End of the time range to retrieve locations from
   * @returns Promise that resolves to an array of driver locations within the time range
   */
  async getLocationHistory(
    driverId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<DriverLocation[]> {
    const driverLocations = this.locationsByDriver.get(driverId) || [];
    
    return driverLocations.filter(
      location => location.timestamp >= startTime && location.timestamp <= endTime,
    );
  }
}

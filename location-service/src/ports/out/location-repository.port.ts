import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * Output port for the location repository
 * Defines the contract for location data persistence operations within the hexagonal architecture
 */
export interface ILocationRepository {
  /**
   * Saves a driver's location to the repository
   * @param location Driver location entity to be saved
   * @returns Promise that resolves when the save operation completes
   */
  saveLocation(location: DriverLocation): Promise<void>;

  /**
   * Retrieves the last known location for a driver
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves to the driver's last location or null if not found
   */
  getLastLocation(driverId: string): Promise<DriverLocation | null>;

  /**
   * Retrieves a driver's location history within a specified time range
   * @param driverId Unique identifier of the driver
   * @param startTime Start of the time range to retrieve locations from
   * @param endTime End of the time range to retrieve locations from
   * @returns Promise that resolves to an array of driver locations within the time range
   */
  getLocationHistory(
    driverId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<DriverLocation[]>;
}

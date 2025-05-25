import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * Input port for the location service
 * Defines the contract for location operations within the hexagonal architecture
 */
export interface ILocationService {
  /**
   * Updates a driver's location with new coordinates
   * @param driverId Unique identifier of the driver
   * @param latitude Current latitude coordinate of the driver
   * @param longitude Current longitude coordinate of the driver
   * @returns Promise that resolves when the update is complete
   */
  updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<void>;

  /**
   * Retrieves the last known location for a driver
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves to the driver's last location or null if not found
   */
  getLastKnownLocation(driverId: string): Promise<DriverLocation | null>;

  /**
   * Checks if a driver is currently online based on their last location update
   * A driver is considered online if they have a recent location update
   * @param driverId Unique identifier of the driver
   * @returns Promise that resolves to a boolean indicating if the driver is online
   */
  isDriverOnline(driverId: string): Promise<boolean>;
}

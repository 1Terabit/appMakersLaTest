import { DriverLocation } from '../../domain/driver-location.entity';
import { DriverProfile } from '../../domain/driver-profile.entity';

/**
 * Output port for communication with driver-related services
 * Defines how the application core interacts with external driver data providers
 * Implemented by HttpDriverService in the infrastructure layer
 */
export interface IDriverService {
  /**
   * Retrieves a driver's profile information
   * Typically implemented by making an HTTP request to the auth service
   * @param driverId ID of the driver to get the profile for
   * @returns Promise resolving to the driver profile or null if not found/error occurs
   */
  getDriverProfile(driverId: string): Promise<DriverProfile | null>;

  /**
   * Retrieves a driver's last known location
   * Typically implemented by making an HTTP request to the location service
   * @param driverId ID of the driver to get the location for
   * @returns Promise resolving to the driver location or null if not found/error occurs
   */
  getLastKnownLocation(driverId: string): Promise<DriverLocation | null>;

  /**
   * Validates a driver's authentication token
   * Typically implemented by making an HTTP request to the auth service
   * @param token JWT token to validate
   * @returns Promise resolving to an object containing validation result and driver ID if valid
   */
  validateDriverToken(token: string): Promise<{ isValid: boolean; driverId?: string }>;
}

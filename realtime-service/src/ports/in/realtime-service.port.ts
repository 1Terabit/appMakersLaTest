import { DriverLocation } from '../../domain/driver-location.entity';
import { DriverProfile } from '../../domain/driver-profile.entity';

/**
 * Interface representing a driver's location and profile information
 * Used for combined location and profile updates to clients
 */
export interface DriverLocationUpdate {
  location: DriverLocation;
  profile: DriverProfile;
}

/**
 * Input port for the realtime service
 * Defines the operations that the application core provides to the outside world
 * Implemented by RealtimeService in the application layer
 */
export interface IRealtimeService {
  /**
   * Subscribes a client to location updates of a specific driver
   * Creates a subscription relationship and initiates periodic updates
   * @param clientId ID of the client (socket/connection ID)
   * @param driverId ID of the driver to subscribe to
   * @returns Promise that resolves when the subscription is complete
   */
  subscribeToDriverUpdates(clientId: string, driverId: string): Promise<void>;

  /**
   * Cancels a client's subscription to all driver location updates
   * Cleans up subscription data and stops periodic updates
   * @param clientId ID of the client (socket/connection ID)
   * @returns Promise that resolves when the unsubscription is complete
   */
  unsubscribeFromDriverUpdates(clientId: string): Promise<void>;

  /**
   * Processes a driver location update and distributes it to subscribed clients
   * Updates the cached location and notifies all clients subscribed to this driver
   * @param driverId ID of the driver whose location is being updated
   * @param location New location data for the driver
   * @returns Promise that resolves when the update has been processed
   */
  handleDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void>;

  /**
   * Retrieves the last known location and profile information for a driver
   * Combines data from location and profile services
   * @param driverId ID of the driver to get information for
   * @returns Promise resolving to combined location and profile data, or null if not found
   */
  getDriverLocationAndProfile(driverId: string): Promise<DriverLocationUpdate | null>;

  /**
   * Checks if a driver is currently online
   * A driver is considered online if they have a recent location update
   * @param driverId ID of the driver to check
   * @returns Promise resolving to boolean indicating online status
   */
  isDriverOnline(driverId: string): Promise<boolean>;
}

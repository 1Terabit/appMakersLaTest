import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * Output port for communication between service instances
 * Defines how the application core exchanges messages with other instances
 * Implemented by RedisRealtimeMessaging in the infrastructure layer
 */
export interface IRealtimeMessaging {
  /**
   * Subscribes this instance to location updates for a specific driver
   * Enables receiving updates from other instances of the service
   * @param driverId ID of the driver to subscribe to
   * @returns Promise that resolves when subscription is complete
   */
  subscribeToDriverLocationUpdates(driverId: string): Promise<void>;

  /**
   * Unsubscribes this instance from location updates for a specific driver
   * Stops receiving updates from other instances of the service
   * @param driverId ID of the driver to unsubscribe from
   * @returns Promise that resolves when unsubscription is complete
   */
  unsubscribeFromDriverLocationUpdates(driverId: string): Promise<void>;

  /**
   * Publishes a location update for other service instances to consume
   * Distributes driver location changes across the system
   * @param driverId ID of the driver whose location is being updated
   * @param location New location data for the driver
   * @returns Promise that resolves when the message is published
   */
  publishDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void>;

  /**
   * Registers a callback function to handle incoming driver location updates
   * Called when updates are received from other service instances
   * @param handler Function to call when a driver location update is received
   */
  onDriverLocationUpdate(handler: (driverId: string, location: DriverLocation) => void): void;
}

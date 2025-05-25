import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * Output port for the messaging system
 * Defines the contract for publishing location updates to other services
 * Part of the hexagonal architecture's outbound ports
 */
export interface ILocationMessaging {
  /**
   * Publishes a location update for consumption by other services
   * Enables real-time communication between microservices regarding driver locations
   * @param location Updated driver location entity
   * @returns Promise that resolves when the publish operation completes
   * @throws Error if the publish operation fails
   */
  publishLocationUpdate(location: DriverLocation): Promise<void>;
}

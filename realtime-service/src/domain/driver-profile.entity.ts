/**
 * Domain entity representing a driver's profile
 * Contains basic driver information for display to clients
 * Used in the realtime service alongside location data
 */
export class DriverProfile {
  /**
   * Unique identifier of the driver
   */
  id: string;

  /**
   * Driver's full name
   */
  name: string;

  /**
   * URL to the driver's profile image
   */
  profileImage: string;

  /**
   * Creates a new DriverProfile instance
   * @param partial Partial DriverProfile object with properties to be assigned
   */
  constructor(partial: Partial<DriverProfile>) {
    Object.assign(this, partial);
  }
}

/**
 * Domain entity representing a driver's location
 * Contains geographical coordinates and timestamp information
 */
export class DriverLocation {
  /**
   * Unique identifier of the driver
   */
  driverId: string;

  /**
   * Latitude coordinate of the driver's position
   */
  latitude: number;

  /**
   * Longitude coordinate of the driver's position
   */
  longitude: number;

  /**
   * Timestamp when the location was recorded
   */
  timestamp: Date;
  
  /**
   * Creates a new DriverLocation instance
   * @param partial Partial DriverLocation object with properties to be assigned
   */
  constructor(partial: Partial<DriverLocation>) {
    Object.assign(this, partial);
    this.timestamp = this.timestamp || new Date();
  }

  /**
   * Checks if the location data is recent (less than 10 minutes old)
   * Used to determine if a driver is currently online
   * @returns Boolean indicating if the location is recent
   */
  isRecent(): boolean {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return this.timestamp > tenMinutesAgo;
  }
}

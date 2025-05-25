import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

/**
 * Data Transfer Object for driver location updates
 * Contains the geographic coordinates with validation constraints
 */
export class UpdateLocationDto {
  /**
   * Latitude coordinate of the driver's position
   * Must be a number between -90 and 90 degrees
   */
  @IsNumber({}, { message: 'Latitude must be a number' })
  @IsNotEmpty({ message: 'Latitude is required' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  latitude: number;

  /**
   * Longitude coordinate of the driver's position
   * Must be a number between -180 and 180 degrees
   */
  @IsNumber({}, { message: 'Longitude must be a number' })
  @IsNotEmpty({ message: 'Longitude is required' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  longitude: number;
}

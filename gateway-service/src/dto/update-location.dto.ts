import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for driver location updates
 * Contains latitude and longitude coordinates with validation rules
 */
export class UpdateLocationDto {
  /**
   * Latitude coordinate of driver's location
   * Must be between -90 and 90 degrees
   * @example 19.4326
   */
  @ApiProperty({
    description: 'Latitude coordinate of driver\'s location',
    example: 19.4326,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'Latitude must be a number' })
  @IsNotEmpty({ message: 'Latitude is required' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  latitude: number;

  /**
   * Longitude coordinate of driver's location
   * Must be between -180 and 180 degrees
   * @example -99.1332
   */
  @ApiProperty({
    description: 'Longitude coordinate of driver\'s location',
    example: -99.1332,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'Longitude must be a number' })
  @IsNotEmpty({ message: 'Longitude is required' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  longitude: number;
}

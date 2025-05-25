import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para la actualización de ubicación de un conductor
 */
export class UpdateLocationDto {
  /**
   * Latitud de la ubicación del conductor
   * @example 19.4326
   */
  @ApiProperty({
    description: 'Latitud de la ubicación del conductor',
    example: 19.4326,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'La latitud debe ser un número' })
  @IsNotEmpty({ message: 'La latitud es requerida' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitude: number;

  /**
   * Longitud de la ubicación del conductor
   * @example -99.1332
   */
  @ApiProperty({
    description: 'Longitud de la ubicación del conductor',
    example: -99.1332,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'La longitud debe ser un número' })
  @IsNotEmpty({ message: 'La longitud es requerida' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitude: number;
}

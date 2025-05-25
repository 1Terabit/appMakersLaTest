import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

/**
 * DTO para la actualización de ubicación de un conductor
 */
export class UpdateLocationDto {
  @IsNumber({}, { message: 'La latitud debe ser un número' })
  @IsNotEmpty({ message: 'La latitud es requerida' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitude: number;

  @IsNumber({}, { message: 'La longitud debe ser un número' })
  @IsNotEmpty({ message: 'La longitud es requerida' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitude: number;
}

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para la solicitud de login
 */
export class LoginDto {
  /**
   * Correo electrónico del conductor
   * @example "juan@example.com"
   */
  @ApiProperty({
    description: 'Correo electrónico del conductor',
    example: 'juan@example.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  /**
   * Contraseña del conductor
   * @example "password1"
   */
  @ApiProperty({
    description: 'Contraseña del conductor',
    example: 'password1',
    minLength: 6,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}

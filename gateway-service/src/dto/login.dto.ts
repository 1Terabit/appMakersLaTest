import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for login requests
 * Contains driver email and password with validation rules
 */
export class LoginDto {
  /**
   * Driver's email address
   * Used for authentication and identification
   * @example "juan@example.com"
   */
  @ApiProperty({
    description: 'Driver\'s email address',
    example: 'juan@example.com',
  })
  @IsEmail({}, { message: 'Email address is not valid' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  /**
   * Driver's password
   * Must be at least 6 characters long
   * @example "password1"
   */
  @ApiProperty({
    description: 'Driver\'s password',
    example: 'password1',
    minLength: 6,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Data Transfer Object for login requests
 * Contains the fields needed to authenticate a driver
 */
export class LoginDto {
  /**
   * Driver's email address for authentication
   * Must be a valid email format
   */
  @IsEmail({}, { message: 'Email is not valid' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * Driver's password for authentication
   * Must be at least 6 characters long
   */
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

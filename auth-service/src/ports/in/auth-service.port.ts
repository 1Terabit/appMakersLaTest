import { Driver } from '../../domain/driver.entity';

/**
 * Data Transfer Object for login response
 * Contains the authentication token and driver information without password
 */
export interface LoginResponseDto {
  /**
   * JWT authentication token
   */
  token: string;
  
  /**
   * Driver information with password field omitted for security
   */
  driver: Omit<Driver, 'password'>;
}

/**
 * Data Transfer Object for token validation result
 * Contains information about token validity and associated driver ID
 */
export interface TokenValidationResult {
  /**
   * Indicates whether the token is valid
   */
  isValid: boolean;
  
  /**
   * ID of the driver associated with the token, only present if token is valid
   */
  driverId?: string;
}

/**
 * Input port for the authentication service
 * Defines the contract for authentication operations within the hexagonal architecture
 */
export interface IAuthService {
  /**
   * Authenticates a driver and generates a JWT token
   * @param email Driver's email address
   * @param password Driver's password
   * @returns Login response with token and driver information
   * @throws UnauthorizedException if credentials are invalid
   */
  login(email: string, password: string): Promise<LoginResponseDto>;

  /**
   * Validates an access token
   * @param token JWT token to validate
   * @returns Token validation result indicating validity and associated driver ID
   */
  validateToken(token: string): Promise<TokenValidationResult>;

  /**
   * Retrieves a driver's profile information
   * @param driverId Driver's unique identifier
   * @returns Driver profile without password field, or null if not found
   */
  getDriverProfile(driverId: string): Promise<Omit<Driver, 'password'> | null>;
}

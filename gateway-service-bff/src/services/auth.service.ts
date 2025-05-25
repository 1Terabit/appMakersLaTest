import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from '../dto/login.dto';

/**
 * Service that proxies authentication requests to the auth-service microservice
 * Handles driver authentication, token validation, and profile retrieval
 */
@Injectable()
export class AuthService {
  /**
   * Logger instance for this service
   * @private
   */
  private readonly logger = new Logger(AuthService.name);
  
  /**
   * Base URL for the authentication service API
   * @private
   */
  private readonly authServiceUrl: string;

  /**
   * Creates an instance of AuthService
   * Configures the auth service URL from environment variables
   * @param httpService NestJS HTTP service for making requests to the auth microservice
   * @param configService NestJS config service for retrieving configuration
   */
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * Authenticates a driver with email and password
   * Forwards the login request to the auth-service
   * @param loginDto Login credentials (email and password)
   * @returns Object containing access token and driver information
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/login`, loginDto),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Validates a driver's access token
   * Forwards the token validation request to the auth-service
   * @param token JWT token to validate
   * @returns Object containing validation result (isValid flag and driverId if valid)
   * @throws UnauthorizedException if token is invalid or expired
   */
  async validateToken(token: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/validate-token`, { token }),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Retrieves a driver's profile information
   * Forwards the profile request to the auth-service
   * @param driverId ID of the driver to get profile for
   * @returns Driver profile object with personal information
   * @throws UnauthorizedException if profile cannot be retrieved
   */
  async getDriverProfile(driverId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/auth/profile/${driverId}`),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Get profile error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Error retrieving driver profile');
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DriverLocation } from '../../domain/driver-location.entity';
import { DriverProfile } from '../../domain/driver-profile.entity';
import { IDriverService } from '../../ports/out/driver-service.port';

/**
 * HTTP implementation of the IDriverService port
 * Provides communication with auth-service and location-service
 * to retrieve driver profiles, locations, and validate tokens
 */
@Injectable()
export class HttpDriverService implements IDriverService {
  /**
   * Logger instance for this service
   * @private
   */
  private readonly logger = new Logger(HttpDriverService.name);
  
  /**
   * Base URL for the authentication service API
   * @private
   */
  private readonly authServiceUrl: string;
  
  /**
   * Base URL for the location service API
   * @private
   */
  private readonly locationServiceUrl: string;

  /**
   * Creates an instance of HttpDriverService
   * Configures the service URLs from environment variables
   * @param httpService NestJS HTTP service for making external API calls
   * @param configService NestJS config service for retrieving configuration
   */
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001';
    this.locationServiceUrl = this.configService.get<string>('LOCATION_SERVICE_URL') || 'http://localhost:3002';
  }

  /**
   * Retrieves a driver's profile information from the auth service
   * @param driverId The ID of the driver to get the profile for
   * @returns Promise resolving to the driver profile or null if not found/error occurs
   * @implements IDriverService.getDriverProfile
   */
  async getDriverProfile(driverId: string): Promise<DriverProfile | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/auth/profile/${driverId}`),
      );
      
      return new DriverProfile({
        id: response.data.id,
        name: response.data.name,
        profileImage: response.data.profileImage,
      });
    } catch (error) {
      this.logger.error(`Error getting profile for driver ${driverId}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Retrieves a driver's last known location from the location service
   * @param driverId The ID of the driver to get the location for
   * @returns Promise resolving to the driver location or null if not found/error occurs
   * @implements IDriverService.getLastKnownLocation
   */
  async getLastKnownLocation(driverId: string): Promise<DriverLocation | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.locationServiceUrl}/driver/${driverId}/location`),
      );
      
      return new DriverLocation({
        driverId: response.data.driverId,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        timestamp: new Date(response.data.timestamp),
      });
    } catch (error) {
      this.logger.error(`Error getting location for driver ${driverId}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Validates a driver's authentication token with the auth service
   * @param token The JWT token to validate
   * @returns Promise resolving to an object containing validation result and driver ID if valid
   * @implements IDriverService.validateDriverToken
   */
  async validateDriverToken(token: string): Promise<{ isValid: boolean; driverId?: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/validate-token`, { token }),
      );
      
      return {
        isValid: true,
        driverId: response.data.driverId,
      };
    } catch (error) {
      this.logger.error(`Error validating driver token: ${error.message}`, error.stack);
      return { isValid: false };
    }
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocationService } from './location.service';
import { DriverDashboardDto } from '../dto/driver-dashboard.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * BFF service that aggregates data from multiple microservices
 * Optimized for frontend consumption with combined endpoints
 */
@Injectable()
export class DashboardService {
  /**
   * Logger instance for this service
   * @private
   */
  private readonly logger = new Logger(DashboardService.name);
  
  /**
   * Base URL for the realtime service API
   * @private
   */
  private readonly realtimeServiceUrl: string;

  /**
   * Creates an instance of DashboardService
   * @param authService Service for authentication and profile data
   * @param locationService Service for driver location data
   * @param httpService HTTP client for making requests to other services
   * @param configService Configuration service for environment variables
   */
  constructor(
    private readonly authService: AuthService,
    private readonly locationService: LocationService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.realtimeServiceUrl = this.configService.get<string>('REALTIME_SERVICE_URL') || 'http://localhost:3003';
  }

  /**
   * Retrieves complete dashboard data for a driver
   * Combines profile, location, and statistics in a single request
   * @param driverId ID of the driver
   * @param token JWT authentication token
   * @returns Combined dashboard data object
   * @throws NotFoundException if driver doesn't exist
   */
  async getDriverDashboard(driverId: string, token: string): Promise<DriverDashboardDto> {
    try {
      // Validate the token first
      const tokenValidation = await this.authService.validateToken(token);
      
      if (!tokenValidation.isValid || tokenValidation.driverId !== driverId) {
        throw new NotFoundException('Driver not found');
      }

      // Get data from multiple services in parallel
      const [profile, location, statistics] = await Promise.all([
        this.authService.getDriverProfile(driverId),
        this.locationService.getDriverLocation(driverId),
        this.getDriverStatistics(driverId)
      ]);

      return {
        profile,
        location,
        statistics
      };
    } catch (error) {
      this.logger.error(`Error getting driver dashboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves driver statistics from the realtime service
   * @param driverId ID of the driver
   * @returns Driver statistics object
   * @private Internal helper method
   */
  private async getDriverStatistics(driverId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.realtimeServiceUrl}/driver/${driverId}/statistics`)
      );
      
      return response.data;
    } catch (error) {
      this.logger.warn(`Could not get driver statistics: ${error.message}`);
      
      // Return default statistics if the service is unavailable
      return {
        onlineDuration: 0,
        connectedClients: 0,
        lastUpdateTime: new Date()
      };
    }
  }
}

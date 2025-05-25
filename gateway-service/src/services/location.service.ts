import { HttpException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UpdateLocationDto } from '../dto/update-location.dto';

/**
 * Service that proxies location requests to the location-service microservice
 * Handles driver location updates and retrieval
 */
@Injectable()
export class LocationService {
  /**
   * Logger instance for this service
   * @private
   */
  private readonly logger = new Logger(LocationService.name);
  
  /**
   * Base URL for the location service API
   * @private
   */
  private readonly locationServiceUrl: string;

  /**
   * Creates an instance of LocationService
   * Configures the location service URL from environment variables
   * @param httpService NestJS HTTP service for making requests to the location microservice
   * @param configService NestJS config service for retrieving configuration
   */
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.locationServiceUrl = this.configService.get<string>('LOCATION_SERVICE_URL') || 'http://localhost:3002';
  }

  /**
   * Updates a driver's location with new coordinates
   * Forwards the location update request to the location-service
   * @param token Driver's access token for authentication
   * @param updateLocationDto Location data containing latitude and longitude
   * @returns Confirmation object with success status
   * @throws UnauthorizedException if token is invalid
   * @throws HttpException for other errors
   */
  async updateDriverLocation(token: string, updateLocationDto: UpdateLocationDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.locationServiceUrl}/driver/update`,
          updateLocationDto,
          {
            headers: {
              Authorization: token,
            },
          },
        ),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Update location error: ${error.message}`, error.stack);
      
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      
      throw new HttpException(
        'Error updating location',
        error.response?.status || 500,
      );
    }
  }

  /**
   * Retrieves a driver's last known location
   * Forwards the location request to the location-service
   * @param driverId ID of the driver to get location for
   * @returns Location object with coordinates, timestamp and online status
   * @throws HttpException if location cannot be retrieved
   */
  async getDriverLocation(driverId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.locationServiceUrl}/driver/${driverId}/location`),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Get location error: ${error.message}`, error.stack);
      
      throw new HttpException(
        'Error retrieving location',
        error.response?.status || 500,
      );
    }
  }
}

import { Body, Controller, Get, HttpException, HttpStatus, Inject, Param, Post, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ILocationService } from '../../ports/in/location-service.port';
import { UpdateLocationDto } from './dtos/update-location.dto';

/**
 * Controller handling driver location operations
 * Provides endpoints for updating and retrieving driver locations
 */
@Controller('driver')
export class LocationController {
  /**
   * Logger instance for this controller
   * @private
   */
  private readonly logger = new Logger(LocationController.name);
  
  /**
   * URL of the authentication service for token validation
   * @private
   */
  private readonly authServiceUrl: string;

  /**
   * Constructor for the location controller
   * @param locationService Service for managing driver locations
   * @param httpService HTTP client for making requests to other services
   * @param configService Configuration service for accessing environment variables
   */
  constructor(
    @Inject('ILocationService') private readonly locationService: ILocationService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * Endpoint to update a driver's location
   * Requires authentication via Bearer token
   * @param token Driver's access token from Authorization header
   * @param updateLocationDto Location data containing latitude and longitude
   * @returns Confirmation of successful update
   * @throws UnauthorizedException if token is invalid or missing
   * @throws HttpException if location update fails
   */
  @Post('update')
  async updateLocation(
    @Headers('authorization') token: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    try {
      if (!token) {
        throw new UnauthorizedException('Access token required');
      }

      // Validar el token con el servicio de autenticación
      const driverId = await this.validateToken(token);

      // Actualizar la ubicación
      await this.locationService.updateDriverLocation(
        driverId,
        updateLocationDto.latitude,
        updateLocationDto.longitude,
      );

      return { success: true, message: 'Location updated successfully' };
    } catch (error) {
      this.logger.error(`Error updating location: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new HttpException(
        'Error updating location',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Endpoint to get a driver's last known location
   * Also returns whether the driver is currently online based on the timestamp
   * @param driverId Unique identifier of the driver
   * @returns Object containing location data and online status
   * @throws HttpException if location is not found or retrieval fails
   */
  @Get(':driverId/location')
  async getDriverLocation(@Param('driverId') driverId: string) {
    try {
      const location = await this.locationService.getLastKnownLocation(driverId);
      
      if (!location) {
        throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
      }
      
      const isOnline = location.isRecent();
      
      return {
        driverId: location.driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        isOnline,
      };
    } catch (error) {
      this.logger.error(`Error getting location for driver ${driverId}: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Error retrieving location',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validates a token with the authentication service
   * Makes an HTTP request to the auth service to verify token validity
   * @param token JWT token to validate
   * @returns Driver ID extracted from the validated token
   * @throws UnauthorizedException if token is invalid or expired
   * @private Internal method used for authentication
   */
  private async validateToken(token: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/validate-token`, { token }),
      );
      
      return response.data.driverId;
    } catch (error) {
      this.logger.error(`Error validating token: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from '../services/location.service';
import { UpdateLocationDto } from '../dto/update-location.dto';

/**
 * Driver controller for the Gateway API
 * Provides endpoints for driver location updates and retrieval
 * Acts as a proxy to the location-service microservice
 */
@ApiTags('driver')
@Controller('api/driver')
export class DriverController {
  /**
   * Creates an instance of DriverController
   * @param locationService Service that handles communication with the location microservice
   */
  constructor(private readonly locationService: LocationService) {}

  /**
   * Endpoint for updating a driver's location
   * Validates the driver's token and forwards location data to the location service
   * @param token Driver's access token from Authorization header
   * @param updateLocationDto Location data containing latitude and longitude
   * @returns Confirmation of successful update
   * @throws Unauthorized exception if token is invalid
   * @throws Bad request exception if location data is invalid
   */
  @ApiOperation({ summary: 'Update location', description: 'Allows a driver to send their current location' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateLocationDto })
  @ApiResponse({ status: 200, description: 'Location updated', schema: {
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Location updated successfully' }
    }
  }})
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 400, description: 'Invalid location data' })
  @Post('update')
  async updateLocation(
    @Headers('authorization') token: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationService.updateDriverLocation(token, updateLocationDto);
  }

  /**
   * Endpoint for retrieving a driver's last known location
   * Fetches location data including online status from the location service
   * @param id Driver ID to retrieve location for
   * @returns Last known location with timestamp and online status
   * @throws Not found exception if location data doesn't exist
   */
  @ApiOperation({ summary: 'Get driver location', description: 'Returns the last known location of a driver' })
  @ApiParam({ name: 'id', description: 'Driver ID', example: '1' })
  @ApiResponse({ status: 200, description: 'Location found', schema: {
    properties: {
      driverId: { type: 'string', example: '1' },
      latitude: { type: 'number', example: 19.4326 },
      longitude: { type: 'number', example: -99.1332 },
      timestamp: { type: 'string', format: 'date-time', example: '2025-05-23T02:00:00.000Z' },
      isOnline: { type: 'boolean', example: true }
    }
  }})
  @ApiResponse({ status: 404, description: 'Location not found' })
  @Get(':id/location')
  async getDriverLocation(@Param('id') id: string) {
    return this.locationService.getDriverLocation(id);
  }
}

import { Controller, Get, Headers, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { DriverDashboardDto } from '../dto/driver-dashboard.dto';

/**
 * Dashboard controller for the Gateway API (BFF)
 * Provides optimized endpoints that combine data from multiple microservices
 * Designed specifically for frontend consumption patterns
 */
@ApiTags('dashboard')
@Controller('api/dashboard')
export class DashboardController {
  /**
   * Creates an instance of DashboardController
   * @param dashboardService Service that aggregates data from multiple microservices
   */
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Endpoint for retrieving complete driver dashboard data
   * Combines profile, location, and statistics in a single request
   * @param id Driver ID to retrieve dashboard for
   * @param token JWT authentication token from Authorization header
   * @returns Combined dashboard data with profile, location, and statistics
   * @throws NotFoundException if driver doesn't exist
   */
  @ApiOperation({ 
    summary: 'Get driver dashboard', 
    description: 'Returns combined profile, location, and statistics data for a driver' 
  })
  @ApiParam({ name: 'id', description: 'Driver ID', example: '1' })
  @ApiBearerAuth()
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data found',
    type: DriverDashboardDto
  })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @Get('driver/:id')
  async getDriverDashboard(
    @Param('id') id: string,
    @Headers('authorization') token: string,
  ): Promise<DriverDashboardDto> {
    return this.dashboardService.getDriverDashboard(id, token);
  }
}

import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from '../services/location.service';
import { UpdateLocationDto } from '../dto/update-location.dto';

@ApiTags('driver')
@Controller('api/driver')
export class DriverController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Endpoint para actualizar la ubicación de un conductor
   * @param token Token de acceso del conductor
   * @param updateLocationDto Datos de ubicación
   * @returns Confirmación de actualización
   */
  @ApiOperation({ summary: 'Actualizar ubicación', description: 'Permite a un conductor enviar su ubicación actual' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateLocationDto })
  @ApiResponse({ status: 200, description: 'Ubicación actualizada', schema: {
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Ubicación actualizada correctamente' }
    }
  }})
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  @ApiResponse({ status: 400, description: 'Datos de ubicación inválidos' })
  @Post('update')
  async updateLocation(
    @Headers('authorization') token: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationService.updateDriverLocation(token, updateLocationDto);
  }

  /**
   * Endpoint para obtener la última ubicación de un conductor
   * @param id ID del conductor
   * @returns Última ubicación conocida
   */
  @ApiOperation({ summary: 'Obtener ubicación de conductor', description: 'Devuelve la última ubicación conocida de un conductor' })
  @ApiParam({ name: 'id', description: 'ID del conductor', example: '1' })
  @ApiResponse({ status: 200, description: 'Ubicación encontrada', schema: {
    properties: {
      driverId: { type: 'string', example: '1' },
      latitude: { type: 'number', example: 19.4326 },
      longitude: { type: 'number', example: -99.1332 },
      timestamp: { type: 'string', format: 'date-time', example: '2025-05-23T02:00:00.000Z' },
      isOnline: { type: 'boolean', example: true }
    }
  }})
  @ApiResponse({ status: 404, description: 'Ubicación no encontrada' })
  @Get(':id/location')
  async getDriverLocation(@Param('id') id: string) {
    return this.locationService.getDriverLocation(id);
  }
}

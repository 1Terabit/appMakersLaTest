import { Body, Controller, Get, HttpException, HttpStatus, Inject, Param, Post, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ILocationService } from '../../ports/in/location-service.port';
import { UpdateLocationDto } from './dtos/update-location.dto';

@Controller('driver')
export class LocationController {
  private readonly logger = new Logger(LocationController.name);
  private readonly authServiceUrl: string;

  constructor(
    @Inject('ILocationService') private readonly locationService: ILocationService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * Endpoint para actualizar la ubicación de un conductor
   * @param token Token de acceso del conductor
   * @param updateLocationDto Datos de ubicación
   * @returns Confirmación de actualización
   */
  @Post('update')
  async updateLocation(
    @Headers('authorization') token: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    try {
      if (!token) {
        throw new UnauthorizedException('Token de acceso requerido');
      }

      // Validar el token con el servicio de autenticación
      const driverId = await this.validateToken(token);

      // Actualizar la ubicación
      await this.locationService.updateDriverLocation(
        driverId,
        updateLocationDto.latitude,
        updateLocationDto.longitude,
      );

      return { success: true, message: 'Ubicación actualizada correctamente' };
    } catch (error) {
      this.logger.error(`Error updating location: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new HttpException(
        'Error al actualizar la ubicación',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Endpoint para obtener la última ubicación de un conductor
   * @param driverId ID del conductor
   * @returns Última ubicación conocida
   */
  @Get(':driverId/location')
  async getDriverLocation(@Param('driverId') driverId: string) {
    try {
      const location = await this.locationService.getLastKnownLocation(driverId);
      
      if (!location) {
        throw new HttpException('Ubicación no encontrada', HttpStatus.NOT_FOUND);
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
        'Error al obtener la ubicación',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Valida un token con el servicio de autenticación
   * @param token Token a validar
   * @returns ID del conductor
   */
  private async validateToken(token: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/validate-token`, { token }),
      );
      
      return response.data.driverId;
    } catch (error) {
      this.logger.error(`Error validating token: ${error.message}`, error.stack);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}

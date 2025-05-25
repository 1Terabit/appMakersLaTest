import { HttpException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UpdateLocationDto } from '../dto/update-location.dto';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly locationServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.locationServiceUrl = this.configService.get<string>('LOCATION_SERVICE_URL') || 'http://localhost:3002';
  }

  /**
   * Actualiza la ubicación de un conductor
   * @param token Token de acceso del conductor
   * @param updateLocationDto Datos de ubicación
   * @returns Confirmación de actualización
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
        throw new UnauthorizedException('Token inválido o expirado');
      }
      
      throw new HttpException(
        'Error al actualizar la ubicación',
        error.response?.status || 500,
      );
    }
  }

  /**
   * Obtiene la última ubicación de un conductor
   * @param driverId ID del conductor
   * @returns Última ubicación conocida
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
        'Error al obtener la ubicación',
        error.response?.status || 500,
      );
    }
  }
}

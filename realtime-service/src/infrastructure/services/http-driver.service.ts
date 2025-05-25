import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DriverLocation } from '../../domain/driver-location.entity';
import { DriverProfile } from '../../domain/driver-profile.entity';
import { IDriverService } from '../../ports/out/driver-service.port';

@Injectable()
export class HttpDriverService implements IDriverService {
  private readonly logger = new Logger(HttpDriverService.name);
  private readonly authServiceUrl: string;
  private readonly locationServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001';
    this.locationServiceUrl = this.configService.get<string>('LOCATION_SERVICE_URL') || 'http://localhost:3002';
  }

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

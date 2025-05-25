import { Inject, Injectable, Logger } from '@nestjs/common';
import { DriverLocation } from '../domain/driver-location.entity';
import { ILocationService } from '../ports/in/location-service.port';
import { ILocationRepository } from '../ports/out/location-repository.port';
import { ILocationMessaging } from '../ports/out/messaging.port';

@Injectable()
export class LocationService implements ILocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @Inject('ILocationRepository') private locationRepository: ILocationRepository,
    @Inject('ILocationMessaging') private locationMessaging: ILocationMessaging,
  ) {}

  async updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    try {
      const location = new DriverLocation({
        driverId,
        latitude,
        longitude,
        timestamp: new Date(),
      });

      // Guardar la ubicación en el repositorio
      await this.locationRepository.saveLocation(location);
      
      // Publicar la actualización para que otros servicios puedan consumirla
      await this.locationMessaging.publishLocationUpdate(location);
      
      this.logger.log(`Updated location for driver ${driverId}: ${latitude}, ${longitude}`);
    } catch (error) {
      this.logger.error(`Error updating location for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getLastKnownLocation(driverId: string): Promise<DriverLocation | null> {
    try {
      return await this.locationRepository.getLastLocation(driverId);
    } catch (error) {
      this.logger.error(`Error getting last location for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async isDriverOnline(driverId: string): Promise<boolean> {
    try {
      const lastLocation = await this.locationRepository.getLastLocation(driverId);
      
      if (!lastLocation) {
        return false;
      }
      
      return lastLocation.isRecent();
    } catch (error) {
      this.logger.error(`Error checking if driver ${driverId} is online`, error.stack);
      throw error;
    }
  }
}

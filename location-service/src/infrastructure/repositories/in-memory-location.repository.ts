import { Injectable, Logger } from '@nestjs/common';
import { DriverLocation } from '../../domain/driver-location.entity';
import { ILocationRepository } from '../../ports/out/location-repository.port';

/**
 * Implementación en memoria del repositorio de ubicaciones
 * En un entorno real, esto se conectaría a una base de datos
 */
@Injectable()
export class InMemoryLocationRepository implements ILocationRepository {
  private readonly logger = new Logger(InMemoryLocationRepository.name);
  // Simulamos una base de datos en memoria con las ubicaciones de los conductores
  private locationsByDriver: Map<string, DriverLocation[]> = new Map();

  async saveLocation(location: DriverLocation): Promise<void> {
    const driverId = location.driverId;
    
    if (!this.locationsByDriver.has(driverId)) {
      this.locationsByDriver.set(driverId, []);
    }
    
    const driverLocations = this.locationsByDriver.get(driverId);
    driverLocations.push(location);
    
    // Mantener solo las últimas 100 ubicaciones para cada conductor
    if (driverLocations.length > 100) {
      driverLocations.shift();
    }
    
    this.logger.debug(`Saved location for driver ${driverId}: ${JSON.stringify(location)}`);
  }

  async getLastLocation(driverId: string): Promise<DriverLocation | null> {
    const driverLocations = this.locationsByDriver.get(driverId) || [];
    
    if (driverLocations.length === 0) {
      return null;
    }
    
    return driverLocations[driverLocations.length - 1];
  }

  async getLocationHistory(
    driverId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<DriverLocation[]> {
    const driverLocations = this.locationsByDriver.get(driverId) || [];
    
    return driverLocations.filter(
      location => location.timestamp >= startTime && location.timestamp <= endTime,
    );
  }
}

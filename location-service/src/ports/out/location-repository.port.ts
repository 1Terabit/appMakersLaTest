import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * Puerto de salida para el repositorio de ubicaciones
 */
export interface ILocationRepository {
  /**
   * Guarda la ubicación de un conductor
   * @param location Ubicación del conductor
   */
  saveLocation(location: DriverLocation): Promise<void>;

  /**
   * Obtiene la última ubicación conocida de un conductor
   * @param driverId ID del conductor
   */
  getLastLocation(driverId: string): Promise<DriverLocation | null>;

  /**
   * Obtiene las ubicaciones de un conductor en un rango de tiempo
   * @param driverId ID del conductor
   * @param startTime Tiempo inicial
   * @param endTime Tiempo final
   */
  getLocationHistory(
    driverId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<DriverLocation[]>;
}

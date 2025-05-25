import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * Puerto de entrada para el servicio de ubicación
 */
export interface ILocationService {
  /**
   * Actualiza la ubicación de un conductor
   * @param driverId ID del conductor
   * @param latitude Latitud
   * @param longitude Longitud
   */
  updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<void>;

  /**
   * Obtiene la última ubicación conocida de un conductor
   * @param driverId ID del conductor
   */
  getLastKnownLocation(driverId: string): Promise<DriverLocation | null>;

  /**
   * Verifica si el conductor está en línea
   * @param driverId ID del conductor
   */
  isDriverOnline(driverId: string): Promise<boolean>;
}

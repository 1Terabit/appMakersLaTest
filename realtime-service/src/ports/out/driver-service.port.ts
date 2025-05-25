import { DriverLocation } from '../../domain/driver-location.entity';
import { DriverProfile } from '../../domain/driver-profile.entity';

/**
 * Puerto de salida para comunicarse con los servicios de conductor
 */
export interface IDriverService {
  /**
   * Obtiene el perfil de un conductor
   * @param driverId ID del conductor
   */
  getDriverProfile(driverId: string): Promise<DriverProfile | null>;

  /**
   * Obtiene la última ubicación conocida de un conductor
   * @param driverId ID del conductor
   */
  getLastKnownLocation(driverId: string): Promise<DriverLocation | null>;

  /**
   * Valida un token de conductor
   * @param token Token a validar
   */
  validateDriverToken(token: string): Promise<{ isValid: boolean; driverId?: string }>;
}

import { DriverLocation } from '../../domain/driver-location.entity';
import { DriverProfile } from '../../domain/driver-profile.entity';

/**
 * Interfaz para representar la ubicación y perfil de un conductor
 */
export interface DriverLocationUpdate {
  location: DriverLocation;
  profile: DriverProfile;
}

/**
 * Puerto de entrada para el servicio de tiempo real
 */
export interface IRealtimeService {
  /**
   * Suscribe a un cliente a las actualizaciones de ubicación de un conductor
   * @param clientId ID del cliente
   * @param driverId ID del conductor
   */
  subscribeToDriverUpdates(clientId: string, driverId: string): Promise<void>;

  /**
   * Cancela la suscripción de un cliente a las actualizaciones de ubicación
   * @param clientId ID del cliente
   */
  unsubscribeFromDriverUpdates(clientId: string): Promise<void>;

  /**
   * Recibe una actualización de ubicación de un conductor y la distribuye a los clientes suscritos
   * @param driverId ID del conductor
   * @param location Datos de ubicación
   */
  handleDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void>;

  /**
   * Obtiene la última ubicación conocida y perfil de un conductor
   * @param driverId ID del conductor
   */
  getDriverLocationAndProfile(driverId: string): Promise<DriverLocationUpdate | null>;

  /**
   * Verifica si un conductor está en línea
   * @param driverId ID del conductor
   */
  isDriverOnline(driverId: string): Promise<boolean>;
}

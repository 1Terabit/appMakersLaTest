import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * Puerto de salida para la comunicación entre instancias del servicio
 */
export interface IRealtimeMessaging {
  /**
   * Suscribe a esta instancia a las actualizaciones de ubicación de un conductor
   * @param driverId ID del conductor
   */
  subscribeToDriverLocationUpdates(driverId: string): Promise<void>;

  /**
   * Cancela la suscripción a las actualizaciones de ubicación de un conductor
   * @param driverId ID del conductor
   */
  unsubscribeFromDriverLocationUpdates(driverId: string): Promise<void>;

  /**
   * Publica una actualización de ubicación para que otras instancias puedan consumirla
   * @param driverId ID del conductor
   * @param location Datos de ubicación
   */
  publishDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void>;

  /**
   * Configura el handler para recibir actualizaciones de ubicación de conductores
   * @param handler Función que maneja las actualizaciones recibidas
   */
  onDriverLocationUpdate(handler: (driverId: string, location: DriverLocation) => void): void;
}

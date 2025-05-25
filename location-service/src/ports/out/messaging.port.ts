import { DriverLocation } from '../../domain/driver-location.entity';

/**
 * Puerto de salida para el sistema de mensajería
 */
export interface ILocationMessaging {
  /**
   * Publica una actualización de ubicación para que otros servicios puedan consumirla
   * @param location Ubicación actualizada del conductor
   */
  publishLocationUpdate(location: DriverLocation): Promise<void>;
}

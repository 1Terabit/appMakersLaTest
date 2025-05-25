import { Inject, Injectable, Logger } from '@nestjs/common';
import { DriverLocation } from '../domain/driver-location.entity';
import { DriverProfile } from '../domain/driver-profile.entity';
import { DriverLocationUpdate, IRealtimeService } from '../ports/in/realtime-service.port';
import { IDriverService } from '../ports/out/driver-service.port';
import { IRealtimeMessaging } from '../ports/out/messaging.port';

@Injectable()
export class RealtimeService implements IRealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  
  // Mapa que almacena la relación entre clientes y conductores a los que están suscritos
  private clientSubscriptions: Map<string, string> = new Map();
  
  // Mapa inverso que almacena para cada conductor, los clientes que lo siguen
  private driverSubscribers: Map<string, Set<string>> = new Map();
  
  // Caché de ubicaciones por conductor
  private locationCache: Map<string, DriverLocation> = new Map();
  
  // Caché de perfiles por conductor
  private profileCache: Map<string, DriverProfile> = new Map();

  constructor(
    @Inject('IDriverService') private driverService: IDriverService,
    @Inject('IRealtimeMessaging') private messaging: IRealtimeMessaging,
  ) {
    // Configurar el handler para recibir actualizaciones de ubicación de otras instancias
    this.messaging.onDriverLocationUpdate(this.handleDriverLocationUpdate.bind(this));
  }

  async subscribeToDriverUpdates(clientId: string, driverId: string): Promise<void> {
    try {
      // Si el cliente ya estaba suscrito a otro conductor, lo desuscribimos
      if (this.clientSubscriptions.has(clientId)) {
        const previousDriverId = this.clientSubscriptions.get(clientId);
        await this.unsubscribeClientFromDriver(clientId, previousDriverId);
      }

      // Suscribir al cliente al nuevo conductor
      this.clientSubscriptions.set(clientId, driverId);
      
      // Añadir el cliente a la lista de suscriptores del conductor
      if (!this.driverSubscribers.has(driverId)) {
        this.driverSubscribers.set(driverId, new Set());
        
        // Si es el primer suscriptor, suscribimos esta instancia a las actualizaciones de Redis
        await this.messaging.subscribeToDriverLocationUpdates(driverId);
      }
      
      this.driverSubscribers.get(driverId).add(clientId);
      
      this.logger.log(`Client ${clientId} subscribed to driver ${driverId}`);
      
      // Intentar cargar el perfil del conductor si no está en caché
      if (!this.profileCache.has(driverId)) {
        const profile = await this.driverService.getDriverProfile(driverId);
        if (profile) {
          this.profileCache.set(driverId, profile);
        }
      }
      
      // Intentar cargar la última ubicación si no está en caché
      if (!this.locationCache.has(driverId)) {
        const location = await this.driverService.getLastKnownLocation(driverId);
        if (location) {
          this.locationCache.set(driverId, location);
        }
      }
    } catch (error) {
      this.logger.error(`Error subscribing client ${clientId} to driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async unsubscribeFromDriverUpdates(clientId: string): Promise<void> {
    try {
      if (this.clientSubscriptions.has(clientId)) {
        const driverId = this.clientSubscriptions.get(clientId);
        await this.unsubscribeClientFromDriver(clientId, driverId);
        this.logger.log(`Client ${clientId} unsubscribed from all drivers`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing client ${clientId}`, error.stack);
      throw error;
    }
  }

  async handleDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void> {
    try {
      // Actualizar la caché de ubicaciones
      this.locationCache.set(driverId, location);
      
      // Si no hay suscriptores para este conductor, no hacemos nada más
      if (!this.driverSubscribers.has(driverId) || this.driverSubscribers.get(driverId).size === 0) {
        return;
      }
      
      // Publicar la actualización de ubicación a través de Redis para otras instancias
      await this.messaging.publishDriverLocationUpdate(driverId, location);
      
      this.logger.debug(`Received location update for driver ${driverId}`);
    } catch (error) {
      this.logger.error(`Error handling location update for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getDriverLocationAndProfile(driverId: string): Promise<DriverLocationUpdate | null> {
    try {
      let location = this.locationCache.get(driverId);
      let profile = this.profileCache.get(driverId);
      
      // Si no tenemos la ubicación en caché, la solicitamos al servicio
      if (!location) {
        location = await this.driverService.getLastKnownLocation(driverId);
        if (location) {
          this.locationCache.set(driverId, location);
        } else {
          return null;
        }
      }
      
      // Si no tenemos el perfil en caché, lo solicitamos al servicio
      if (!profile) {
        profile = await this.driverService.getDriverProfile(driverId);
        if (profile) {
          this.profileCache.set(driverId, profile);
        } else {
          return null;
        }
      }
      
      return { location, profile };
    } catch (error) {
      this.logger.error(`Error getting location and profile for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async isDriverOnline(driverId: string): Promise<boolean> {
    try {
      const location = this.locationCache.get(driverId) || 
                      await this.driverService.getLastKnownLocation(driverId);
      
      if (!location) {
        return false;
      }
      
      return location.isRecent();
    } catch (error) {
      this.logger.error(`Error checking if driver ${driverId} is online`, error.stack);
      throw error;
    }
  }

  /**
   * Método auxiliar para desuscribir un cliente de un conductor
   */
  private async unsubscribeClientFromDriver(clientId: string, driverId: string): Promise<void> {
    // Eliminar el cliente de la lista de suscriptores del conductor
    if (this.driverSubscribers.has(driverId)) {
      this.driverSubscribers.get(driverId).delete(clientId);
      
      // Si no quedan suscriptores, desuscribimos esta instancia de las actualizaciones de Redis
      if (this.driverSubscribers.get(driverId).size === 0) {
        await this.messaging.unsubscribeFromDriverLocationUpdates(driverId);
        this.driverSubscribers.delete(driverId);
      }
    }
    
    // Eliminar la suscripción del cliente
    this.clientSubscriptions.delete(clientId);
  }
}

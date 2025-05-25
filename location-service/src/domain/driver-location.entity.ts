/**
 * Entidad de dominio que representa la ubicación de un conductor
 */
export class DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  
  constructor(partial: Partial<DriverLocation>) {
    Object.assign(this, partial);
    this.timestamp = this.timestamp || new Date();
  }

  /**
   * Verifica si la ubicación está actualizada (menos de 10 minutos)
   */
  isRecent(): boolean {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return this.timestamp > tenMinutesAgo;
  }
}

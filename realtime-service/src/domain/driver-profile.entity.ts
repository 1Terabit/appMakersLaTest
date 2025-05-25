/**
 * Entidad de dominio que representa el perfil de un conductor
 */
export class DriverProfile {
  id: string;
  name: string;
  profileImage: string;

  constructor(partial: Partial<DriverProfile>) {
    Object.assign(this, partial);
  }
}

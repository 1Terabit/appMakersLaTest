import { Driver } from '../../domain/driver.entity';

/**
 * Puerto de salida para el repositorio de conductores
 */
export interface IDriverRepository {
  /**
   * Busca un conductor por sus credenciales
   * @param email Email del conductor
   * @param password Contraseña del conductor (sin hashear)
   */
  findByCredentials(email: string, password: string): Promise<Driver | null>;

  /**
   * Busca un conductor por su ID
   * @param id ID del conductor
   */
  findById(id: string): Promise<Driver | null>;

  /**
   * Busca un conductor por su email
   * @param email Email del conductor
   */
  findByEmail(email: string): Promise<Driver | null>;
}

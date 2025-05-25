import { Driver } from '../../domain/driver.entity';

/**
 * Output port for the driver repository
 * Defines the contract for driver data operations within the hexagonal architecture
 */
export interface IDriverRepository {
  /**
   * Finds a driver by their credentials
   * @param email Driver's email address
   * @param password Driver's raw password (not hashed)
   * @returns The driver if credentials match, null otherwise
   */
  findByCredentials(email: string, password: string): Promise<Driver | null>;

  /**
   * Finds a driver by their unique ID
   * @param id Driver's unique identifier
   * @returns The driver if found, null otherwise
   */
  findById(id: string): Promise<Driver | null>;

  /**
   * Finds a driver by their email address
   * @param email Driver's email address
   * @returns The driver if found, null otherwise
   */
  findByEmail(email: string): Promise<Driver | null>;
}

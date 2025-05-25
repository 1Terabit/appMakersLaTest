import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Driver } from '../../domain/driver.entity';
import { IDriverRepository } from '../../ports/out/driver-repository.port';

/**
 * In-memory implementation of the driver repository
 * In a real environment, this would connect to a database
 * Used for development and testing purposes
 */
@Injectable()
export class InMemoryDriverRepository implements IDriverRepository {
  /**
   * Simulates an in-memory database with hardcoded drivers
   * @private
   */
  private drivers: Driver[] = [];

  /**
   * Initializes the repository with test drivers
   */
  constructor() {
    this.initializeDrivers();
  }

  /**
   * Finds a driver by their email and password credentials
   * @param email Driver's email address
   * @param password Driver's raw password (will be hashed for comparison)
   * @returns The driver if credentials match, null otherwise
   */
  async findByCredentials(email: string, password: string): Promise<Driver | null> {
    const driver = await this.findByEmail(email);
    
    if (!driver) {
      return null;
    }
    
    const hashedPassword = this.hashPassword(password);
    const isPasswordValid = hashedPassword === driver.password;
    
    return isPasswordValid ? driver : null;
  }

  /**
   * Finds a driver by their unique ID
   * @param id Driver's unique identifier
   * @returns The driver if found, null otherwise
   */
  async findById(id: string): Promise<Driver | null> {
    return this.drivers.find(driver => driver.id === id) || null;
  }

  /**
   * Finds a driver by their email address
   * @param email Driver's email address
   * @returns The driver if found, null otherwise
   */
  async findByEmail(email: string): Promise<Driver | null> {
    return this.drivers.find(driver => driver.email === email) || null;
  }

  /**
   * Initializes the "database" with test drivers
   * In a real environment, this function would not exist
   * @private
   */
  private async initializeDrivers() {
    // Create 3 test drivers with passwords hashed using crypto
    
    this.drivers = [
      {
        id: '1',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        password: this.hashPassword('password1'),
        profileImage: 'https://randomuser.me/api/portraits/men/1.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'María López',
        email: 'maria@example.com',
        password: this.hashPassword('password2'),
        profileImage: 'https://randomuser.me/api/portraits/women/2.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: 'Carlos Rodríguez',
        email: 'carlos@example.com',
        password: this.hashPassword('password3'),
        profileImage: 'https://randomuser.me/api/portraits/men/3.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * Simple method to hash passwords using crypto instead of bcrypt
   * This is temporary, in production bcrypt should be used
   * @param password Raw password to hash
   * @returns Hashed password
   * @private
   */
  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
}

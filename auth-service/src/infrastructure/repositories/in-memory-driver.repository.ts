import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Driver } from '../../domain/driver.entity';
import { IDriverRepository } from '../../ports/out/driver-repository.port';

/**
 * Implementación en memoria del repositorio de conductores
 * En un entorno real, esto se conectaría a una base de datos
 */
@Injectable()
export class InMemoryDriverRepository implements IDriverRepository {
  // Simulamos una base de datos en memoria con conductores codificados
  private drivers: Driver[] = [];

  constructor() {
    // Inicializamos con algunos conductores de prueba
    this.initializeDrivers();
  }

  async findByCredentials(email: string, password: string): Promise<Driver | null> {
    const driver = await this.findByEmail(email);
    
    if (!driver) {
      return null;
    }
    
    const hashedPassword = this.hashPassword(password);
    const isPasswordValid = hashedPassword === driver.password;
    
    return isPasswordValid ? driver : null;
  }

  async findById(id: string): Promise<Driver | null> {
    return this.drivers.find(driver => driver.id === id) || null;
  }

  async findByEmail(email: string): Promise<Driver | null> {
    return this.drivers.find(driver => driver.email === email) || null;
  }

  /**
   * Inicializa la "base de datos" con conductores de prueba
   * En un entorno real, esta función no existiría
   */
  private async initializeDrivers() {
    // Creamos 3 conductores de prueba con contraseñas hasheadas con crypto
    
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
   * Método simple para hashear contraseñas usando crypto en lugar de bcrypt
   * Esto es temporal, en producción se debería usar bcrypt
   */
  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
}

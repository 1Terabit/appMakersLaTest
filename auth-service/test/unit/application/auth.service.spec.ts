import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/application/auth.service';
import { Driver } from '../../../src/domain/driver.entity';
import { IDriverRepository } from '../../../src/ports/out/driver-repository.port';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Mock driver repository for testing
class MockDriverRepository implements IDriverRepository {
  private drivers: Driver[] = [
    new Driver({
      id: '1',
      name: 'Test Driver',
      email: 'test@example.com',
      password: 'f2d81a260dea8a100dd517984e53c56a7523d96942a834b9cdc249bd4e8c7aa9', // hash of 'password123'
      profileImage: 'https://randomuser.me/api/portraits/men/1.jpg'
    })
  ];

  async findByCredentials(email: string, password: string): Promise<Driver | null> {
    // Not implemented directly because it will be handled by the service
    throw new Error('Method should not be called directly in tests');
  }

  async findByEmail(email: string): Promise<Driver | null> {
    return this.drivers.find(driver => driver.email === email) || null;
  }

  async findById(id: string): Promise<Driver | null> {
    return this.drivers.find(driver => driver.id === id) || null;
  }
}

// Mock JWT service for testing
class MockJwtService {
  sign(payload: any, options?: any): string {
    return 'mock-jwt-token';
  }
  
  verify(token: string): any {
    if (token === 'mock-jwt-token' || token === 'valid-token') {
      return { sub: '1' };
    }
    throw new Error('Invalid token');
  }
}

// Mock config service
class MockConfigService {
  get(key: string): string {
    const configs = {
      'JWT_SECRET': 'test-secret',
      'JWT_EXPIRES_IN': '5m'
    };
    return configs[key];
  }
}

describe('AuthService', () => {
  let service: AuthService;
  let repository: IDriverRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'IDriverRepository',
          useClass: MockDriverRepository,
        },
        {
          provide: JwtService,
          useClass: MockJwtService
        },
        {
          provide: ConfigService,
          useClass: MockConfigService
        }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get<IDriverRepository>('IDriverRepository');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return token and driver data when credentials are valid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123'; // Plain password
      
      // Mock for simulization of correct hash - the password 'password123' must hash to something that matches
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHash').mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('f2d81a260dea8a100dd517984e53c56a7523d96942a834b9cdc249bd4e8c7aa9')
      }));

      // Act
      const result = await service.login(email, password);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.driver).toBeDefined();
      expect(result.driver.id).toBe('1');
      expect(result.driver.name).toBe('Test Driver');
      expect(result.driver.email).toBe('test@example.com');
      // Verificar que la propiedad password no existe en el objeto
      expect('password' in result.driver).toBe(false); // Password should be removed
      
      // Restore original behavior
      jest.restoreAllMocks();
    });

    it('should throw UnauthorizedException when driver not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'password123';
      
      // Act & Assert
      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongpassword';
      
      // Mock for simulation of incorrect hash
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHash').mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('incorrecthash')
      }));
      
      // Act & Assert
      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
      
      // Restore original behavior
      jest.restoreAllMocks();
    });
  });

  describe('validateToken', () => {
    it('should return valid=true and driverId when token is valid', async () => {
      // Arrange
      const driverId = '1';
      const token = 'valid-token';
      
      // Act
      const result = await service.validateToken(token);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.driverId).toBe(driverId);
    });

    it('should return valid=false when token is invalid', async () => {
      // Arrange
      const token = 'invalid-token';
      
      // Act
      const result = await service.validateToken(token);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.driverId).toBeUndefined();
    });
  });

  describe('getDriverProfile', () => {
    it('should return driver profile without password', async () => {
      // Arrange
      const driverId = '1';
      
      // Act
      const result = await service.getDriverProfile(driverId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Test Driver');
      expect(result.email).toBe('test@example.com');
      expect('password' in result).toBe(false); // Password should be removed
    });

    it('should return null when driver not found', async () => {
      // Arrange
      const driverId = 'nonexistent';
      
      // Act
      const result = await service.getDriverProfile(driverId);
      
      // Assert
      expect(result).toBeNull();
    });
  });
});

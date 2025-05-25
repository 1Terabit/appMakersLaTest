import { InMemoryDriverRepository } from '../../../../src/infrastructure/repositories/in-memory-driver.repository';
import { Driver } from '../../../../src/domain/driver.entity';
import * as crypto from 'crypto';

describe('InMemoryDriverRepository', () => {
  let repository: InMemoryDriverRepository;
  const testDriver = new Driver({
    id: '1',
    name: 'Test Driver',
    email: 'test@example.com',
    password: 'hashedpassword123', // This would normally be a hashed password
    profileImage: 'https://randomuser.me/api/portraits/men/1.jpg'
  });

  beforeEach(() => {
    repository = new InMemoryDriverRepository();
    // Add test driver to repository
    repository['drivers'] = [testDriver];
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should return driver when id exists', async () => {
      // Act
      const result = await repository.findById('1');
      
      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('Test Driver');
    });

    it('should return null when id does not exist', async () => {
      // Act
      const result = await repository.findById('999');
      
      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return driver when email exists', async () => {
      // Act
      const result = await repository.findByEmail('test@example.com');
      
      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when email does not exist', async () => {
      // Act
      const result = await repository.findByEmail('nonexistent@example.com');
      
      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByCredentials', () => {
    // Mocking the hash function to simulate password verification
    let createHashSpy;
    
    beforeEach(() => {
      // Mock implementation that returns a predefined hash for 'correctpassword'
      // Creamos un mock que imita la interfaz Hash pero con comportamiento controlado
      createHashSpy = jest.spyOn(crypto, 'createHash').mockImplementation((algorithm) => {
        // Creamos un objeto que simula la interfaz Hash de Node.js
        const mockHash = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockImplementation((format) => {
            const lastData = mockHash.update.mock.calls[mockHash.update.mock.calls.length - 1][0];
            if (lastData === 'correctpassword') {
              return 'hashedpassword123'; // Match with our test driver
            }
            return 'wronghash';
          }),
          // Agregar propiedades adicionales requeridas por la interfaz Hash
          copy: jest.fn().mockReturnThis(),
          _transform: jest.fn(),
          _flush: jest.fn(),
          pipe: jest.fn().mockReturnThis(),
          on: jest.fn().mockReturnThis(),
          once: jest.fn().mockReturnThis(),
          emit: jest.fn().mockReturnThis()
        };
        return mockHash as any;
      });
    });
    
    afterEach(() => {
      // Restore original implementation
      createHashSpy.mockRestore();
    });

    it('should return driver when credentials are valid', async () => {
      // Act
      const result = await repository.findByCredentials('test@example.com', 'correctpassword');
      
      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });

    it('should return null when email is invalid', async () => {
      // Act
      const result = await repository.findByCredentials('wrong@example.com', 'correctpassword');
      
      // Assert
      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      // Act
      const result = await repository.findByCredentials('test@example.com', 'wrongpassword');
      
      // Assert
      expect(result).toBeNull();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { LocationService } from '../../../src/application/location.service';
import { DriverLocation } from '../../../src/domain/driver-location.entity';
import { ILocationRepository } from '../../../src/ports/out/location-repository.port';
import { ILocationMessaging } from '../../../src/ports/out/messaging.port';

// Create a subset of the real interface with only the methods we need for testing
interface ILocationRepositoryTest {
  saveLocation(location: DriverLocation): Promise<void>;
  getLastLocation(driverId: string): Promise<DriverLocation | null>;
  getLocationHistory(driverId: string, startTime: Date, endTime: Date): Promise<DriverLocation[]>;
}

// Mock repository
class MockLocationRepository implements ILocationRepositoryTest {
  private locations: DriverLocation[] = [
    new DriverLocation({
      driverId: '1',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    }),
    new DriverLocation({
      driverId: '2',
      latitude: 34.0522,
      longitude: -118.2437,
      timestamp: new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago (offline)
    })
  ];

  async saveLocation(location: DriverLocation): Promise<void> {
    const existingIndex = this.locations.findIndex(loc => loc.driverId === location.driverId);
    if (existingIndex >= 0) {
      this.locations[existingIndex] = location;
    } else {
      this.locations.push(location);
    }
  }

  async getLastLocation(driverId: string): Promise<DriverLocation | null> {
    return this.locations.find(loc => loc.driverId === driverId) || null;
  }

  async getLocationHistory(driverId: string, startTime: Date, endTime: Date): Promise<DriverLocation[]> {
    return this.locations.filter(loc => 
      loc.driverId === driverId && 
      loc.timestamp >= startTime && 
      loc.timestamp <= endTime
    );
  }
}

// Mock messaging service
class MockLocationMessaging implements ILocationMessaging {
  async publishLocationUpdate(location: DriverLocation): Promise<void> {
    // This would publish to a message broker in real implementation
    return Promise.resolve();
  }
}

describe('LocationService', () => {
  let service: LocationService;
  let repository: ILocationRepository;
  let messaging: ILocationMessaging;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: 'ILocationRepository',
          useClass: MockLocationRepository,
        },
        {
          provide: 'ILocationMessaging',
          useClass: MockLocationMessaging,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    repository = module.get<ILocationRepository>('ILocationRepository');
    messaging = module.get<ILocationMessaging>('ILocationMessaging');

    // Spy on the messaging publish method
    jest.spyOn(messaging, 'publishLocationUpdate');
    
    // Spy on repository methods
    // Using as any to avoid TypeScript issues
    jest.spyOn(repository as any, 'saveLocation');
    jest.spyOn(repository as any, 'getLastLocation');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateDriverLocation', () => {
    it('should update location and publish message', async () => {
      // Arrange
      const driverId = '1';
      const latitude = 34.0522;
      const longitude = -118.2437;

      // Act
      await service.updateDriverLocation(driverId, latitude, longitude);

      // Assert
      expect(repository.saveLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          driverId,
          latitude,
          longitude,
          timestamp: expect.any(Date)
        })
      );
      expect(messaging.publishLocationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          driverId,
          latitude,
          longitude
        })
      );
    });

    it('should handle errors appropriately', async () => {
      // Arrange
      const driverId = '1';
      const latitude = 34.0522;
      const longitude = -118.2437;
      const error = new Error('Test error');

      // Mock repository to throw error
      jest.spyOn(repository as any, 'saveLocation').mockRejectedValueOnce(error);
      
      // Spy on logger
      jest.spyOn(Logger.prototype, 'error').mockImplementation();

      // Act & Assert
      await expect(service.updateDriverLocation(driverId, latitude, longitude)).rejects.toThrow();
      expect(messaging.publishLocationUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getLastKnownLocation', () => {
    it('should return driver location when it exists', async () => {
      // Arrange
      const driverId = '1';

      // Act
      const result = await service.getLastKnownLocation(driverId);

      // Assert
      expect(result).toBeDefined();
      expect(result.driverId).toBe(driverId);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });

    it('should return null when driver location does not exist', async () => {
      // Arrange
      const driverId = 'nonexistent';

      // Act
      const result = await service.getLastKnownLocation(driverId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle errors appropriately', async () => {
      // Arrange
      const driverId = '1';
      const error = new Error('Test error');

      // Mock repository to throw error
      jest.spyOn(repository as any, 'getLastLocation').mockRejectedValueOnce(error);
      
      // Spy on logger
      jest.spyOn(Logger.prototype, 'error').mockImplementation();

      // Act & Assert
      await expect(service.getLastKnownLocation(driverId)).rejects.toThrow();
    });
  });

  describe('isDriverOnline', () => {
    it('should return true when driver has recent location update', async () => {
      // Arrange
      const driverId = '1'; // This driver has a location update from 5 minutes ago

      // Act
      const result = await service.isDriverOnline(driverId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when driver has old location update', async () => {
      // Arrange
      const driverId = '2'; // This driver has a location update from 20 minutes ago

      // Act
      const result = await service.isDriverOnline(driverId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when driver has no location update', async () => {
      // Arrange
      const driverId = 'nonexistent';

      // Act
      const result = await service.isDriverOnline(driverId);

      // Assert
      expect(result).toBe(false);
    });
  });
});

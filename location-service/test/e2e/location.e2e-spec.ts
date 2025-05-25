import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, Module } from '@nestjs/common';
import * as request from 'supertest';
import { LocationModule } from '../../src/location.module';
import { DriverLocation } from '../../src/domain/driver-location.entity';
import * as nock from 'nock';
import { ILocationMessaging } from '../../src/ports/out/messaging.port';
import { LocationService } from '../../src/application/location.service';
import { LocationController } from '../../src/infrastructure/controllers/location.controller';
import { InMemoryLocationRepository } from '../../src/infrastructure/repositories/in-memory-location.repository';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

/**
 * E2E tests for the Location Service
 * These tests verify the complete request-response cycle through HTTP endpoints
 */
describe('LocationController (e2e)', () => {
  let app: INestApplication;
  let testDriverId: string;
  
  class MockLocationMessaging implements ILocationMessaging {
    async publishLocationUpdate(location: DriverLocation): Promise<void> {
      return Promise.resolve();
    }
  }

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      HttpModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          timeout: 5000,
          maxRedirects: 5,
        }),
      }),
    ],
    controllers: [LocationController],
    providers: [
      {
        provide: 'ILocationRepository',
        useClass: InMemoryLocationRepository,
      },
      {
        provide: 'ILocationMessaging',
        useClass: MockLocationMessaging,
      },
      {
        provide: 'ILocationService',
        useClass: LocationService,
      },
      LocationService,
    ],
  })
  class TestLocationModule {}

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestLocationModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Use a fixed driver ID for all tests
    testDriverId = '1';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Location Update Flow', () => {
    beforeEach(() => {
      // Mock auth service for token validation
      nock('http://localhost:3001')
        .post('/auth/validate-token')
        .reply(200, {
          isValid: true,
          driverId: testDriverId
        });
    });
    
    afterEach(() => {
      nock.cleanAll();
    });
    
    it('should update a driver location with valid token', () => {
      const updateLocationDto = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      
      return request(app.getHttpServer())
        .post('/driver/update')
        .set('Authorization', 'Bearer valid-token')
        .send(updateLocationDto)
        .expect(201)
        .then(response => {
          expect(response.body.success).toBe(true);
        });
    });
    
    it('should return 401 when token is missing', () => {
      const updateLocationDto = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      
      return request(app.getHttpServer())
        .post('/driver/update')
        .send(updateLocationDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should get the last known location for a driver', () => {
      return request(app.getHttpServer())
        .get(`/driver/${testDriverId}/location`)
        .expect(200)
        .then(response => {
          expect(response.body).toBeDefined();
          expect(response.body.driverId).toBe(testDriverId);
          expect(response.body.latitude).toBeDefined();
          expect(response.body.longitude).toBeDefined();
          expect(response.body.timestamp).toBeDefined();
        });
    });

    it('should return 404 for non-existent driver location', () => {
      const nonExistentDriverId = 'non-existent-id';
      
      return request(app.getHttpServer())
        .get(`/driver/${nonExistentDriverId}/location`)
        .expect(404);
    });
  });

  describe('Location Retrieval Flow', () => {
    it('should get location and online status for a driver with location update', () => {
      // First we need to update the location so it exists in the repository
      // Mock auth service for token validation
      nock('http://localhost:3001')
        .post('/auth/validate-token')
        .reply(200, {
          isValid: true,
          driverId: testDriverId
        });
      
      const updateLocationDto = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      
      // First update the location
      return request(app.getHttpServer())
        .post('/driver/update')
        .set('Authorization', 'Bearer valid-token')
        .send(updateLocationDto)
        .expect(201)
        .then(() => {
          // Then check the location
          return request(app.getHttpServer())
            .get(`/driver/${testDriverId}/location`)
            .expect(200)
            .then(response => {
              expect(response.body).toBeDefined();
              expect(response.body.driverId).toBe(testDriverId);
              expect(response.body.latitude).toBe(updateLocationDto.latitude);
              expect(response.body.longitude).toBe(updateLocationDto.longitude);
              expect(response.body.isOnline).toBeDefined();
            });
        });
    });

    it('should return 404 for driver without location updates', () => {
      const nonExistentDriverId = 'non-existent-driver';
      
      return request(app.getHttpServer())
        .get(`/driver/${nonExistentDriverId}/location`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Sequence of Operations', () => {
    it('should handle a complete location tracking flow', async () => {
      // 1. Setup token validation for a new driver
      const newDriverId = 'new-driver-1';
      nock('http://localhost:3001')
        .post('/auth/validate-token')
        .reply(200, {
          isValid: true,
          driverId: newDriverId
        });
        
      // 2. Update location for the new driver
      const updateLocationDto = {
        latitude: 40.7128,
        longitude: -74.0060,
      };
      
      await request(app.getHttpServer())
        .post('/driver/update')
        .set('Authorization', 'Bearer valid-token-for-new-driver')
        .send(updateLocationDto)
        .expect(201);
      
      // 3. Get the driver's location and verify it matches what we set
      const locationResponse = await request(app.getHttpServer())
        .get(`/driver/${newDriverId}/location`)
        .expect(200);
        
      expect(locationResponse.body.driverId).toBe(newDriverId);
      expect(locationResponse.body.latitude).toBe(updateLocationDto.latitude);
      expect(locationResponse.body.longitude).toBe(updateLocationDto.longitude);
      expect(locationResponse.body.isOnline).toBe(true);
      
      // Clean up nock
      nock.cleanAll();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { LoginDto } from '../../src/dto/login.dto';
import { UpdateLocationDto } from '../../src/dto/update-location.dto';
import { ConfigModule } from '@nestjs/config';
import * as nock from 'nock';

/**
 * INFO: This E2E test simulates the integration between services using nock
 * to mock external service calls. In a real environment, you would use 
 * container orchestration with test containers or similar approaches.
 */
describe('Gateway BFF (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let driverId: string;

  beforeAll(async () => {
    // Set up mock service endpoints
    setupMockServices();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    nock.cleanAll();
  });

  function setupMockServices() {
    // Mock Auth Service
    nock('http://localhost:3001')
      .post('/auth/login')
      .reply(200, {
        token: 'mock-jwt-token',
        driver: {
          id: 'driver1',
          name: 'Test Driver',
          email: 'driver1@example.com',
          profileImage: 'https://randomuser.me/api/portraits/men/1.jpg'
        }
      });

    // Mock for token validation in the correct route
    nock('http://localhost:3001')
      .post('/auth/validate-token')
      .reply(200, {
        isValid: true,
        driverId: 'driver1'
      });
      
    // Mock for capture any token
    nock('http://localhost:3001')
      .post('/auth/validate-token', (body) => true)
      .reply(200, {
        isValid: true,
        driverId: 'driver1'
      });

    nock('http://localhost:3001')
      .get('/auth/profile/driver1')
      .reply(200, {
        id: 'driver1',
        name: 'Test Driver',
        email: 'driver1@example.com',
        profileImage: 'https://randomuser.me/api/portraits/men/1.jpg'
      });

    // Mock Location Service - update route to match the real implementation
    nock('http://localhost:3002')
      .post('/driver/update')
      .reply(200, {
        driverId: 'driver1',
        latitude: 40.7128,
        longitude: -74.0060,
        updatedAt: new Date().toISOString()
      });

    // Mock for correct route based on LocationService code
    nock('http://localhost:3002')
      .get('/driver/driver1/location')
      .reply(200, {
        driverId: 'driver1',
        latitude: 40.7128,
        longitude: -74.0060,
        updatedAt: new Date().toISOString()
      });

    // Mock Realtime Service
    // Mock for statistics that contains both properties expected by the tests and those returned by the service
    nock('http://localhost:3003')
      .get('/driver/driver1/statistics')
      .reply(200, {
        totalTrips: 120,
        rating: 4.8,
        totalEarnings: 1520.50,
        onlineHours: 180,
        // Additional properties returned by the service
        onlineDuration: 10800,
        connectedClients: 5,
        lastUpdateTime: new Date().toISOString()
      });
      
    // Mock for capture any statistics request
    nock('http://localhost:3003')
      .get(/\/driver\/.*\/statistics/)
      .reply(200, {
        totalTrips: 120,
        rating: 4.8,
        totalEarnings: 1520.50,
        onlineHours: 180,
        onlineDuration: 10800,
        connectedClients: 5,
        lastUpdateTime: new Date().toISOString()
      });
  }

  it('should complete the full flow from login to dashboard retrieval', async () => {
    // Step 1: Login
    const loginDto: LoginDto = {
      email: 'driver1@example.com',
      password: 'password123',
    };

    const loginResponse = await request(app.getHttpServer())
      .post('/api/login')
      .send(loginDto)
      .expect(201); // The real controller returns 201 Created

    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.driver).toBeDefined();
    expect(loginResponse.body.driver.id).toBeDefined();
    
    authToken = loginResponse.body.token;
    driverId = loginResponse.body.driver.id;

    // Step 2: Update driver location
    const updateLocationDto: UpdateLocationDto = {
      latitude: 40.7128,
      longitude: -74.0060,
    };

    await request(app.getHttpServer())
      .post('/api/driver/update')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateLocationDto)
      .expect(201); // The real controller returns 201 Created

    // Step 3: Get driver dashboard with aggregated data
    const dashboardResponse = await request(app.getHttpServer())
      .get(`/api/dashboard/driver/${driverId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify all dashboard components are present
    expect(dashboardResponse.body.profile).toBeDefined();
    expect(dashboardResponse.body.profile.id).toBe(driverId);
    expect(dashboardResponse.body.profile.name).toBeDefined();
    
    expect(dashboardResponse.body.location).toBeDefined();
    expect(dashboardResponse.body.location.latitude).toBe(40.7128);
    expect(dashboardResponse.body.location.longitude).toBe(-74.0060);
    
    expect(dashboardResponse.body.statistics).toBeDefined();
    expect(dashboardResponse.body.statistics.totalTrips).toBeDefined();
    expect(dashboardResponse.body.statistics.rating).toBeDefined();
  });
});

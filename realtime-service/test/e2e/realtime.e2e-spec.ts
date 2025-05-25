import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import * as io from 'socket.io-client';
import { RealtimeService } from '../../src/application/realtime.service';
import { IDriverService } from '../../src/ports/out/driver-service.port';
import { IRealtimeMessaging } from '../../src/ports/out/messaging.port';
import { DriverProfile } from '../../src/domain/driver-profile.entity';
import { DriverLocation } from '../../src/domain/driver-location.entity';
import { ClientGateway } from '../../src/infrastructure/gateways/client.gateway';
import { DriverGateway } from '../../src/infrastructure/gateways/driver.gateway';

// Mock this service for testing purposes (Redis)
class MockRealtimeMessaging implements IRealtimeMessaging {
  private locationUpdateHandler: ((driverId: string, location: DriverLocation) => void) | null = null;

  async subscribeToDriverLocationUpdates(driverId: string): Promise<void> {
    return Promise.resolve();
  }

  async unsubscribeFromDriverLocationUpdates(driverId: string): Promise<void> {
    return Promise.resolve();
  }

  async publishDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void> {
    // Simulate the publication by calling the handler if it is registered
    if (this.locationUpdateHandler) {
      this.locationUpdateHandler(driverId, location);
    }
    return Promise.resolve();
  }

  onDriverLocationUpdate(handler: (driverId: string, location: DriverLocation) => void): void {
    this.locationUpdateHandler = handler;
  }
}

// Mock this service for testing purposes (Driver)
class MockDriverService implements IDriverService {
  private readonly drivers = new Map<string, DriverProfile>([
    ['1', {
      id: '1',
      name: 'John Doe',
      phone: '123-456-7890',
      vehicle: {
        model: 'Toyota Corolla',
        plate: 'ABC123',
        color: 'Blue'
      },
      profileImage: 'https://example.com/john.jpg'
    } as DriverProfile],
    ['2', {
      id: '2',
      name: 'Jane Smith',
      phone: '987-654-3210',
      vehicle: {
        model: 'Honda Civic',
        plate: 'XYZ789',
        color: 'Red'
      },
      profileImage: 'https://example.com/jane.jpg'
    } as DriverProfile]
  ]);

  private readonly locations = new Map<string, DriverLocation>([
    ['1', {
      driverId: '1',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    } as DriverLocation],
    ['2', {
      driverId: '2',
      latitude: 34.0522,
      longitude: -118.2437,
      timestamp: new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
    } as DriverLocation]
  ]);

  async getDriverProfile(driverId: string): Promise<DriverProfile | null> {
    return this.drivers.get(driverId) || null;
  }

  async getLastKnownLocation(driverId: string): Promise<DriverLocation | null> {
    return this.locations.get(driverId) || null;
  }

  async validateDriverToken(token: string): Promise<{ isValid: boolean; driverId?: string }> {
    // For testing purposes, accept any token and extract the driver ID
    if (token.includes('driver')) {
      const driverId = token.split('-').pop();
      return { isValid: true, driverId };
    }
    return { isValid: false };
  }
}

// Custom module for testing purposes
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
  ],
  providers: [
    RealtimeService,
    ClientGateway,
    DriverGateway,
    {
      provide: 'IDriverService',
      useClass: MockDriverService,
    },
    {
      provide: 'IRealtimeService',
      useClass: RealtimeService,
    },
    {
      provide: 'IRealtimeMessaging',
      useClass: MockRealtimeMessaging,
    },
  ],
})
class TestRealtimeModule {}

describe('RealtimeGateways (e2e)', () => {
  let app: INestApplication;
  let clientSocket: any;
  let driverSocket: any;
  const testDriverId = '1';
  const testClientId = 'client-1';
  const serverPort = 3004;
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestRealtimeModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(serverPort);
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (driverSocket) {
      driverSocket.disconnect();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Configure client socket
    clientSocket = io.connect(`http://localhost:${serverPort}/client`, {
      transports: ['websocket'],
      forceNew: true,
    });
    
    // Configure driver socket
    driverSocket = io.connect(`http://localhost:${serverPort}/driver`, {
      transports: ['websocket'],
      forceNew: true,
    });
    
    // Wait for the sockets to connect
    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) {
          resolve();
        }
      };
      
      clientSocket.on('connect', onConnect);
      driverSocket.on('connect', onConnect);
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (driverSocket) {
      driverSocket.disconnect();
    }
  });

  it('should establish client and driver connections', () => {
    expect(clientSocket.connected).toBe(true);
    expect(driverSocket.connected).toBe(true);
  });

  it('should allow a client to subscribe to a driver', (done) => {
    // Client subscribes to a driver
    clientSocket.emit('subscribe-driver', testDriverId);
    
    // Increase timeout to avoid slow response issues
    jest.setTimeout(10000);
    
    // Wait for the confirmation with the driver update
    clientSocket.on('driver-update', (data: any) => {
      expect(data.driverId).toBe(testDriverId);
      expect(data.location).toBeDefined();
      expect(data.profile).toBeDefined();
      expect(data.profile.name).toBeDefined();
      done();
    });
  });

  it('should deliver location updates to subscribed clients', (done) => {
    // Increase timeout to avoid slow response issues
    jest.setTimeout(10000);
    
    // Client subscribes to a driver
    clientSocket.emit('subscribe-driver', testDriverId);
    
    // Wait for the subscription confirmation
    clientSocket.once('driver-update', () => {
      // Send driver location update
      const locationUpdate = {
        driverId: testDriverId,
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date().toISOString()
      };
      
      driverSocket.emit('location-update', locationUpdate);
      
      // Client receives the location update
      // Use 'once' instead of 'on' to avoid handling multiple events
      clientSocket.once('driver-update', (data: any) => {
        expect(data.driverId).toBe(testDriverId);
        expect(data.location).toBeDefined();
        expect(data.location.latitude).toBe(40.7128);
        expect(data.location.longitude).toBe(-74.0060);
        done();
      });
    });
  });

  it('should allow a client to unsubscribe from a driver', (done) => {
    // Increase timeout to avoid slow response issues
    jest.setTimeout(15000);
    
    // Client subscribes to a driver
    clientSocket.emit('subscribe-driver', testDriverId);
    
    // Variable to track if we receive an update after unsubscribing
    let receivedUpdateAfterUnsubscribe = false;
    
    // Wait for the subscription confirmation
    clientSocket.once('driver-update', () => {
      // Cancel the subscription
      clientSocket.emit('unsubscribe-driver', testDriverId);
      
      // Configure temporary listener for updates after unsubscribe
      const updateListener = () => {
        // Only count updates after unsubscribe
        receivedUpdateAfterUnsubscribe = true;
      };
      
      // Listen for updates that shouldn't arrive
      clientSocket.on('driver-update', updateListener);
      
      // Send location update (shouldn't reach the client)
      setTimeout(() => {
        const locationUpdate = {
          driverId: testDriverId,
          latitude: 34.0522,
          longitude: -118.2437,
          timestamp: new Date().toISOString()
        };
        
        driverSocket.emit('location-update', locationUpdate);
        
        // Give the system time to process the request
        setTimeout(() => {
          // Cleanup
          clientSocket.off('driver-update', updateListener);
          
          // Verify that no updates were received
          expect(receivedUpdateAfterUnsubscribe).toBe(false);
          done();
        }, 1000);
      }, 1000);
    });
  });

  it('should provide driver location and profile via subscription', (done) => {
    // Increase timeout to avoid slow response issues
    jest.setTimeout(10000);
    
    // Client subscribes to a driver
    clientSocket.emit('subscribe-driver', testDriverId);
    
    // Receive driver information
    clientSocket.once('driver-update', (data: any) => {
      expect(data.driverId).toBe(testDriverId);
      expect(data.profile).toBeDefined();
      expect(data.location).toBeDefined();
      expect(data.profile.name).toBeDefined();
      expect(data.location.latitude).toBeDefined();
      expect(data.location.longitude).toBeDefined();
      done();
    });
  });
});

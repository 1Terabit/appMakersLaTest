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

// Mock para el servicio de mensajería (Redis)
class MockRealtimeMessaging implements IRealtimeMessaging {
  private locationUpdateHandler: ((driverId: string, location: DriverLocation) => void) | null = null;

  async subscribeToDriverLocationUpdates(driverId: string): Promise<void> {
    return Promise.resolve();
  }

  async unsubscribeFromDriverLocationUpdates(driverId: string): Promise<void> {
    return Promise.resolve();
  }

  async publishDriverLocationUpdate(driverId: string, location: DriverLocation): Promise<void> {
    // Simular la publicación llamando al handler si está registrado
    if (this.locationUpdateHandler) {
      this.locationUpdateHandler(driverId, location);
    }
    return Promise.resolve();
  }

  onDriverLocationUpdate(handler: (driverId: string, location: DriverLocation) => void): void {
    this.locationUpdateHandler = handler;
  }
}

// Mock para el servicio de drivers
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
    // Para las pruebas, aceptamos cualquier token y extraemos el ID del conductor
    if (token.includes('driver')) {
      const driverId = token.split('-').pop();
      return { isValid: true, driverId };
    }
    return { isValid: false };
  }
}

// Módulo de prueba personalizado
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
    // Configurar socket de cliente
    clientSocket = io.connect(`http://localhost:${serverPort}/client`, {
      transports: ['websocket'],
      forceNew: true,
    });
    
    // Configurar socket de conductor
    driverSocket = io.connect(`http://localhost:${serverPort}/driver`, {
      transports: ['websocket'],
      forceNew: true,
    });
    
    // Esperar a que los sockets se conecten
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
    // El cliente se suscribe a un conductor
    clientSocket.emit('subscribe-driver', testDriverId);
    
    // Incrementar el timeout para evitar problemas con respuestas lentas
    jest.setTimeout(10000);
    
    // Esperar la respuesta de confirmación con la actualización del driver
    clientSocket.on('driver-update', (data: any) => {
      expect(data.driverId).toBe(testDriverId);
      expect(data.location).toBeDefined();
      expect(data.profile).toBeDefined();
      expect(data.profile.name).toBeDefined();
      done();
    });
  });

  it('should deliver location updates to subscribed clients', (done) => {
    // Incrementar el timeout para evitar problemas con respuestas lentas
    jest.setTimeout(10000);
    
    // El cliente se suscribe a un conductor
    clientSocket.emit('subscribe-driver', testDriverId);
    
    // Esperar la confirmación de suscripción
    clientSocket.once('driver-update', () => {
      // Enviar actualización de ubicación del conductor
      const locationUpdate = {
        driverId: testDriverId,
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date().toISOString()
      };
      
      driverSocket.emit('location-update', locationUpdate);
      
      // El cliente recibe la actualización de ubicación
      // Usamos 'once' en lugar de 'on' para evitar manejar múltiples eventos
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
    // Incrementar el timeout para evitar problemas con respuestas lentas
    jest.setTimeout(15000);
    
    // El cliente se suscribe a un conductor
    clientSocket.emit('subscribe-driver', testDriverId);
    
    // Variable para rastrear si recibimos actualización después de cancelar
    let receivedUpdateAfterUnsubscribe = false;
    
    // Esperar la confirmación de suscripción
    clientSocket.once('driver-update', () => {
      // Cancelar la suscripción
      clientSocket.emit('unsubscribe-driver', testDriverId);
      
      // Configurar escucha temporal para actualizaciones después de cancelar
      const updateListener = () => {
        // Solo contamos actualizaciones después del unsubscribe
        receivedUpdateAfterUnsubscribe = true;
      };
      
      // Escuchar actualizaciones que no deberían llegar
      clientSocket.on('driver-update', updateListener);
      
      // Enviar actualización de ubicación (no debería llegar al cliente)
      setTimeout(() => {
        const locationUpdate = {
          driverId: testDriverId,
          latitude: 34.0522,
          longitude: -118.2437,
          timestamp: new Date().toISOString()
        };
        
        driverSocket.emit('location-update', locationUpdate);
        
        // Darle tiempo al sistema para procesar la solicitud
        setTimeout(() => {
          // Limpieza
          clientSocket.off('driver-update', updateListener);
          
          // Verificamos que no se recibió ninguna actualización
          expect(receivedUpdateAfterUnsubscribe).toBe(false);
          done();
        }, 1000);
      }, 1000);
    });
  });

  it('should provide driver location and profile via subscription', (done) => {
    // Incrementar el timeout para evitar problemas con respuestas lentas
    jest.setTimeout(10000);
    
    // Solicitar información del conductor vía suscripción
    clientSocket.emit('subscribe-driver', testDriverId);
    
    // Recibir información del conductor
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

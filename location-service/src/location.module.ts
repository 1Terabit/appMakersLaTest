import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { LocationService } from './application/location.service';
import { LocationController } from './infrastructure/controllers/location.controller';
import { InMemoryLocationRepository } from './infrastructure/repositories/in-memory-location.repository';
import { RedisLocationMessaging } from './infrastructure/messaging/redis-location.messaging';

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
      useClass: RedisLocationMessaging,
    },
    {
      provide: 'ILocationService',
      useClass: LocationService,
    },
    LocationService,
  ],
  exports: ['ILocationService', LocationService],
})
export class LocationModule {}

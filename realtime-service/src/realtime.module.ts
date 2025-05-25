import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RealtimeService } from './application/realtime.service';
import { ClientGateway } from './infrastructure/gateways/client.gateway';
import { DriverGateway } from './infrastructure/gateways/driver.gateway';
import { RedisRealtimeMessaging } from './infrastructure/messaging/redis-realtime.messaging';
import { HttpDriverService } from './infrastructure/services/http-driver.service';

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
  providers: [
    {
      provide: 'IDriverService',
      useClass: HttpDriverService,
    },
    {
      provide: 'IRealtimeMessaging',
      useClass: RedisRealtimeMessaging,
    },
    {
      provide: 'IRealtimeService',
      useClass: RealtimeService,
    },
    RealtimeService,
    ClientGateway,
    DriverGateway,
  ],
})
export class RealtimeModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controllers/auth.controller';
import { DriverController } from './controllers/driver.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { AuthService } from './services/auth.service';
import { LocationService } from './services/location.service';
import { DashboardService } from './services/dashboard.service';

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
  controllers: [AuthController, DriverController, DashboardController],
  providers: [AuthService, LocationService, DashboardService],
})
export class AppModule {}

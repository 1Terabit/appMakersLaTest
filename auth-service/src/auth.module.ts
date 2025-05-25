import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./application/auth.service";
import { AuthController } from "./infrastructure/controllers/auth.controller";
import { InMemoryDriverRepository } from "./infrastructure/repositories/in-memory-driver.repository";
import { getJwtConfig } from "./infrastructure/config/jwt.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: "IDriverRepository",
      useClass: InMemoryDriverRepository,
    },
    {
      provide: "IAuthService",
      useClass: AuthService,
    },
    AuthService,
  ],
  exports: ["IAuthService", AuthService],
})
export class AuthModule {}

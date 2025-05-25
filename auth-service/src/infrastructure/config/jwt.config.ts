import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * JWT configuration factory for the authentication service
 * Provides configuration options for the JWT module including secret and expiration
 *
 * @param configService NestJS config service for accessing environment variables
 * @returns JwtModuleOptions object with configured secret and sign options
 */
export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_SECRET') || 'dev_secret_key',
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRATION') || '300s', // Default 5 minutes
  },
});

import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Configuración del JWT para el servicio de autenticación
 */
export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_SECRET') || 'dev_secret_key',
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRATION') || '300s', // 5 minutos por defecto
  },
});

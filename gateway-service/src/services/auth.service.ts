import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * Login de un conductor
   * @param loginDto Datos de login
   * @returns Token de acceso e información del conductor
   */
  async login(loginDto: LoginDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/login`, loginDto),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Credenciales inválidas');
    }
  }

  /**
   * Valida un token de acceso
   * @param token Token a validar
   * @returns Resultado de la validación
   */
  async validateToken(token: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/validate-token`, { token }),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Obtiene el perfil de un conductor
   * @param driverId ID del conductor
   * @returns Perfil del conductor
   */
  async getDriverProfile(driverId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/auth/profile/${driverId}`),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Get profile error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Error al obtener el perfil del conductor');
    }
  }
}

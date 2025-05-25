import { Driver } from '../../domain/driver.entity';

/**
 * DTO para la respuesta de login
 */
export interface LoginResponseDto {
  token: string;
  driver: Omit<Driver, 'password'>;
}

/**
 * DTO para la validación de token
 */
export interface TokenValidationResult {
  isValid: boolean;
  driverId?: string;
}

/**
 * Puerto de entrada para el servicio de autenticación
 */
export interface IAuthService {
  /**
   * Login de un conductor
   * @param email Email del conductor
   * @param password Contraseña del conductor
   */
  login(email: string, password: string): Promise<LoginResponseDto>;

  /**
   * Valida un token de acceso
   * @param token Token a validar
   */
  validateToken(token: string): Promise<TokenValidationResult>;

  /**
   * Obtiene la información del perfil de un conductor
   * @param driverId ID del conductor
   */
  getDriverProfile(driverId: string): Promise<Omit<Driver, 'password'> | null>;
}

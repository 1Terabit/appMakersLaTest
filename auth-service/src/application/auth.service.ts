import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { IAuthService, LoginResponseDto, TokenValidationResult } from '../ports/in/auth-service.port';
import { IDriverRepository } from '../ports/out/driver-repository.port';
import { Driver } from '../domain/driver.entity';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject('IDriverRepository') private driverRepository: IDriverRepository,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponseDto> {
    const driver = await this.driverRepository.findByEmail(email);

    if (!driver) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hashedPassword = this.hashPassword(password);
    const isPasswordValid = hashedPassword === driver.password;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(driver);
    
    const { password: _, ...driverWithoutPassword } = driver;
    
    return {
      token,
      driver: driverWithoutPassword as Omit<Driver, 'password'>,
    };
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = this.jwtService.verify(token);
      
      const driverExists = await this.driverRepository.findById(payload.sub);
      
      if (!driverExists) {
        return { isValid: false };
      }
      
      return {
        isValid: true,
        driverId: payload.sub,
      };
    } catch (error) {
      return { isValid: false };
    }
  }

  async getDriverProfile(driverId: string): Promise<Omit<Driver, 'password'> | null> {
    const driver = await this.driverRepository.findById(driverId);
    
    if (!driver) {
      return null;
    }
    
    const { password: _, ...driverWithoutPassword } = driver;
    return driverWithoutPassword as Omit<Driver, 'password'>;
  }

  private generateToken(driver: Driver): string {
    const payload = {
      sub: driver.id,
      email: driver.email,
      name: driver.name,
    };
    
    return this.jwtService.sign(payload, { expiresIn: '300s' });
  }

  /**
   * Método simple para hashear contraseñas usando crypto en lugar de bcrypt
   * Esto es temporal, en producción se debería usar bcrypt
   */
  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
}

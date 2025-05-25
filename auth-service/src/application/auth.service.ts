import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { IAuthService, LoginResponseDto, TokenValidationResult } from '../ports/in/auth-service.port';
import { IDriverRepository } from '../ports/out/driver-repository.port';
import { Driver } from '../domain/driver.entity';

/**
 * Authentication service that implements the IAuthService interface
 * Manages authentication, token validation, and driver profiles
 */
@Injectable()
export class AuthService implements IAuthService {
  /**
   * Authentication service constructor
   * @param driverRepository Injected driver repository
   * @param jwtService JWT service for token management
   */
  constructor(
    @Inject('IDriverRepository') private driverRepository: IDriverRepository,
    private jwtService: JwtService,
  ) {}

  /**
   * Authenticates a driver using email and password
   * @param email Driver's email address
   * @param password Driver's password
   * @returns Object with JWT token and authenticated driver data without password
   * @throws UnauthorizedException - If credentials are invalid
   */
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

  /**
   * Validates a JWT token and verifies if the associated driver exists
   * @param token JWT token to validate
   * @returns Object indicating if the token is valid and the associated driver ID
   */
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

  /**
   * Gets a driver's profile by ID, excluding the password field
   * @param driverId Driver's ID
   * @returns Driver profile data without password, or null if not found
   */
  async getDriverProfile(driverId: string): Promise<Omit<Driver, 'password'> | null> {
    const driver = await this.driverRepository.findById(driverId);
    
    if (!driver) {
      return null;
    }
    
    const { password: _, ...driverWithoutPassword } = driver;
    return driverWithoutPassword as Omit<Driver, 'password'>;
  }

  /**
   * Generates a JWT token for an authenticated driver
   * @param driver Driver entity for which to generate the token
   * @returns Signed JWT token with 300 seconds expiration
   * @private Internal service method
   */
  private generateToken(driver: Driver): string {
    const payload = {
      sub: driver.id,
      email: driver.email,
      name: driver.name,
    };
    
    return this.jwtService.sign(payload, { expiresIn: '300s' });
  }

  /**
   * Simple method to hash passwords using crypto instead of bcrypt
   * This is temporary, in production bcrypt should be used
   */
  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
}

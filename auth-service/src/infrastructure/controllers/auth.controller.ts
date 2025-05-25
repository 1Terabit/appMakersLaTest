import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UnauthorizedException } from '@nestjs/common';
import { IAuthService } from '../../ports/in/auth-service.port';
import { LoginDto } from './dtos/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  /**
   * Endpoint to authenticate a driver
   * @param loginDto Login credentials
   * @returns Access token and driver information
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    try {
      return await this.authService.login(loginDto.email, loginDto.password);
    } catch (error) {
      throw new UnauthorizedException('Driver not found');
    }
  }

  /**
   * Endpoint to validate an access token
   * @param token Token to validate
   * @returns Validation result
   */
  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body('token') token: string) {
    const result = await this.authService.validateToken(token);
    
    if (!result.isValid) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    
    return { isValid: true, driverId: result.driverId };
  }

  /**
   * Retrieves a driver's profile by ID
   * @param id Driver ID
   * @returns Driver profile information
   */
  @Get('profile/:id')
  async getDriverProfile(@Param('id') id: string) {
    const profile = await this.authService.getDriverProfile(id);
    
    if (!profile) {
      throw new UnauthorizedException('Driver not found');
    }
    
    return profile;
  }
}

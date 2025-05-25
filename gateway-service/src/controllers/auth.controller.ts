import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';

/**
 * Authentication controller for the Gateway API
 * Provides endpoints for driver authentication, token validation, and profile retrieval
 * Acts as a proxy to the auth-service microservice
 */
@ApiTags('auth')
@Controller('api')
export class AuthController {
  /**
   * Creates an instance of AuthController
   * @param authService Service that handles communication with the auth microservice
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint for driver authentication
   * Validates credentials and returns access token with driver information
   * @param loginDto Login credentials (email and password)
   * @returns Access token and driver information object
   * @throws Unauthorized exception if credentials are invalid
   */
  @ApiOperation({ summary: 'Authenticate driver', description: 'Allows a driver to login and obtain an access token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', schema: {
    properties: {
      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      driver: { 
        type: 'object',
        properties: {
          id: { type: 'string', example: '1' },
          name: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', example: 'juan@example.com' },
          profileImage: { type: 'string', example: 'https://randomuser.me/api/portraits/men/1.jpg' }
        }
      }
    }
  }})
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Endpoint for validating an access token
   * Verifies if the token is valid and returns the associated driver ID
   * @param token JWT token to validate
   * @returns Validation result with isValid flag and driverId if valid
   * @throws Unauthorized exception if token is invalid or expired
   */
  @ApiOperation({ summary: 'Validate token', description: 'Verifies if an access token is valid' })
  @ApiBody({ schema: { properties: { token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } } } })
  @ApiResponse({ status: 200, description: 'Valid token', schema: {
    properties: {
      isValid: { type: 'boolean', example: true },
      driverId: { type: 'string', example: '1' }
    }
  }})
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @Post('validate-token')
  async validateToken(@Body('token') token: string) {
    return this.authService.validateToken(token);
  }

  /**
   * Endpoint for retrieving a driver's profile
   * Gets detailed profile information for a specific driver
   * @param id Driver ID to retrieve profile for
   * @returns Driver profile object with personal information
   * @throws Not found exception if driver doesn't exist
   */
  @ApiOperation({ summary: 'Get driver profile', description: 'Returns profile information for a driver' })
  @ApiParam({ name: 'id', description: 'Driver ID', example: '1' })
  @ApiResponse({ status: 200, description: 'Profile found', schema: {
    properties: {
      id: { type: 'string', example: '1' },
      name: { type: 'string', example: 'Juan Pérez' },
      email: { type: 'string', example: 'juan@example.com' },
      profileImage: { type: 'string', example: 'https://randomuser.me/api/portraits/men/1.jpg' }
    }
  }})
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @Get('driver/:id/profile')
  async getDriverProfile(@Param('id') id: string) {
    return this.authService.getDriverProfile(id);
  }
}

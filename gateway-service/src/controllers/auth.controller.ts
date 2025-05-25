import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';

@ApiTags('auth')
@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint para autenticar a un conductor
   * @param loginDto Datos de login
   * @returns Token de acceso e información del conductor
   */
  @ApiOperation({ summary: 'Autenticar conductor', description: 'Permite a un conductor iniciar sesión y obtener un token de acceso' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso', schema: {
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
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Endpoint para validar un token de acceso
   * @param token Token a validar
   * @returns Resultado de la validación
   */
  @ApiOperation({ summary: 'Validar token', description: 'Verifica si un token de acceso es válido' })
  @ApiBody({ schema: { properties: { token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } } } })
  @ApiResponse({ status: 200, description: 'Token válido', schema: {
    properties: {
      isValid: { type: 'boolean', example: true },
      driverId: { type: 'string', example: '1' }
    }
  }})
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  @Post('validate-token')
  async validateToken(@Body('token') token: string) {
    return this.authService.validateToken(token);
  }

  /**
   * Endpoint para obtener el perfil de un conductor
   * @param id ID del conductor
   * @returns Perfil del conductor
   */
  @ApiOperation({ summary: 'Obtener perfil de conductor', description: 'Devuelve la información de perfil de un conductor' })
  @ApiParam({ name: 'id', description: 'ID del conductor', example: '1' })
  @ApiResponse({ status: 200, description: 'Perfil encontrado', schema: {
    properties: {
      id: { type: 'string', example: '1' },
      name: { type: 'string', example: 'Juan Pérez' },
      email: { type: 'string', example: 'juan@example.com' },
      profileImage: { type: 'string', example: 'https://randomuser.me/api/portraits/men/1.jpg' }
    }
  }})
  @ApiResponse({ status: 401, description: 'Conductor no encontrado' })
  @Get('driver/:id/profile')
  async getDriverProfile(@Param('id') id: string) {
    return this.authService.getDriverProfile(id);
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  
  // Habilitar CORS para permitir peticiones desde otros dominios
  app.enableCors();
  
  // Configurar validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Driver Auth API')
    .setDescription('API para la autenticación de conductores')
    .setVersion('1.0')
    .addTag('auth', 'Endpoints de autenticación')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  await app.listen(3000);
  console.log(`Auth service is running on port 3000`);
  console.log(`Swagger documentation available at http://localhost:3000/docs`);
}

bootstrap();

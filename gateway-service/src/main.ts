import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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
    .setTitle('Driver Location System API')
    .setDescription('API para el sistema de ubicación de conductores en tiempo real')
    .setVersion('1.0')
    .addTag('auth', 'Endpoints de autenticación')
    .addTag('driver', 'Endpoints de conductores')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  await app.listen(3000);
  console.log(`Gateway service is running on port 3000`);
  console.log(`Swagger documentation available at http://localhost:3000/api/docs`);
}

bootstrap();

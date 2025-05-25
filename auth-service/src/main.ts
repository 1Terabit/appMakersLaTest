/**
 * Main entry point for the Authentication Service
 * Initializes the NestJS application with necessary middleware and documentation
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuthModule } from './auth.module';

/**
 * Bootstrap function to initialize and start the NestJS application
 * Configures global pipes, CORS, Swagger documentation, and starts the HTTP server
 */
async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  
  // Enable CORS to allow requests from other domains
  app.enableCors();
  
  // Configure global DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Configure Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Driver Auth API')
    .setDescription('API for driver authentication')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  await app.listen(3000);
  console.log(`Auth service is running on port 3001`);
  console.log(`Swagger documentation available at http://localhost:3001/docs`);
}

bootstrap();

/**
 * Main entry point for the Location Service
 * Initializes the NestJS application with necessary middleware
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { LocationModule } from './location.module';

/**
 * Bootstrap function to initialize and start the NestJS application
 * Configures global pipes, CORS, and starts the HTTP server
 */
async function bootstrap() {
  const app = await NestFactory.create(LocationModule);
  
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
  
  await app.listen(3002);
  const serverUrl = await app.getUrl();
  console.log(`Location service is running on: ${serverUrl}`);
  console.log(`Swagger documentation available at: ${serverUrl}/api/docs`);
}

bootstrap();

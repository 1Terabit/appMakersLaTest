import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Bootstrap function for the Gateway Service
 * Initializes the NestJS application with required middleware and configuration
 * Sets up global validation, CORS, and Swagger documentation
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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
  
  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Driver Location System API')
    .setDescription('API for the real-time driver location system')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('driver', 'Driver location endpoints')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  await app.listen(3000);
  console.log(`Gateway service is running on port 3000`);
  console.log(`Swagger documentation available at http://localhost:3000/api/docs`);
}

bootstrap();

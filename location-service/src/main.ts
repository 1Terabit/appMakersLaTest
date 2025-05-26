/**
 * Main entry point for the Location Service
 * Initializes the NestJS application with necessary middleware
 */
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { LocationModule } from "./location.module";
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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
    })
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Location Service API')
    .setDescription('API for managing driver location data')
    .setVersion('1.0')
    .addTag('location')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`Location service is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();

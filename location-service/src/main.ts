/**
 * Main entry point for the Location Service
 * Initializes the NestJS application with necessary middleware
 */
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { LocationModule } from "./location.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

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
    .setTitle("Location Service API")
    .setDescription("API for managing driver location data")
    .setVersion("1.0")
    .addTag("location")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(3000);
  console.log(`Location service is running on port 3002`);
  console.log(
    `Swagger documentation available at http://localhost:3002/api/docs`
  );
}

bootstrap();

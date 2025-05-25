import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { LocationModule } from './location.module';

async function bootstrap() {
  const app = await NestFactory.create(LocationModule);
  
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
  
  await app.listen(3000);
  console.log(`Location service is running on port 3000`);
}

bootstrap();

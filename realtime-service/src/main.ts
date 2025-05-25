import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { RealtimeModule } from './realtime.module';

async function bootstrap() {
  const logger = new Logger('RealtimeService');
  const app = await NestFactory.create(RealtimeModule);
  
  // Habilitar CORS para permitir peticiones desde otros dominios
  app.enableCors();
  
  await app.listen(3003);
  logger.log(`Realtime service is running on port 3003`);
}

bootstrap();

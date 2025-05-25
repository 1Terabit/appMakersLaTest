import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { RealtimeModule } from './realtime.module';

/**
 * Bootstrap function for the Realtime Service
 * Initializes the NestJS application with required middleware
 * Starts the HTTP server on port 3003
 */
async function bootstrap() {
  const logger = new Logger('RealtimeService');
  const app = await NestFactory.create(RealtimeModule);
  
  // Enable CORS to allow requests from other domains
  app.enableCors();
  
  await app.listen(3003);
  logger.log(`Realtime service is running on port 3003`);
}

bootstrap();

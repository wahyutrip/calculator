import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap() {
  // Validate BEFORE creating the app, so a misconfiguration fails at startup with
  // a readable message rather than on the first request.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  app.enableCors({ origin: env.CORS_ORIGIN.split(','), credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');
  Logger.log(`API listening on http://0.0.0.0:${env.PORT} (health: /health)`, 'Bootstrap');
}

void bootstrap();

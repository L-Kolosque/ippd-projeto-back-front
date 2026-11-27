import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.getHttpAdapter().getInstance().use(express.static(join(process.cwd(), 'frontend')));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

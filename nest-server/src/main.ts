import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Serve static files from the frontend's dist directory
  app.use('/', express.static(join(__dirname, '..', '..', 'react-fe', 'dist')));

  await app.listen(3000);
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/', express.static(join(__dirname, '..', '..', 'react-fe', 'dist')));

  app.use('/api', (req, res, next) => {
    next();
  });

  await app.listen(4171);
}

bootstrap();

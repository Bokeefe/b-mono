import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Serve static files but exclude /api routes
  app.use(
    /^(?!\/api)/,
    express.static(join(__dirname, '..', '..', 'react-fe', 'dist')),
  );

  // Handle React Router routes but exclude /api routes
  app.use(/^(?!\/api).*/, (req, res) => {
    res.sendFile(join(__dirname, '..', '..', 'react-fe', 'dist', 'index.html'));
  });

  await app.listen(4171, '0.0.0.0');
}

bootstrap();

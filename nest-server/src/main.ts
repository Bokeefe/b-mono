import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Serve static files but exclude /api, /socket.io, and /backup routes
  app.use((req, res, next) => {
    const path = req.path;
    // Skip middleware for /api, /socket.io, and /backup routes - let NestJS handle them
    if (path.startsWith('/api') || path.startsWith('/socket.io') || path.startsWith('/backup')) {
      return next();
    }
    express.static(join(__dirname, '..', '..', 'react-fe', 'dist'))(req, res, next);
  });

  // Handle React Router routes but exclude /api, /socket.io, and /backup routes
  app.use((req, res, next) => {
    const path = req.path;
    // Skip for /api, /socket.io, and /backup routes - let NestJS handle them
    if (path.startsWith('/api') || path.startsWith('/socket.io') || path.startsWith('/backup')) {
      return next();
    }
    res.sendFile(join(__dirname, '..', '..', 'react-fe', 'dist', 'index.html'));
  });

  await app.listen(4171, '0.0.0.0');
}

bootstrap();

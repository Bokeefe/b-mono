import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve static files from the nest-server/public folder (covers /audio/... automatically)
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Handle React Router routes but exclude /api, /audio, /socket.io, and /backup routes
  app.use((req, res, next) => {
    const path = req.path;
    if (
      path.startsWith('/api') ||
      path.startsWith('/audio') ||
      path.startsWith('/socket.io') ||
      path.startsWith('/backup')
    ) {
      return next();
    }
    res.sendFile(join(__dirname, '..', '..', 'react-fe', 'dist', 'index.html'));
  });

  await app.listen(4171, '0.0.0.0');
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

// Requests with these prefixes belong to the backend (or to real files) and must
// never be answered with the React index.html shell.
const BACKEND_ROUTE_PREFIXES = [
  '/api',
  '/audio',
  '/assets',
  '/socket.io',
  '/backup',
];

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

  // Serve the React build (hashed JS/CSS chunks, fonts, images). This app sits
  // behind nginx in production and nginx forwards / to port 4171, so Express is
  // the process that actually has to hand out /assets/*.
  const reactDist = join(__dirname, '..', '..', 'react-fe', 'dist');
  app.use(express.static(reactDist));

  // Handle React Router routes but exclude /api, /audio, /assets, /socket.io and /backup.
  // Falling back to index.html for a missing /assets/* file makes the browser
  // reject the response ("disallowed MIME type text/html"), so those 404 instead.
  app.use((req, res, next) => {
    const path = req.path;
    if (BACKEND_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next();
    }
    res.sendFile(join(reactDist, 'index.html'));
  });

  await app.listen(4171, '0.0.0.0');
}

bootstrap();

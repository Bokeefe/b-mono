import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as express from 'express';
import compression = require('compression');
import { join, normalize, sep } from 'path';

// Requests with these prefixes belong to the backend (or to real files) and must
// never be answered with the React index.html shell.
const BACKEND_ROUTE_PREFIXES = [
  '/api',
  '/audio',
  '/assets',
  '/socket.io',
  '/backup',
];

// Live rooms are user-generated and endless. The client also emits a noindex
// meta tag; this header covers crawlers that never execute JavaScript.
const NOINDEX_ROUTE_PREFIXES = ['/room/', '/text-corpse/'];

// Routes that are rendered by the SPA only (no prerendered HTML file): they get
// the shell and a noindex header.
const DYNAMIC_ROUTE_PATTERNS = [/^\/room\/[^/]+$/, /^\/text-corpse\/[^/]+$/];

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // gzip/brotli: the 800 kB JS bundle and the JSON API responses are highly
  // compressible, and nginx is not always in front of this process (dev, direct
  // port access, health checks).
  app.use(compression());

  // Serve static files from the nest-server/public folder (covers /audio/... automatically)
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Serve the React build. This app sits behind nginx in production and nginx
  // forwards / to port 4171, so Express is the process that actually has to
  // hand out /assets/*.
  const reactDist = join(__dirname, '..', '..', 'react-fe', 'dist');

  // Vite writes content-hashed filenames here, so they can be cached forever.
  app.use(
    '/assets',
    express.static(join(reactDist, 'assets'), {
      immutable: true,
      maxAge: '1y',
    }),
  );

  // Everything else in dist: robots.txt, sitemap.xml, og-image.jpg, fonts, audio.
  // `index: false` keeps `/about` from being 301-redirected to `/about/`, which
  // would fight the canonical URLs.
  app.use(
    express.static(reactDist, {
      index: false,
      redirect: false,
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  // Hand out the prerendered HTML for app routes: /about -> dist/about/index.html.
  // Anything that is not a real file gets a real 404 (status + 404.html) instead
  // of a 200 shell, so search engines do not index an infinite set of soft 404s.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(req.path).replace(/\/+$/, '') || '/';
    } catch {
      return res.status(400).send('Bad request');
    }

    if (BACKEND_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
      return next();
    }

    // One URL per page: `/about/` and `/about` must not both return 200.
    // (Runs after the backend-prefix check so /socket.io polling is untouched.)
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, `${pathname}${query}`);
    }

    if (NOINDEX_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    // Live rooms and games have no prerendered file: serve the shell so the
    // client can mount, but never let them into an index.
    if (DYNAMIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname))) {
      return res.sendFile(join(reactDist, 'index.html'));
    }

    const relative = pathname === '/' ? 'index.html' : join(pathname, 'index.html');
    const file = normalize(join(reactDist, relative));

    // Path traversal guard for the `..` in a crafted URL.
    if (!file.startsWith(reactDist + sep)) {
      return next();
    }

    // HTML must revalidate every time: hashed assets are cached forever, the
    // documents that reference them are not.
    res.setHeader('Cache-Control', 'no-cache');

    res.sendFile(file, (error) => {
      if (!error) {
        return;
      }
      res.status(404).sendFile(join(reactDist, '404.html'));
    });
  });

  await app.listen(4171, '0.0.0.0');
}

bootstrap();

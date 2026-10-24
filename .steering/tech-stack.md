# Tech Stack

## Languages / runtimes

- **TypeScript** everywhere (frontend, backend, shared models) — **^6.0.3**.
- **Node.js**: `.nvmrc` = `26.12.1`; Docker images use `node:26.12.1` (build) /
  `node:26.12.1-alpine` (prod); CI uses `actions/setup-node@v4` with
  `node-version-file: .nvmrc`. Every `package.json` declares
  `"engines": { "node": "^26.12.1", "npm": ">=11" }`.
- **SCSS** + plain **CSS** for styling (no Tailwind in actual use — `tailwindcss`
  is only a devDependency, unused in components).

## Frontend — `react-fe/` (package name is `"ls"`, odd but harmless)

| Concern | Choice | Version | Notes |
|---------|--------|---------|-------|
| UI framework | React | ^18.2 | deliberately held back from 19 (out of scope of the Node 26 upgrade) |
| Build tool | Vite | ^7.3 | `@vitejs/plugin-react` ^5.2 |
| Routing | react-router-dom | ^6.20 | `BrowserRouter` in `App.tsx` |
| Component lib | `@mui/material` + `@mui/icons-material` | ^6.3 | Used in Header, Resume |
| Styling | `@emotion/*`, `styled-components`, SCSS | — | Emotion/SC are MUI peers |
| HTTP | `fetch` (native) + `axios` | axios ^1.7 | fetch used in services; axios in Examples |
| Realtime | `socket.io-client` | ^4.8 | polling-only in prod |
| Audio | `pizzicato` (Web Audio FX), HTML5 `<audio>` | ^0.6 | see SloMo gotchas |
| PDF / print | `jspdf`, `react-to-print` | ^2.5 / ^3.0 | Resume export |
| Shared types | `@b-mono/models` | `file:../models` | requires `models/` built |
| Prerender / SEO | `src/entry-server.tsx` + `scripts/prerender.mjs` | Vite SSR | `renderToString` + `StaticRouter` + `@emotion/server`; metadata in `src/seo/routes.ts` |
| Images / fonts | WebP + WOFF2 | — | `cwebp` / `fonttools` converted once; source PNG/JPG/TTF stay on disk |
| Lighthouse | `@lhci/cli` (CI only) | 0.14 | `.github/workflows/lighthouse.yml` + `lighthouserc.json` |

Frontend scripts (`react-fe/package.json`):
`dev` (vite), `build` (`tsc && vite build && node scripts/prerender.mjs`),
`prerender` (reruns only the prerender), `preview`, `lint`, `test` (jest),
`sass` (`sass src:dist`).

Config: `vite.config.ts` (host 0.0.0.0, port 5173), `tsconfig.json` (ES2020 lib,
bundler resolution, strict). Browser code must use `ReturnType<typeof setTimeout>`
rather than `NodeJS.Timeout` — TS 6 does not inject `@types/node` here.

## Backend — `nest-server/`

| Concern | Choice | Version | Notes |
|---------|--------|---------|-------|
| Framework | NestJS | ^12.2 | **ESM-only** (`"type": "module"`); the CJS build runs via Node's native `require(esm)` |
| Realtime | `@nestjs/websockets` + `platform-socket.io` | ^12.2 | |
| Web server | Express (via Nest platform) | 5.x through Nest 12 | |
| Fake data | `@faker-js/faker` | ^10.6 | Faker module |
| Reactive | `rxjs` | ^7.8 | Nest peer |
| Decorators | `reflect-metadata` | ^0.2 | |

Backend scripts (`nest-server/package.json`):
`build` (nest build), `start:dev` (watch), `start:prod` (`node dist/main`),
`test`/`test:cov`/`test:e2e` (jest), `lint`, `format`.
`nest-cli.json` copies `**/*.json` assets into `dist/` (so `text-corpse.data.json`
ships with the build).

Config: `nest-server/tsconfig.json` (module `commonjs`, target ES2023,
`rootDir: ./src`, `types: ["node", "jest"]`, `strictNullChecks: false`,
decorators enabled). Jest must run with `--experimental-vm-modules` (the scripts
already do) so `require()` can load ESM-only Nest 12 packages.

## Shared models — `models/`

Plain TS interfaces (`Room`, `Suggestion`, `ActiveRoom`). Built with `tsc`
(TypeScript ^6.0.3, target ES2022) to `dist/`, published as `@b-mono/models`.
`prepare` script builds on install.
**The frontend cannot type-check until `models` is built.**

## Infrastructure / tooling

| Concern | Choice |
|---------|--------|
| Containerization | **Docker** (multi-stage: `node:26.12.1` build → `node:26.12.1-alpine` + nginx + certbot) |
| Static serving (prod) | **nginx** inside the container, proxies `/api` + `/socket.io` to `localhost:4171` |
| TLS | Let's Encrypt via **certbot** (certs on droplet at `/etc/ssl/antigogglin`) |
| CDN / proxy | **Cloudflare** (forces polling-only Socket.IO — see gotchas) |
| Hosting | **DigitalOcean** droplet `b-mono-new` (137.184.190.9) |
| Registry | **Docker Hub** `bokeefe96/b-mono-image:latest` |
| CI/CD | **GitHub Actions** (`.github/workflows/ci.yml`, `cd.yml`) |
| Orchestration (local) | `concurrently` at root for `npm run dev` |

## Root scripts (`package.json`)

- `dev` → run backend + frontend concurrently
- `dev:backend` / `dev:frontend`
- `install:all` → install root + nest-server + react-fe
- `build` → build backend then frontend
- `start` → run backend prod
- `docker:test` → build image, run locally on 4171/80

> The root `package.json` lists a very large, explicit `dependencies` block
> (hundreds of transitive packages). Treat it as accidental `npm install`
> spillover, not a curated manifest. Real direct deps live in each package.

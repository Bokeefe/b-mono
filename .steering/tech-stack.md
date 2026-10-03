# Tech Stack

## Languages / runtimes

- **TypeScript** everywhere (frontend, backend, shared models).
- **Node.js**: Docker images use `node:20` (build) / `node:20-alpine` (prod).
  `react-fe/package.json` declares `"engines": { "node": "18.x" }` (stale — the
  container is Node 20).
- **SCSS** + plain **CSS** for styling (no Tailwind in actual use — `tailwindcss`
  is only a devDependency, unused in components).

## Frontend — `react-fe/` (package name is `"ls"`, odd but harmless)

| Concern | Choice | Version | Notes |
|---------|--------|---------|-------|
| UI framework | React | ^18.2 | |
| Build tool | Vite | ^5.0 | `@vitejs/plugin-react` |
| Routing | react-router-dom | ^6.20 | `BrowserRouter` in `App.tsx` |
| Component lib | `@mui/material` + `@mui/icons-material` | ^6.3 | Used in Header, Resume |
| Styling | `@emotion/*`, `styled-components`, SCSS | — | Emotion/SC are MUI peers |
| HTTP | `fetch` (native) + `axios` | axios ^1.7 | fetch used in services; axios in Examples |
| Realtime | `socket.io-client` | ^4.8 | polling-only in prod |
| Audio | `pizzicato` (Web Audio FX), HTML5 `<audio>` | ^0.6 | see SloMo gotchas |
| PDF / print | `jspdf`, `react-to-print` | ^2.5 / ^3.0 | Resume export |
| Shared types | `@b-mono/models` | `file:../models` | requires `models/` built |

Frontend scripts (`react-fe/package.json`):
`dev` (vite), `build` (`tsc && vite build`), `preview`, `lint`, `test` (jest),
`sass` (`sass src:dist`).

Config: `vite.config.ts` (host 0.0.0.0, port 5173), `tsconfig.json` (ES2020,
bundler resolution, strict).

## Backend — `nest-server/`

| Concern | Choice | Version | Notes |
|---------|--------|---------|-------|
| Framework | NestJS | ^10 | `@nestjs/common`, `core`, `platform-express` |
| Realtime | `@nestjs/websockets` + `platform-socket.io` | ^10.4 | |
| Web server | Express (via Nest platform) | — | |
| Fake data | `@faker-js/faker` | ^9.3 | Faker module |
| Reactive | `rxjs` | ^7.8 | Nest peer |
| Decorators | `reflect-metadata` | ^0.2 | |

Backend scripts (`nest-server/package.json`):
`build` (nest build), `start:dev` (watch), `start:prod` (`node dist/main`),
`test`/`test:cov`/`test:e2e` (jest), `lint`, `format`.
`nest-cli.json` copies `**/*.json` assets into `dist/` (so `text-corpse.data.json`
ships with the build).

Config: `nest-server/tsconfig.json` (module `commonjs`, target ES2021,
`strictNullChecks: false`, decorators enabled).

## Shared models — `models/`

Plain TS interfaces (`Room`, `Suggestion`, `ActiveRoom`). Built with `tsc` to
`dist/` published as `@b-mono/models`. `prepare` script builds on install.
**The frontend cannot type-check until `models` is built.**

## Infrastructure / tooling

| Concern | Choice |
|---------|--------|
| Containerization | **Docker** (multi-stage: `node:20` build → `node:20-alpine` + nginx + certbot) |
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

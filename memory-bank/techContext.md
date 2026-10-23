# Tech Context — b-mono

## Runtimes & languages

- **TypeScript** for everything (backend, frontend, shared models).
- **Node 20** in Docker (`node:20` build stage, `node:20-alpine` runtime).
  `react-fe/package.json` still declares `"engines": { "node": "18.x" }` — stale.
- **SCSS + plain CSS** for styling. `tailwindcss`/`postcss`/`autoprefixer` are
  installed but unused; don't write Tailwind classes.

## Frontend — `react-fe/` (package name `"ls"`)

| Concern | Choice | Version |
|---------|--------|---------|
| Framework | React | ^18.2 |
| Build | Vite + `@vitejs/plugin-react` | ^5.0 / ^4.2 |
| Routing | react-router-dom (`BrowserRouter`) | ^6.20 |
| UI kit | `@mui/material`, `@mui/icons-material` | ^6.3 |
| Icons | Font Awesome — `@fortawesome/react-fontawesome`, `free-solid-svg-icons`, `fontawesome-svg-core` (added Oct 2026, used in Claimjumpers) | ^3.5 / ^7.3 |
| Styling | SCSS, `styled-components`, `@emotion/*` | — |
| HTTP | native `fetch` (services) + `axios` (legacy examples) | axios ^1.7 |
| Realtime | `socket.io-client` | ^4.8 |
| Audio FX | `pizzicato` + HTML5 `<audio>` | ^0.6 |
| Export | `jspdf`, `react-to-print` | ^2.5 / ^3.0 |
| Shared types | `@b-mono/models` (`file:../models`) | 1.0.0 |
| Tests | jest + Testing Library + jsdom | ^29 / ^14 |

Scripts: `dev` (vite), `build` (`tsc && vite build`), `preview`, `lint`,
`test`, `sass`. Config: `vite.config.ts` (host `0.0.0.0`, port 5173),
`tsconfig.json` (ES2020, `bundler` resolution, strict).

## Backend — `nest-server/`

| Concern | Choice | Version |
|---------|--------|---------|
| Framework | NestJS (`common`, `core`, `platform-express`) | ^10 |
| Realtime | `@nestjs/websockets` + `@nestjs/platform-socket.io`, `socket.io` | ^10.4 / ^4.8 |
| Web server | Express under Nest | ^4.18 (root) |
| Fake data | `@faker-js/faker` | ^9.3 |
| Reactive | `rxjs` (Nest peer) | ^7.8 |
| Decorators | `reflect-metadata` | ^0.2 |
| Tests | jest + ts-jest + supertest | ^29 / ^7 |

Scripts: `build` (`nest build`), `start:dev` (watch), `start:prod`
(`node dist/main`), `test`, `test:cov`, `test:e2e`, `lint`, `format`.
`nest-cli.json` copies `**/*.json` into `dist/`, which is how
`text-corpse.data.json` ships with the build.

Config: `tsconfig.json` — module `commonjs`, target ES2021,
`strictNullChecks: false`, decorators enabled.

## Shared models — `models/`

Plain TS interfaces only:
`Room` (incl. `winner: Suggestion | null`, `completedAt: number | null`),
`Suggestion`, `ActiveRoom`. Built with `tsc` → `dist/`, published as
`@b-mono/models`; `prepare` builds on install.

**The frontend cannot type-check until `models` is built.**

## Infrastructure

| Concern | Choice |
|---------|--------|
| Container | Multi-stage root `Dockerfile`: `node:20` build → `node:20-alpine` + **nginx + certbot** |
| Static serving (prod) | nginx serves `react-fe/dist`, proxies `/api/` and `/socket.io` to `localhost:4171` |
| TLS | Let's Encrypt via certbot; certs at `/etc/ssl/antigogglin/{public,private}.pem` |
| CDN / proxy | **Cloudflare** → forces polling-only Socket.IO |
| Host | DigitalOcean droplet `b-mono-new` — `137.184.190.9`, sfo3, 512MB / 1 vCPU, Ubuntu 24.10 |
| Registry | Docker Hub `bokeefe96/b-mono-image:latest` |
| CI/CD | GitHub Actions — `.github/workflows/ci.yml`, `cd.yml` |
| Local orchestration | `concurrently` at root |
| Persistence | Host volume `/root/text-corpse-data` → `/usr/src/app/data` |

## Root scripts

```bash
npm run install:all    # root + nest-server + react-fe
npm run dev            # concurrently: backend :4171 + frontend :5173
npm run dev:backend    # cd nest-server && npm run start:dev
npm run dev:frontend   # cd react-fe && npm run dev
npm run build          # backend, then frontend (does NOT build models)
npm run start          # node dist/main (backend prod)
npm run docker:test    # docker build -t b-mono-image . && run on 4171/80
```

> Root `dependencies` lists **hundreds of transitive packages**. Treat it as
> accidental `npm install` spillover; real manifests are the per-package ones.

## Environment variables (backend)

| Var | Effect |
|-----|--------|
| `NODE_ENV=production` | `TextCorpseService` writes to `TEXT_CORPSE_DATA_DIR` (default `/usr/src/app/data`) |
| `TEXT_CORPSE_DATA_DIR` | Override the text-corpse data directory |
| `UNIVERSAL_CELL_UNLOCK` | Password required by `GET /backup` |
| `DOMAIN` | Passed to the container in CD (nginx/certbot domain) |

Frontend has **no** `VITE_*` env usage; dev/prod is chosen inside
`react-fe/src/environment.ts` via `import.meta.env.MODE`, exporting `baseUrl`.

## Development setup

```bash
npm run install:all
cd models && npm run build && cd ..     # REQUIRED before frontend typecheck
npm run dev
```

- API: http://localhost:4171/api
- Health: http://localhost:4171/api/health
- Frontend: http://localhost:5173
- **Fix `react-fe/src/environment.ts` first** — dev `api.url` is a hardcoded LAN
  IP (`http://10.210.155.132`). Change to `http://localhost`.

## Tooling notes / constraints

- `.eslintrc.cjs` at root; `nest-server/.eslintrc.js` + `.prettierrc` in backend.
- `jest` config for the backend lives inline in `nest-server/package.json`
  (`rootDir: src`, `.spec.ts`); e2e config at `nest-server/test/jest-e2e.json`.
- Specs that exist today: `app.controller.spec.ts`, `faker.controller.spec.ts`,
  `faker.service.spec.ts`. There is **no** frontend test suite despite `jest`
  being configured.
- Local AI workflow: LM Studio OpenAI-compatible server on port 1234
  (`lms server start --port 1234 --cors`), typically
  `qwen2.5-coder-7b-instruct`.

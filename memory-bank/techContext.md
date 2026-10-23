# Tech Context — b-mono

## Runtimes & languages

- **TypeScript** for everything (backend, frontend, shared models) — **^6.0.3**
  repo-wide (required: `@nestjs/schematics@12` / Nest CLI 12 need TS ≥6).
- **Node 26.12.1** everywhere: `.nvmrc` holds `26.12.1`, Docker stages use
  `node:26.12.1` / `node:26.12.1-alpine`, CI reads `node-version-file: .nvmrc`,
  and all four `package.json` files declare
  `"engines": { "node": "^26.12.1", "npm": ">=11" }`.
- **SCSS + plain CSS** for styling. `tailwindcss`/`postcss`/`autoprefixer` are
  installed but unused; don't write Tailwind classes.

## Frontend — `react-fe/` (package name `"ls"`)

| Concern | Choice | Version |
|---------|--------|---------|
| Framework | React (deliberately **not** bumped to 19) | ^18.2 |
| Build | Vite + `@vitejs/plugin-react` | ^7.3 / ^5.2 |
| Routing | react-router-dom (`BrowserRouter`) | ^6.20 |
| UI kit | `@mui/material`, `@mui/icons-material` | ^6.3 |
| Icons | Font Awesome — `@fortawesome/react-fontawesome`, `free-solid-svg-icons`, `fontawesome-svg-core` (added Oct 2026, used in Claimjumpers) | ^3.5 / ^7.3 |
| Styling | SCSS, `styled-components`, `@emotion/*` | — |
| HTTP | native `fetch` (services) + `axios` (legacy examples) | axios ^1.7 |
| Realtime | `socket.io-client` | ^4.8 |
| Audio FX | `pizzicato` + HTML5 `<audio>` | ^0.6 |
| Export | `jspdf`, `react-to-print` | ^2.5 / ^3.0 |
| Shared types | `@b-mono/models` (`file:../models`) | 1.0.0 |
| Tests | jest + Testing Library + jsdom | ^30 / ^16.3 / ^30 |

Scripts: `dev` (vite), `build` (`tsc && vite build`), `preview`, `lint`,
`test`, `sass`. Config: `vite.config.ts` (host `0.0.0.0`, port 5173),
`tsconfig.json` (ES2020, `bundler` resolution, strict).

## Backend — `nest-server/`

| Concern | Choice | Version |
|---------|--------|---------|
| Framework | NestJS (`common`, `core`, `platform-express`) — **ESM-only** | ^12.2 |
| Realtime | `@nestjs/websockets` + `@nestjs/platform-socket.io`, `socket.io` | ^12.2 / ^4.8 |
| Web server | Express under Nest | ^5 (via Nest 12) |
| Fake data | `@faker-js/faker` | ^10.6 |
| Reactive | `rxjs` (Nest peer) | ^7.8 |
| Decorators | `reflect-metadata` | ^0.2 |
| Tests | jest + ts-jest + supertest | ^30 / ^29.4 / ^7.3 |

Scripts: `build` (`nest build`), `start:dev` (watch), `start:prod`
(`node dist/main`), `test`, `test:cov`, `test:e2e`, `lint`, `format`.
`test*` scripts run `node --experimental-vm-modules node_modules/jest/bin/jest.js`
(see gotchas — Nest 12 is ESM-only). `nest-cli.json` copies `**/*.json` into
`dist/`, which is how `text-corpse.data.json` ships with the build.

Config: `tsconfig.json` — module `commonjs`, target **ES2023**, `rootDir: ./src`,
`strictNullChecks: false`, decorators enabled, `types: ["node", "jest"]`
(TS 6 no longer auto-includes every `@types/*` package).

## Shared models — `models/`

Plain TS interfaces only:
`Room` (incl. `winner: Suggestion | null`, `completedAt: number | null`),
`Suggestion`, `ActiveRoom`. Built with `tsc` (TypeScript ^6.0.3, target
**ES2022**) → `dist/`, published as `@b-mono/models`; `prepare` builds on install.

**The frontend cannot type-check until `models` is built.**

## Infrastructure

| Concern | Choice |
|---------|--------|
| Container | Multi-stage root `Dockerfile`: `node:26.12.1` build → `node:26.12.1-alpine` + **nginx + certbot** (prod stage uses `npm ci --omit=dev`) |
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
  **ESLint stays on 8.57.1 on purpose** — the config is legacy `.eslintrc`, ESLint
  10 would need a flat-config migration.
- `jest` config for the backend lives inline in `nest-server/package.json`
  (`rootDir: src`, `.spec.ts`); e2e config at `nest-server/test/jest-e2e.json`.
- Specs: `app.controller.spec.ts`, `faker.controller.spec.ts`,
  `faker.service.spec.ts` — **6 tests, all green** on jest 30 + Node 26
  (run with `node --experimental-vm-modules`, required for `require()` of the
  ESM-only Nest 12 packages). There is **no** frontend test suite despite `jest`
  being configured.
- `tsc` under TS 6 has no default `@types` injection: a package/tsconfig that
  uses `NodeJS.*`, `process`, or jest globals must list them in `types`.
- Local AI workflow: LM Studio OpenAI-compatible server on port 1234
  (`lms server start --port 1234 --cors`), typically
  `qwen2.5-coder-7b-instruct`.

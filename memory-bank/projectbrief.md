# Project Brief — b-mono

> Foundation document. Everything else in `memory-bank/` derives from this.

## Identity

| Field | Value |
|-------|-------|
| Repo | `b-mono` (root `package.json` name: `b-mono`, version `1.0.1`) |
| Remote | `https://github.com/Bokeefe/b-mono` |
| Author | Brendan O'Keefe |
| Local path | `/Users/crenshawbarelywater/repos/b-mono` |
| Live site | https://antigogglin.org (SPA title: "BVerse") |
| Current branch at init | `feature/new` @ `53134a1` ("fixes for lunch app") |

## What this is

A **personal monorepo** that stores all of the author's app ideas, side projects,
portfolio pages, and resume examples in one deployable web app. It is explicitly
*not* a single-purpose product: it is a shell that hosts several small,
mostly-independent mini-apps ("domains") behind one React router and one NestJS
backend.

## Scope

### In scope
- One deployable Docker image serving a React SPA + NestJS API + Socket.IO gateways.
- Small, self-contained mini-apps that can be added one at a time.
- Resume/portfolio presentation (a core original purpose of the repo).
- Zero-database operation: state is in-memory or a single JSON file.

### Out of scope (deliberate)
- Multi-tenant auth, user accounts, or RBAC.
- A relational database / ORM.
- A design-system package or component library of its own.
- Microservice decomposition — everything ships as one container.

## Packages

| Path | Role |
|------|------|
| `/` (root) | Orchestrator: cross-package npm scripts + the **authoritative** production `Dockerfile` |
| `nest-server/` | NestJS 10 backend: REST API + Socket.IO gateways, also serves the built SPA (`:4171`) |
| `react-fe/` | React 18 + Vite 5 SPA (`:5173` in dev, package name is `"ls"`) |
| `models/` | `@b-mono/models` — shared TS interfaces (`Room`, `Suggestion`, `ActiveRoom`) compiled to `dist/` |
| `nest-server/public/` | Runtime static assets served at `/audio/...` (Claimjumpers MP3s) |
| `react-fe/public/audio/slomo/genres/` | SloMo MP3 library (genre folders) |
| `deps/`, `usr/` | Vestigial / data-mount scaffolding — ignore |

## Goals

1. **Keep adding mini-apps cheaply.** Adding a feature should be: backend module →
   optional shared type → frontend page → `<Route>` → Home button.
2. **One-command dev loop.** `npm run dev` runs backend + frontend together.
3. **One-image deploy.** CI builds the root Dockerfile, pushes to Docker Hub, CD
   recreates the container on the droplet.
4. **Work offline-first.** The author codes with local models via LM Studio, so
   the repo carries dense context docs (`.steering/`, this `memory-bank/`).

## Success criteria

- `npm run dev` boots both services with no manual steps after `npm run install:all`.
- Push to `main` / `feature/*` produces a running container at antigogglin.org with
  *no* manual SSH intervention (known weak point — see `progress.md`).
- TextCorpse data survives container replacement via the host volume.

## Constraints that shape everything

- **No database.** Lunch state dies with the process; TextCorpse is one JSON file.
- **Cloudflare in front of nginx in front of Node** forces Socket.IO
  `transports: ['polling']`.
- **Tiny droplet** (512MB RAM / 1 vCPU) — keep images and runtime lean.
- **Build order matters:** `models` → `nest-server` → `react-fe`.

## Key documentation map

| File | Contents |
|------|----------|
| `README.md` | Setup + production infra commands |
| `DEPLOYMENT.local.md` | Secrets/infra detail (not git-tracked) |
| `PIPELINE_ISSUES.md` | CD troubleshooting log — **append-only** |
| `.steering/*.md` | Agent knowledge base (architecture, domains, gotchas) |
| `memory-bank/` | This persistent context set |

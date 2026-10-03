# `.steering/` — Agent Knowledge Base

Context files for AI coding agents (optimized for local models on a laptop).
Read these **before** touching code. They describe *what this is*, *where things
live*, and *how to run it* so you don't have to rediscover the repo.

## Read in this order

| # | File | What it answers |
|---|------|-----------------|
| 1 | [`big-picture.md`](./big-picture.md) | What is this app? What are its parts? |
| 2 | [`tech-stack.md`](./tech-stack.md) | Languages, frameworks, libraries, versions |
| 3 | [`architecture.md`](./architecture.md) | Folder map, how a request/socket flows, how to add a feature |
| 4 | [`domains.md`](./domains.md) | Each feature (Lunch, TextCorpse, SloMo…) front→back |
| 5 | [`dev-and-deploy.md`](./dev-and-deploy.md) | Commands, ports, env, Docker, CI/CD |
| 6 | [`gotchas.md`](./gotchas.md) | Traps, bugs, non-obvious behavior |

## 60-second quick start

```bash
# from repo root — install everything (root + nest-server + react-fe)
npm run install:all
# NOTE: models/ must be built before react-fe type-checks (it imports @b-mono/models)
cd models && npm run build && cd ..

# run backend (:4171) + frontend (:5173) together
npm run dev

# or separately
npm run dev:backend     # nest-server, watch mode, http://localhost:4171
npm run dev:frontend    # react-fe, Vite,        http://localhost:5173
```

- API base (dev): `http://localhost:4171/api` (see `react-fe/src/environment.ts`)
- Health check: `http://localhost:4171/api/health`
- **Before testing the frontend locally**, fix the hardcoded dev IP in
  `react-fe/src/environment.ts` (see [`gotchas.md`](./gotchas.md)).

## Repo in one sentence

A personal "exegesis" monorepo: a **NestJS** backend (`nest-server/`) that serves
both an HTTP API and **Socket.IO** gateways, and a **React + Vite** SPA
(`react-fe/`) that hosts several independent mini-apps (lunch voting, a
collaborative writing game, a music player, portfolio pages). Deployed as one
Docker image (nginx + Node) to a DigitalOcean droplet behind Cloudflare.

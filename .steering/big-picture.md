# Big Picture

## What this project is

`b-mono` ("Brendan's exegesis monorepo") is a **personal monorepo** collecting
side projects, portfolio pages, and resume examples. It is one deployable web
app served at **antigogglin.org** (Vite SPA title: "BVerse").

It is **not** a product with a single purpose. It is a container for several
small, mostly-independent features ("domains") that share one backend and one
React shell.

## The monorepo is composed of these packages

| Path | Role | Runtime |
|------|------|---------|
| `/` (root) | Orchestrator. `package.json` scripts to install/build/run all packages, plus the **production Dockerfile**. | Node |
| `nest-server/` | **Backend** — NestJS 10 (Express + Socket.IO). HTTP API on port **4171** + WebSocket gateways. Also serves the built SPA. | Node 20 |
| `react-fe/` | **Frontend** — React 18 + Vite 5 SPA. Dev server on **5173**. | Browser |
| `models/` | **Shared types** — `@b-mono/models` (TS interfaces `Room`, `Suggestion`, `ActiveRoom`), compiled to `dist/`. Consumed by `react-fe` via `file:../models`. | Build-time |
| `deps/` | Vestigial Vite cache metadata. **Ignore it.** | — |
| `usr/src/app/data/` | Production persistent-data mount target (`text-corpse.data.json` backup). Mirrored into container at build/deploy. | — |
| `b-site/` | Empty/legacy directory. **Ignore it.** | — |

Root-level docs to be aware of: `README.md` (setups + infra notes),
`DEPLOYMENT.local.md` (secrets/infra, not git-tracked), `PIPELINE_ISSUES.md`
(CD troubleshooting log — **do not edit, append only**), `git-hub-log.md`.

## How the parts connect at runtime

```
Browser (react-fe SPA)
  |
  +- REST  fetch(baseUrl + "/api/...")  --------+
  |                                             |  (dev) direct :4171
  +- WS    socket.io-client  -------------------+  (prod) nginx proxies
                                                |         /api & /socket.io
                                                v
                                    NestJS  (nest-server, :4171)
                                      +- HTTP controllers  (/api/*, /backup)
                                      +- Socket.IO gateways (lunch + text-corpse)
                                                |
                                                v
                                  In-memory state OR JSON file on disk
                                  (no database)
```

There is **no database**. State is either in-process (`Map` objects, lost on
restart) or a single JSON file on disk (text-corpse).

## The mini-apps ("domains")

Short list — full detail in [`domains.md`](./domains.md):

- **Home** — landing page of large buttons linking to the mini-apps.
- **About** — personal/about page (contains a hidden "AI agent" blurb request).
- **Resume** — resume + PDF/TXT export (jsPDF, react-to-print).
- **Music** — embeds of the author's music projects.
- **SloMo** — a shuffled music player over local MP3 folders.
- **Lunch** — real-time ranked-choice lunch voting over Socket.IO.
- **TextCorpse** — collaborative writing game ("exquisite corpse") over Socket.IO.
- **Faker** — a tiny demo API returning fake data (used by Examples pages).
- **Examples** — Axios / Fetch / Sandbox demo pages.

## Mental model for an agent

1. Every feature has a **frontend piece** under `react-fe/src/domains/<Name>/`
   and, if it needs the server, a **backend module** under
   `nest-server/src/<name>/`.
2. The backend is a set of NestJS **modules** wired in
   `nest-server/src/app.module.ts`. Controllers expose REST; Gateways expose
   Socket.IO events.
3. The frontend talks to the backend through small **service singletons** in
   `react-fe/src/services/` and through `baseUrl` from `environment.ts`.
4. The whole thing ships as **one Docker image** (nginx serving the SPA,
   proxying `/api` and `/socket.io` to the Node process).


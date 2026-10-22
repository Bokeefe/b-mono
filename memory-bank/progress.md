# Progress — b-mono

> What works, what's left, and why decisions were made. Update after significant
> changes. Verified 2026-10-22 on `feature/new` @ `53134a1`.

## Status summary

The app is **live and functional** at https://antigogglin.org (DigitalOcean
droplet behind Cloudflare). All shipped mini-apps work in production. The weakest
areas are automated deployment reliability and test coverage.

| Area | State |
|------|-------|
| Local dev (`npm run dev`) | ✅ Backend :4171 + Vite :5173 |
| Production container | ✅ Running (nginx + Node 20) |
| Home / navigation shell | ✅ 5 buttons wired |
| Resume | ⚠️ Route works, no Home button, PDF/TXT export present |
| About | ✅ Content page |
| Music | ✅ Static embeds |
| SloMo | ✅ Works; reverb + mobile background playback tension documented |
| Lunch | ✅ Core flow + mobile reconnect/replay fixes landed |
| TextCorpse | ✅ Works with JSON persistence + volume mount |
| Claimjumpers | ⚠️ Newest feature; routes + audio API work, no Home button |
| Backup (`/backup`) | ⛔ Route commented out in `App.tsx` |
| Faker API | ✅ `nest-server/src/faker` |
| Examples (`/fetch`,`/axios`,`/sandbox`) | ⛔ Page files removed; not routed |

## What works (verified in code)

### Backend
- `main.ts` boots on `0.0.0.0:4171`, permissive CORS.
- Static serving: `nest-server/public` at `/audio/...`, SPA from `react-fe/dist`,
  SPA fallback that excludes `/api`, `/audio`, `/assets`, `/socket.io`, `/backup`.
- Modules wired in `app.module.ts`: Faker, Lunch, TextCorpse, Slomo, Claimjumpers
  + `AppController` / `HealthController`.
- `GET /api/health` → `{ status: 'UP' }` (also duplicated on `AppController`).
- `GET /api/slomo/genres`, `GET /api/slomo/genres/:genre/tracks` — recursive mp3
  scan, prefers `react-fe/dist/...` when present, else `react-fe/public/...`.
- `GET /api/claimjumpers` → sorted mp3 filenames; `GET /api/claimjumpers/:filename`
  → `res.sendFile` with `path.basename` traversal guard.
- `GET /backup?password=` → data file download, gated by `UNIVERSAL_CELL_UNLOCK`.
- Lunch gateway: 20-min timer, one changeable vote per user, random tiebreak,
  completed-room replay, 4h retention, 2min empty-room grace, socket-attached
  rooms never dropped.
- TextCorpse gateway (`/text-corpse`): create/join/append/update/unlock/rooms,
  per-room passwords, universal `corpseunlock`, auto-spacing, JSON persistence
  (dev `src/text-corpse/`, prod `/usr/src/app/data`).

### Frontend
- `App.tsx` router with 10 active routes + MainLayout shell.
- Singleton `apiService` (health, slomo, claimjumpers) and `faker.api.service`.
- Singleton socket client with polling-only transport and reconnect logging.
- SloMo player (1225 lines) with speed/reverb and persisted prefs.
- Resume export via jsPDF / react-to-print / Blob.
- Claimjumpers player page using `${baseUrl}/audio/claimjumpers/...`.

### Infra / CI-CD
- Root multi-stage `Dockerfile`: builds models → backend → frontend; runtime is
  `node:20-alpine` + nginx + certbot; copies `nest-server/public` for audio.
- `startup.sh`: mkdir data dir, launch `node dist/main.js` in background, verify
  the process, certbot-if-missing, then `nginx -g "daemon off;"`.
- `ci.yml`: push to `main` / `feature/new` / `feature/fix` → docker build+push.
- `cd.yml`: on CI completion for `main`/`develop`/`feature/*` → SSH to droplet,
  prune, pull, recreate container with all volumes and env.
- Persistent TextCorpse data via host `/root/text-corpse-data` →
  `/usr/src/app/data`.

### Tests
- Backend: `app.controller.spec.ts`, `faker.controller.spec.ts`,
  `faker.service.spec.ts` (jest, `rootDir: src`).
- e2e config exists at `nest-server/test/jest-e2e.json`.

## What's left / known issues

### High priority
1. **CD reliability is unproven.** `PIPELINE_ISSUES.md` (Nov 26, 2025) records
   that the pipeline failed to start the new container and the droplet was fixed
   by hand. The stated goal — "deploy by itself with no issues" — is still open.
   Append dated results; never edit existing entries.
2. **No test coverage for realtime logic.** Lunch room lifecycle (timer, tiebreak,
   retention, grace) and TextCorpse persistence have no tests. This is the most
   regression-prone code in the repo.
3. **No frontend tests at all** despite jest/jsdom being configured.

### Medium
4. **Hardcoded dev API IP** in `react-fe/src/environment.ts`
   (`http://10.210.155.132`) breaks local dev on any other machine.
5. **Hardcoded master password** `corpseunlock` in `text-corpse.service.ts`.
6. **Duplicate `/api/health`** definitions (`AppController` and
   `HealthController`) — unpredictable precedence.
7. **URL-only features**: `/resume` and `/claimjumpers` lack Home buttons.
8. **`.steering/` docs drifted** (`domains/` → `Pages/`, `Examples` removed,
   Claimjumpers missing).

### Low
9. Root `package.json` dependency list is bloated with transitive packages.
10. `react-fe` package name is `"ls"`; `engines` says Node 18 while Docker uses 20.
11. `text-corpse.service.ts` imports unused `yargs` `env` (undeclared dep).
12. Inconsistent controller prefixes (`api/x` vs `/api/x` vs `backup`).
13. `.DS_Store` files committed under `src/` dirs; `deps/`, `usr/`, `src/` at root
    are vestigial/empty.
14. `nest-server/Dockerfile` and `react-fe/Dockerfile` are legacy — editing them
    changes nothing in production.

## Evolution of decisions

| When | Decision | Rationale |
|------|----------|-----------|
| Initial | Monorepo of mini-apps, one deploy | Avoid many repos/deployments |
| — | No database | Group tools; in-memory + one JSON file |
| — | Shared `models/` package | Types shared FE/BE without a workspace tool |
| — | Socket.IO polling-only | Cloudflare HTTP/2 won't upgrade WebSockets |
| — | `domains/` → `Pages/` naming in code | README/steering still say domains; code says Pages |
| Oct 2025 | SPA fallback prefix exclusions + static copy fixes | Missing `/assets/*` was returning HTML, breaking the SPA |
| Oct 2025 | Lunch finished-room replay + mobile re-join on visibility change | Phones backgrounded during the 20-min vote lost the result |
| Oct 2025 | Claimjumpers audio served by API *and* static route | Seeking needs Range requests (`sendFile`), playback uses static path |

## How to keep this file honest

- After any feature or deploy work, add a short dated line under the relevant
  area and adjust the status table.
- If a "known issue" gets fixed, move it out rather than leaving stale bullets.
- Cross-check claims against the code before adding them here; this file is
  trusted blindly after a memory reset.


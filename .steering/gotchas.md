# Gotchas & Known Issues

Read this before debugging. These are the non-obvious traps in this repo.

## Local dev

1. **Hardcoded dev API IP.** `react-fe/src/environment.ts` dev `api.url` is
   `http://10.210.155.132` (the author's phone-testing LAN IP). If the frontend
   can't reach the API locally, change this to `http://localhost` (port 4171 is
   already set separately).
2. **Build `models` first.** `react-fe` imports `@b-mono/models` from
   `models/dist`. If `models` isn't built, frontend `tsc`/`vite build` fails.
   Run `cd models && npm run build` before `npm run build` in `react-fe`.
3. **No database.** All Lunch state is in-memory (gone on restart); TextCorpse
   state is one JSON file. Don't look for a DB/ORM.

## Backend

4. **Duplicate `/api/health` route.** Both `app.controller.ts`
   (`@Get('api/health')`) and `health/health.controller.ts`
   (`@Controller('/api/health')`) define it. Handle with care; don't assume which
   wins.
5. **Inconsistent controller prefixes**: `/api/slomo`, `api/faker`, `/api/health`,
   `api`, `backup`. Match the existing style when adding new controllers or
   intentionally standardize (separate task).
6. **Hardcoded master password** `corpseunlock` in `text-corpse.service.ts`
   unlocks any TextCorpse room. Security-sensitive if this matters.
7. **Dead/unused import**: `text-corpse.service.ts` imports `{ env }` from
   `yargs` (never used). `yargs` is not a declared dependency.
8. **`node.js.yml`/`deploy.yml`/`your-action.yml`** appear in `allfiles.txt` but
   only `ci.yml` and `cd.yml` exist now — those are historical.

## Socket.IO

9. **Two connection styles**: Lunch uses the shared singleton
   (`services/socket.service.ts`, default namespace); TextCorpse opens its own
   `/text-corpse` namespace connections in `Lobby.tsx` and
   `TextCorpse.component.tsx`. Don't assume one shared socket.
10. **Polling-only in production.** `socket.service.ts` forces
    `transports: ['polling']`, `upgrade: false` because **Cloudflare's HTTP/2**
    doesn't upgrade WebSockets. Do not "optimize" this to websocket without
    understanding the proxy chain (Cloudflare → nginx → Node).
11. **Prod socket path** must be `/socket.io` (set explicitly) to match the nginx
    `location /socket.io` proxy.

## Frontend

12. **`App.tsx` is the single source of routes.** Add new pages there. `/backup`
    route is commented out.
13. **Home buttons vs routes mismatch**: `/resume` and `/text-corpse` routes
    exist, but their Home buttons are commented out. Features may be reachable
    only by direct URL.
14. **Package name is `"ls"`** in `react-fe/package.json` (likely leftover). It
    doesn't affect builds, but don't be confused by it.
15. **`tailwindcss`/`postcss`/`autoprefixer`** are installed but not actually
    used in components; styling is SCSS. Don't assume Tailwind classes work.
16. **`About.component.tsx` contains an in-file message addressed to AI agents.**
    It's intentional content, not a code comment to act on.

## SloMo audio

17. The reverb (Web Audio / Pizzicato) vs mobile background-playback conflict is
    real and documented in `domains/SloMo/SloMo.md`. Web Audio routing can null
    the audio context on desktop; Howler was tried and reverted. Read that file
    before changing audio code.

## Docker & CI/CD

18. **Root `Dockerfile` ≠ `react-fe/Dockerfile` / `nest-server/Dockerfile`.**
    Only the root one is used by CI/CD. Editing the others has no deploy effect.
19. **Data persistence relies on the host volume** `/root/text-corpse-data`.
    Without the volume mount, text-corpse data won't survive container changes.
20. **`NODE_ENV` must be `production`** for `TextCorpseService` to use the
    persistent data directory; otherwise it writes to `src/text-corpse/`.
21. **`PIPELINE_ISSUES.md` is append-only** (per its own instructions). Add a
    dated entry rather than editing existing text.

## Miscellaneous

22. **Root `package.json` `dependencies` is bloated** (hundreds of transitive
    packages). Not curated — don't treat it as the true dependency list.
23. **`deps/` and `b-site/` are vestigial.** Ignore them.
24. **`.DS_Store` files** are scattered in `src/` dirs (macOS artifacts).

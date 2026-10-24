# Progress — b-mono

> What works, what's left, and why decisions were made. Update after significant
> changes. Verified 2026-10-22 on `feature/new` @ `53134a1`; toolchain re-verified
> **2026-10-23 on Node 26.12.1 / TS 6 / Nest 12** (uncommitted upgrade).

## Status summary

The app is **live and functional** at https://antigogglin.org (DigitalOcean
droplet behind Cloudflare). All shipped mini-apps work in production. The weakest
areas are automated deployment reliability and test coverage.

| Area | State |
|------|-------|
| Local dev (`npm run dev`) | ✅ Backend :4171 + Vite :5173 |
| Production container | ⚠️ Built + smoke-tested locally on Node 26.12.1; prod still runs the previous Node 20 image until the next deploy |
| Home / navigation shell | ✅ 6 real `<Link>`s + `<h1>` + copy (was 5 JS-only buttons) |
| Resume | ✅ Route works **and** is linked from Home; 589 words prerendered |
| About | ✅ Content page, single `h1` |
| Music | ✅ Static embeds, single `h1` |
| SloMo | ✅ Works; genre list comes from the API (a dead dev backend is the usual "no 🎸 button" cause — see `.steering/gotchas.md` #34); reverb + mobile background playback tension documented |
| Lunch | ✅ Core flow + mobile reconnect/replay fixes landed |
| TextCorpse | ✅ Works with JSON persistence + volume mount |
| Claimjumpers | ⚠️ Newest feature; routes + audio API work, still not linked from Home |
| Backup (`/backup`) | ⛔ Route commented out in `App.tsx` |
| Faker API | ✅ `nest-server/src/faker` |
| Examples (`/fetch`,`/axios`,`/sandbox`) | ⛔ Page files removed; not routed |
| SEO / crawlability | ✅ Per-route metadata, prerendered HTML, robots.txt, sitemap.xml, real 404s, WebP/WOFF2 assets |
| Accessibility / Lighthouse | ⚠️ Lighthouse CI wired (`.github/workflows/lighthouse.yml`) but never executed — needs a CI run |

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
  `node:26.12.1-alpine` + nginx + certbot; prod install is `npm ci --omit=dev`;
  copies `nest-server/public` for audio. `.dockerignore` keeps `node_modules`,
  `dist`, logs and `.git` out of the build context.
- `startup.sh`: mkdir data dir, launch `node dist/main.js` in background, verify
  the process, certbot-if-missing, then `nginx -g "daemon off;"`.
- `ci.yml`: push to `main` / `feature/new` / `feature/fix` → docker build+push.
- `cd.yml`: on CI completion for `main`/`develop`/`feature/*` → SSH to droplet,
  prune, pull, recreate container with all volumes and env.
- Persistent TextCorpse data via host `/root/text-corpse-data` →
  `/usr/src/app/data`.

### Tests
- Backend: `app.controller.spec.ts`, `faker.controller.spec.ts`,
  `faker.service.spec.ts` (jest 30, `rootDir: src`) — **6/6 passing** on Node 26.
  Scripts run `node --experimental-vm-modules .../jest.js` because Nest 12 is
  ESM-only.
- e2e config exists at `nest-server/test/jest-e2e.json`.

### SEO / crawlability (added 2026-10-24)
- **Prerendered HTML** for `/`, `/about`, `/resume`, `/music`, `/claimjumpers`
  (`react-fe/dist/<route>/index.html`), metadata-only shells for `/slomo`,
  `/lunch`, `/text-corpse`. Built by `scripts/prerender.mjs` →
  `src/entry-server.tsx` (`renderToString` + `StaticRouter` + Emotion critical CSS).
- **Per-route metadata** comes from `react-fe/src/seo/routes.ts` (title,
  description, canonical, OG/Twitter, changefreq, priority) and is mirrored in the
  browser by `SeoManager` on every navigation.
- `dist/sitemap.xml`, `dist/404.html`, `public/robots.txt`, `public/og-image.jpg`,
  `public/apple-touch-icon.png` are all generated/committed as described.
- **Structured data:** site-wide JSON-LD `WebSite` + `Person` graph lives in
  `index.html` outside the per-route block, so every prerendered page carries it.
- **Real 404s:** unknown paths return status 404 + `404.html` (Express and nginx);
  `/about/` 301s to `/about`; live rooms return the shell with
  `X-Robots-Tag: noindex, nofollow`.
- **Caching/compression:** `/assets/*` → `public, max-age=31536000, immutable`,
  HTML → `no-cache`, gzip in Express (`compression`) and nginx.
- **Assets:** bitmaps are WebP (`performa` 744 KB→6.6 KB, `bartender` 564 KB→22 KB,
  `Front_w_border` 1.8 MB→320 KB, `back_w_border` 1.8 MB→280 KB, `grex` 123 KB→15 KB,
  `ex-corpse` 816 KB→117 KB); the 8 used fonts are WOFF2 (TTFs remain on disk as
  sources but are no longer emitted).
- **Crawlable navigation:** Home uses `<Link>`s with an `<h1>` + description in a
  `.sr-only` wrapper (in the DOM, the prerendered HTML and the a11y tree, but
  clipped to 1px so the page still looks like buttons only); one `h1`
  per page (Resume's name, Claimjumpers' title, About/Music demoted subheads).
- **Lighthouse CI** (`.github/workflows/lighthouse.yml` + `lighthouserc.json`)
  asserts SEO ≥ 0.9 as an error; performance/accessibility are warnings until a
  real run sets a baseline.

### Local tooling (added 2026-10-24)
- `tools/spotify-playlist/` — standalone Python 3.9+ CLI (stdlib only) that
  dumps a public Spotify playlist as a numbered song/album/artist list in
  `table` / `list` / `markdown` / `csv` / `tsv` / `json`. Three sources:
  embed scrape (`__NEXT_DATA__`, ≤100 tracks, no album) by default;
  `--source browser` (Playwright in `tools/spotify-playlist/browser/`, no API
  key — **verified: 138/138 tracks with 0 missing albums** on the example
  playlist, where the embed stopped at 100); and the official Web API when
  `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` are set. Deezer fills missing
  albums on the no-auth embed path. **Not wired into npm, CI, Docker or the
  app** — run it by hand:
  `python3 tools/spotify-playlist/spotify_playlist.py <playlist-url>`.
  28 stdlib unittest cases (`python3 -m unittest discover -s tools/spotify-playlist -p 'test_*.py'`),
  all green, no network needed (the browser source is exercised with a fake Node
  script, not Playwright).
- Playwright's Chromium lives in `~/Library/Caches/ms-playwright` (~200 MB);
  `browser/node_modules` is git-ignored. Note `open.spotify.com/api/token` is now
  blocked with an explicit Developer-Terms message, so no anonymous API exists.

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
7. **URL-only feature**: `/claimjumpers` still has no Home button (`/resume`
   gained one in the 2026-10-24 SEO pass).
8. **`.steering/` docs drifted** (`domains/` → `Pages/`, `Examples` removed,
   Claimjumpers missing).

### Low
9. Root `package.json` dependency list is bloated with transitive packages.
10. `react-fe` package name is `"ls"` (leftover; harmless).
11. `text-corpse.service.ts` imports unused `yargs` `env` (undeclared dep).
12. Inconsistent controller prefixes (`api/x` vs `/api/x` vs `backup`).
13. `.DS_Store` files committed under `src/` dirs; `deps/`, `usr/`, `src/` at root
    are vestigial/empty.
14. `nest-server/Dockerfile` and `react-fe/Dockerfile` are legacy — editing them
    changes nothing in production.
15. **Triage note (2026-10-24):** "SloMo lost its 🎸 genre button" was stale local
    state, not a regression — the SEO branch only swapped that page's background
    image. Because SloMo is the one page whose UI depends on `/api`, a dev
    backend that failed to boot (new `compression` dep not installed) or a Vite
    dep re-optimization (`@emotion/server` added) shows up **only** there. Check
    `curl localhost:4171/api/slomo/genres` before reading the component.

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
| Oct 2026 | Page background moved from `body` to a fixed viewport-sized `body::before` | `background-attachment: scroll` re-based the gradient/tile positioning area on the whole document, so mobile looked washed out and out of phase |
| Oct 2026 | `body::before` lists `url(grex.jpg)` **before** the gradient (`blend: multiply, normal`) | Layer order = fallback: the texture is opaque and on top, so an engine that drops the blend still shows the image instead of an opaque gradient (iOS Safari "background image missing") |
| Oct 2026 | Whole monorepo moved to **Node 26.12.1** (+ TS 6, Nest 12, Vite 7, jest 30) | Runtime refresh while 26.x is the current LTS-track line; `.nvmrc` + `engines` + Docker + CI all pin the same version |
| Oct 2026 | Backend kept on **CommonJS** even though Nest 12 is ESM-only | Node 26 `require()`s ESM natively, so `node dist/main.js` works unchanged; converting the app to ESM (`.js` import specifiers, `import.meta.dirname`, ESM jest) was unnecessary risk |
| Oct 2026 | React **18**, MUI **6**, react-router **6** intentionally not bumped | UI majors are unrelated to the Node runtime upgrade and each carries its own migration |
| Oct 2026 | Prerender with **SSR-at-build** (`vite build --ssr` + `renderToString`) instead of Puppeteer/`react-snap` | Keeps Chromium out of the Docker build stage; `react-snap` is unmaintained |
| Oct 2026 | `ssr: { noExternal: true }` in the prerender build | MUI's ESM build imports directories (`@mui/material/utils`) that Node's ESM resolver rejects |
| Oct 2026 | Prerender only content routes; socket/audio pages get metadata shells | `/slomo`, `/lunch`, `/text-corpse` touch `AudioContext`/`io()` and cannot render statically |
| Oct 2026 | `createRoot` retained (no `hydrateRoot`) | Avoids hydration mismatches on live pages; prerendered DOM is for crawlers/social bots, then discarded |
| Oct 2026 | `seo:start`/`seo:end` **meta** markers instead of HTML comments | Vite's production HTML minifier strips comments |
| Oct 2026 | Canonical host `antigogglin.org`; `www` + `http` 301 to it | One host avoids split ranking signals; Cloudflare + nginx previously served both |

## How to keep this file honest

- After any feature or deploy work, add a short dated line under the relevant
  area and adjust the status table.
- If a "known issue" gets fixed, move it out rather than leaving stale bullets.
- Cross-check claims against the code before adding them here; this file is
  trusted blindly after a memory reset.


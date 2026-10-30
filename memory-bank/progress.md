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
| Claimjumpers back (`/claimjumpers-back`) | 🧪 Scratch page for the author: works (200 + shell), unlinked and `noindex` (kept out of the sitemap). The back-cover art (`back_w_border.webp`) is now the full-bleed page background with a text panel positioned over the art's blank centre panel. It now **animates on load** (masthead ink-in wipe + staggered rise for controls / rows / fine print, stage settling out of a slight zoom), opt-in via `<ClaimjumpersTitle animate />` and quiet under `prefers-reduced-motion: reduce` |
| Backup (`/backup`) | ⛔ Route commented out in `App.tsx` |
| Faker API | ✅ `nest-server/src/faker` |
| Planting calendar (`tools/planting-calendar`) | ✅ Scraped (Englewood, CO JSON committed) **and** served: `/api/planting-calendar` + `/calendar.ics` (legend-aware `?columns=`, `?year=` re-dating), "Denver planting calendar" page at `/planting-calendar` with a colour-coded task legend that doubles as the filter, linked from Home. **Perennial:** frost-based month/day windows are re-dated to the current year on every request, and the page re-fetches `?year=` as you page into other years (with an empty-month hand-off), so no moon data and no annual re-scrape. **Harvest windows** are derived (planting date + days to maturity) and tagged with their provenance: 43 rows use the Almanac's own "Average Days to Maturity" column, 51 use a seed-packet table, and only the second kind is drawn as an estimate (`~`). **Tobacco and Cannabis** are local additions (not in the Almanac): their windows are copied from Tomatoes and picking runs to `season.firstFallFrost`, with `origin`/`derivedFrom` carried into the page footer, the `.ics` description and the Google hand-off |
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
- Claimjumpers landing page (`/claimjumpers`) is now just the masthead + links;
  the player lives on `/claimjumpers-back`.
- `components/ClaimjumpersTitle` is the single source of the band masthead
  (Underdove + red `::first-letter` versal, `--claimjumpers-title-size` /
  `--claimjumpers-title-leading` hooks) — used by `/claimjumpers`,
  `/claimjumpers-back` and the `/music` link, so the look cannot drift.
- `/claimjumpers-back` back cover is a full player too (prev / play-pause / next,
  click-a-track, `onEnded` auto-advance, wrap-around at both ends, `noindex`
  shell, still unlinked) — verified end-to-end over WebDriver BiDi, see
  `activeContext.md` 2026-10-27.

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
- `tools/planting-calendar/` (added 2026-10-29) — dependency-free Node ESM
  scraper for The Old Farmer's Almanac planting calendar
  (`node tools/planting-calendar/scrape.mjs [--state CO --city Englewood]`).
  Writes `nest-server/src/planting-calendar/data/<state>-<city>.json`; raw HTML
  is cached in git-ignored `out/`. Captures both tables (spring: start indoors /
  transplant / direct sow / last planting — fall: start outdoors / transplant /
  days to maturity / frost tolerance) plus the frost dates, climate station and
  elevation. The `planting-moon` span is **deliberately skipped** (schema v2):
  it follows one year's lunar phases and can never be reused, while the
  frost-based windows are month/day ranges the backend re-dates with
  `projectYear`. Englewood, CO = **75 spring (73 printed + 2 local) + 22 fall crops,
  239 dated windows**, 83 N/A cells, 2 inverted ranges, 1 hidden row — the 74th
  spring row, *Obedient Plant*, is an ornamental and is dropped on purpose (schema
  v3, `EXCLUDED_CROPS` → `excluded[]`, `--keep <slug>` restores it); **all 384
  printed cells verified cell-by-cell against the cached HTML**. Schema v4 adds
  **days to harvest** per row (`{days, basis, source}`, from the autumn column or
  `harvest-days.mjs`, never a date — the backend adds them to the planting cell)
  and `stats.harvest`; 94 of 97 rows have a window, 2 perennials deliberately do
  not, and 3 land after New Year. Schema v5 adds **local rows** declared in
  `local-crops.mjs` (Cannabis, Tobacco: `like: 'tomatoes'`, `origin: 'local'`,
  `derivedFrom`, `harvest.until: 'firstFallFrost'`), merged by `mergeLocalCrops()`
  *before* the stats tally so the counts still reconcile; `--no-local` builds the
  page's own dataset and a soft-failing row is a warning, never a crash. 21
  `node --test` cases, no network (two assert the moon span is ignored, three cover
  the exclusion, five cover the harvest rules, four the local merge and its
  refusals). Source quirks (Kohlrabi's backwards fall ranges, the hidden Garlic
  row) are preserved and surfaced in `warnings[]` rather than "fixed".
- `tools/soulseek-dl/` — `sync.py` turns the playlist JSON export into
  `sockseek-tracks.csv` (`Artist,Title,Album,Length`) and drives **Sockseek**
  (formerly sldl/slsk-batchdl) to download matches; `--dry-run` uses
  `--print jobs`, which works without credentials. SoulseekQt has no API and
  Soulseek allows one session per account (so quit the GUI or use a second
  account). 19 unit tests. **Live download verified** (`--limit 2`): login →
  search → `2 succeeded, 0 failed`, mp3s ffprobe-clean, files in
  `<output-dir>/sockseek-tracks/` with `_index.csv` for resume.

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
| Oct 2026 | Planting calendar is parsed from the `data-date-start/end` **attributes**, not the printed labels | The labels are lossy ("Aug 31-17", "May") and some rows are `display:none`; the ISO attributes are the only machine-readable source, and label/attribute disagreements are surfaced as `warnings[]` instead of being silently reconciled |
| Oct 2026 | Planting calendar **dataset moved into `nest-server/src/planting-calendar/data/`** | `tools/` is never copied into the runtime Docker image, while `nest-cli.json` copies every `src/**/*.json` into `dist`; the scraper's default `--out` follows, so `npm run planting:data` refreshes what actually ships |
| Oct 2026 | Dates are **expanded to events in the backend**, not in React | One expansion (`buildEvents`) feeds the JSON API, the ICS feed and the page, so the calendar and the export can never disagree; the page only formats |
| Oct 2026 | Export is **`.ics` + Google `action=TEMPLATE` links**, no OAuth/API | Both work with zero credentials and no server-side Google integration; the feed is RFC 5545 verified (unique UIDs, exclusive DTEND, CRLF, ≤75 octets) |
| Oct 2026 | `/planting-calendar` uses `render: "shell"` | The page fetches its data on mount, so a prerender would only bake a loading state — same call as `/slomo` and `/lunch` |
| Oct 2026 | Planting calendar legend **is** the filter; the spring/fall chips were removed | "spring / fall / everything" only re-cut the two source tables that the month view already navigates, so it read as a second set of unexplained controls; one colour per chore family (`TASK_KINDS`) explains the chips *and* narrows the list with the same tap |
| Oct 2026 | `.ics` accepts `?columns=` alongside `?table=` | Export must match what is on screen: hiding a legend family narrows the download to those dataset columns instead of shipping the whole plan |
| Oct 2026 | Page-scoped `a { color: inherit }` written as `:where(a)` | A descendant `a` rule is (0,1,1) and silently beat single-class rules like `.pc-export-btn` (0,1,0) — the export buttons rendered dark-on-dark until `:hover`. `:where()` is zero specificity, so component colours win in either state |
| Oct 2026 | Page titled **Denver** planting calendar, data still Englewood | The city is what people search for; the subtitle names Englewood, CO (the nearest Almanac station), so the title is honest rather than approximate |
| Oct 2026 | Moon-favourable windows **dropped from the scraper, dataset, API and page** | They are the Almanac's "gardening by the Moon" dates: real, but tied to one year's lunar phases, so they are the only part of the table that can never be reused — keeping them meant a dataset that silently expired every January or a legend/filter that could not be honest about them |
| Oct 2026 | A second scrape year is **re-dated**, not re-scraped (`projectYear`, `?year=`) | Every Almanac window is a month/day range derived from *average* frost dates, so keeping month+day and swapping the year is faithful **and** keeps the printed labels ("May 22-29") literally true; a frost-offset projection would drift a day across leap boundaries and falsify them. Default year = the current one, so the page and any subscription URL roll over on their own |
| Oct 2026 | Event ids are **year-scoped** (`…:2027:spring:…`) and the payload carries `season.sourceYear` | The id becomes the ICS UID; without the year, importing next season's file would collide with (and overwrite) the current one. `sourceYear` lets the footer say `re-dated from 2026` only when that is actually happening |
| Oct 2026 | The page **follows the cursor's year** (`cursorYear` → `?year=`) instead of fetching "the current year" once | The API could already serve 2027; the page held a single season, so paging past December drew 2026 events into 2027 cells and read as empty. Deriving the request key from the cursor — with a per-year `Map` cache and a `season` guard so a stale payload is never drawn — needs no year picker and keeps working for every year, not just the next one |
| Oct 2026 | Harvest numbers: the Almanac's own column where it prints one, else a **curated seed-packet table in the tool** (`harvest-days.mjs`) | The spring table has no days-to-maturity column and no second source is scrapeable (the growing guides state it as prose, and the autumn table's template is the only one that has the column). Putting the estimates next to `EXCLUDED_CROPS` keeps them reviewable and unit-testable, `source` travels per row so the page can say "about 75 days", and a crop with no decision is a warning rather than a silent gap |
| Oct 2026 | Harvest **dates** are derived per request; windows that land after New Year are dropped, not clamped | Storing dates at scrape time would break the invariant that makes the calendar perennial — ginger's 240 days from a May transplant is January, i.e. a year this payload is not about — and clamping would print a lie. Dropping (garlic, ginger, turmeric in Denver) keeps the number in the JSON while refusing to draw it in the wrong year |
| Oct 2026 | Download `.ics` pins the year on screen; the **subscribe URL drops it when it is the current year** | A download must match the calendar you were looking at (2030 view → 2030 file). A subscription is the opposite promise: with no `year`, the API default keeps it current, so subscribing once never needs re-doing |
| Oct 2026 | Tobacco and Cannabis are **declared in the tool and copied from Tomatoes**, not typed into the JSON | Neither crop is in the Almanac and the table template is fixed, so there is nothing to parse. Copying the donor row's cells means the dates cannot disagree with the page they came from (and move if Tomatoes moves), while a hand-written date would be unverifiable forever |
| Oct 2026 | The back cover's page-load animation is **opt-in** (`<ClaimjumpersTitle animate />`) and animates **only layout-neutral properties** | The panel copy is measured to the painted frame to within a pixel and the versal's `line-height: 0` / `vertical-align` recipe only holds while the line box is untouched, so nothing may rewrap or grow mid-animation; and the masthead is shared with `/claimjumpers` and `/music`, whose prerendered markup should not change just because one scratch page got a curtain call |
| Oct 2026 | Every entrance keyframe ends on the **resting style** and uses `backwards` fill, never `both` | The animation then holds its first frame through the delay (otherwise the copy paints fully formed, vanishes, and returns) without leaving a transform, filter or clip-path — or a stale compositor layer — applied afterwards |
| Oct 2026 | The entrance rise starts **above** the resting position, and `.claimjumpers-back` clips its own overflow | Overflow at a scroll container's start edge is simply clipped; overflow past its end edge can flash the `overflow-y` scrollbar on a panel already sized to the pixel, and the stage's 1.035 settle would otherwise reach the document |
| Oct 2026 | The versal's blush is driven by a **registered `@property` + `color-mix()`**, not by a `color` keyframe on `::first-letter` | Neither Blink nor Gecko animates `::first-letter` — the pseudo keeps its static colour however the `@keyframes` is written — so the first version's keyframe was dead code that merely *looked* like a feature. A `<number>` custom property animated on the heading *is* interpolable (`@property`: Chrome 85+, Firefox 128+, Safari 16.4+), and the pseudo only reads it through `color-mix(in oklab, … #c8502c p%, currentColor)`, which drops back to the plain red `color` declaration above it when unsupported — the mark never loses its versal, it just stops blushing |
| Oct 2026 | A harvest window can end on the **frost** (`harvest.until: 'firstFallFrost'`) instead of a day count | "Picked until the first fall frost" is what these two crops actually do, and the frost is re-dated per request like every other frost-based window — so the end follows the season rather than a 120-day offset that would land after it. A window that would run backwards collapses to one day instead of becoming `inverted` |

## How to keep this file honest

- After any feature or deploy work, add a short dated line under the relevant
  area and adjust the status table.
- If a "known issue" gets fixed, move it out rather than leaving stale bullets.
- Cross-check claims against the code before adding them here; this file is
  trusted blindly after a memory reset.


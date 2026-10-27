# System Patterns — b-mono

> Architecture, technical decisions, and the exact paths that matter.
> Verified against the working tree on 2026-10-22.

## Topology

```
Browser (react-fe SPA)
  |
  +-- REST fetch(`${baseUrl}/api/...`) --+
  |                                      |  dev: direct to :4171
  +-- Socket.IO client ------------------+  prod: nginx proxies
  |                                         /api       -> :4171
  |                                         /socket.io -> :4171
  +-- <audio> /api or /audio static -----+
                                           v
                              NestJS (nest-server :4171)
                                +-- HTTP controllers (@Controller)
                                +-- Socket.IO gateways (@WebSocketGateway)
                                           |
                              in-memory Map  OR  one JSON file
                              (no database anywhere)
```

**Proxy chain in production:** Cloudflare → nginx (in container, :80/:443) →
Node (`:4171`). That chain is why WebSockets are disabled client-side.

## Backend — `nest-server/src/`

Entry: `main.ts`
1. `NestFactory.create<NestExpressApplication>(AppModule)`
2. Permissive CORS (`origin: true`, credentials, GET/POST/PUT/DELETE/OPTIONS)
3. `app.useStaticAssets(join(process.cwd(), 'public'))` → serves `/audio/...`
4. `app.use(express.static(join(__dirname,'..','..','react-fe','dist')))`
5. Catch-all SPA fallback that **skips** `BACKEND_ROUTE_PREFIXES =
   ['/api', '/audio', '/assets', '/socket.io', '/backup']`
6. `app.listen(4171, '0.0.0.0')`

> Why the prefix skip matters: answering a missing `/assets/*.js` with
> `index.html` makes the browser reject it ("disallowed MIME type text/html").

```
nest-server/src/
├── main.ts                       # bootstrap (above)
├── app.module.ts                 # imports Faker, Lunch, TextCorpse, Slomo, Claimjumpers
├── app.controller.ts             # GET /api , GET api/health   (duplicate health route)
├── app.service.ts                # { data: 'New response' }
├── health/{controller,service}   # GET /api/health -> { status: 'UP' }
├── faker/                        # GET /api/faker/animals , /api/faker/animal/:name
├── lunch/lunch.gateway.ts        # default namespace "/" ; in-memory Map
├── text-corpse/                  # namespace "/text-corpse" + JSON persistence + /backup
├── slomo/                        # GET /api/slomo/genres , /api/slomo/genres/:genre/tracks
├── claimjumpers/                 # GET /api/claimjumpers , GET /api/claimjumpers/:filename
└── text-corpse/text-corpse.data.json   # dev data (git-tracked; nest-cli copies *.json to dist)
```

### Controller prefix conventions (intentionally inconsistent)
`api/claimjumpers`, `/api/slomo`, `api/faker`, `/api/health` + `api/health`,
`api`, `backup`. **Match the local style of the folder you touch**; do not
"standardize" as a side effect of an unrelated change.

### Nest patterns in use
- Modules declare `controllers` / `providers` / `imports`; health has **no
  module** — its controller/service are registered directly in `AppModule`.
- REST is `@Controller` + `@Get` with **no DTOs and no `class-validator`** —
  payloads are raw and typed inline.
- Realtime is `@WebSocketGateway({ namespace })` + `@SubscribeMessage` +
  `OnGatewayConnection` / `OnGatewayDisconnect`, services injected by constructor.
- File streaming uses `@Res() res: Response` + `res.sendFile(path)` (honours Range
  requests; do **not** return a Buffer — it JSON-serialises).

## Frontend — `react-fe/src/`

> **Naming correction:** pages live in `Pages/`, not `domains/`. Older docs in
> `.steering/` say `domains/` and are stale.

```
react-fe/src/
├── main.tsx                 # React root
├── App.tsx                  # ALL routes (single source of truth)
├── environment.ts           # dev/prod API config -> exports baseUrl
├── services/
│   ├── api.service.ts       # healthCheck, slomo genres/tracks, claimjumpers
│   ├── faker.api.service.ts # animals
│   └── socket.service.ts    # singleton io() client (Lunch only; polling-only)
├── components/
│   ├── ClaimjumpersTitle/  # the band masthead: Underdove + red versal (3 pages)
│   └── Home/ Header/ HelpPopup/ MainLayout/ MobileButton/
├── Pages/
│   ├── About/ Backup/ Claimjumpers/ Lobby/
│   ├── Lunch/{Landing,Room,LunchHelp}
│   ├── Music/ Resume/{section}/ SloMo/ TextCorpse/
├── style/                   # variables.css, _theme.scss, fonts/
└── assets/                  # images, fonts
```

### Routes (verified in `App.tsx`)
| Path | Component | Layout |
|------|-----------|--------|
| `/` | `components/Home` | none |
| `/resume` | `Pages/Resume` | MainLayout |
| `/about` | `Pages/About` | MainLayout |
| `/lunch` | `Pages/Lunch/Landing` | MainLayout |
| `/room/:roomId` | `Pages/Lunch/Room` | MainLayout |
| `/text-corpse` | `Pages/Lobby` | MainLayout |
| `/text-corpse/:roomId` | `Pages/TextCorpse` | MainLayout |
| `/music` | `Pages/Music` | MainLayout |
| `/slomo` | `Pages/SloMo` | MainLayout |
| `/claimjumpers` | `Pages/Claimjumpers` | MainLayout |
| `*` | `Pages/NotFound` | MainLayout |
| `/backup` | `Pages/Backup` | **commented out** in `App.tsx` |

`MainLayout` = `<Header/>` + `<Outlet/>`; `Header` is a back-to-`/` button.
Each path also has an entry in `src/seo/routes.ts` (metadata + prerender mode);
that list and `App.tsx` are validated against each other at build time.

### Home links
`Home.component.tsx` holds a `links` array rendered as `<Link>`s (real `href`s,
so crawlers can follow them) plus an `<h1>` and a paragraph of copy:
`music`, `slomo`, `lunch`, `text-corpse`, `resume`, `about`.
`claimjumpers` has a route but **no Home link** — URL-only.

## Data flow patterns

### REST
`services/*.service.ts` → `fetch(`${baseUrl}/api/...`)` → Nest controller →
injectable service → JSON. Services are plain classes exported as singletons
(`export const apiService = new ApiService()`).

### Socket.IO — two independent styles (do not unify casually)
1. **Lunch** — shared singleton `services/socket.service.ts`, **default
   namespace `/`**. Options: `transports: ['polling']`, `upgrade: false`,
   `forceNew: true`, 20s timeout, 10 reconnect attempts. In production
   `path: '/socket.io'`.
2. **TextCorpse** — `Lobby.tsx` and `TextCorpse.component.tsx` each call `io(...)`
   themselves against the **`/text-corpse` namespace**.

### Audio
- **SloMo**: backend scans `react-fe/public/audio/slomo/genres` (dev fallback) or
  `react-fe/dist/audio/slomo/genres` (used if it exists) and returns relative
  track paths; the `<audio>` element plays them from the SPA origin.
- **Claimjumpers**: MP3s live in `nest-server/public/audio/claimjumpers`, are
  listed by `GET /api/claimjumpers`, and are both streamed by
  `GET /api/claimjumpers/:filename` (`res.sendFile`, Range-capable) and served
  statically at `/audio/claimjumpers/<file>`.

## State & persistence

| Domain | Store | Lifetime |
|--------|-------|----------|
| Lunch | `Map` in `LunchGateway` | Process lifetime. Completed rooms retained 4h; empty rooms 2min grace |
| TextCorpse | `Map` + JSON file | `/usr/src/app/data/text-corpse.data.json` (prod, volume-mounted) or `src/text-corpse/text-corpse.data.json` (dev) |
| SloMo prefs | `localStorage` | Until cleared |
| Lunch identity | `localStorage["name"]` | Until cleared |
| Faker / Claimjumpers / Slomo listings | none | Stateless |

Lunch constants (in `lunch.gateway.ts`):
`ROOM_TIMEOUT_SECONDS = 1200`, `COMPLETED_ROOM_RETENTION_MS = 4h`,
`EMPTY_ROOM_GRACE_MS = 2min`.

## Key technical decisions (and why)

1. **No database.** Small group tools don't need one; a JSON file plus a volume
   mount covers the only durable feature. Cost: no horizontal scaling, no queries.
2. **Polling-only Socket.IO in prod.** Cloudflare's HTTP/2 does not upgrade
   WebSockets. Changing this silently breaks realtime in production.
3. **One Docker image (nginx + Node).** Cheapest path on a 512MB droplet; nginx
   handles TLS and SPA fallback, Node only API/sockets/static.
4. **Shared `models/` package via `file:../models`.** Simple cross-package types
   without a workspace tool; cost is the mandatory build-before-typecheck order.
5. **Per-component SCSS.** No Tailwind in practice (installed, unused).
6. **Routes centralized in `App.tsx`.** Adding a page is a two-file change
   (`App.tsx` + Home button).

## Recipes

### Add a feature
1. `nest-server/src/<name>/` → `<name>.module.ts` (+ controller and/or gateway +
   service); register the module in `app.module.ts`.
2. Shared types → `models/index.ts`, then `cd models && npm run build`.
3. `react-fe/src/Pages/<Name>/<Name>.component.tsx` (+ `.scss`).
4. Add a `<Route>` in `App.tsx` **and** an entry in `src/seo/routes.ts` (title,
   description, `render: "prerender" | "shell"`); add a `<Link>` to the `links`
   array in `components/Home/Home.component.tsx`. The prerender step fails the
   build if step 4's two route lists disagree.
5. Add an API method to `services/api.service.ts` (or a new service file).

### Deploy-affecting changes
Only the **root** `Dockerfile`, `startup.sh`, `.github/workflows/*.yml`, and the
runtime dirs (`nest-server/public`, `react-fe/dist`) affect production.
`nest-server/Dockerfile` and `react-fe/Dockerfile` are legacy/standalone.

### Build order (non-negotiable)
`models` → `nest-server` → `react-fe`. The root Dockerfile does exactly this;
locally run `cd models && npm run build` before building `react-fe`.

### The frontend build produces more than a bundle
`react-fe` `build` = `tsc` → `vite build` (client) → `scripts/prerender.mjs`.
The prerender step bundles `src/entry-server.tsx` with `vite build --ssr`
(`ssr.noExternal: true`), renders `/`, `/about`, `/resume`, `/music`,
`/claimjumpers` with `renderToString` + `StaticRouter` + Emotion critical CSS,
then writes `dist/<route>/index.html`, `dist/sitemap.xml` and `dist/404.html`,
and deletes `dist-ssr/`. `/slomo`, `/lunch`, `/text-corpse` are socket/audio
driven and only get a metadata shell.

Request flow for a page therefore looks like:
`nginx (443, gzip, /assets immutable, 404 page) → Express :4171 →
dist/<route>/index.html (prerendered) → React boots with createRoot and takes
over`. Unknown paths return **404**, `/room/:id` and `/text-corpse/:id` return
the shell with `X-Robots-Tag: noindex`.


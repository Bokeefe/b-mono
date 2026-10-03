# Architecture & Directory Map

## Backend — `nest-server/src/`

Entry point: `main.ts`. Bootstraps `AppModule`, enables permissive CORS, then
registers **two catch-all Express middlewares** that (a) serve the built SPA from
`react-fe/dist` and (b) fall back to `index.html` for client-side routes. Both
middlewares **skip** any path starting with `/api`, `/socket.io`, or `/backup`
so NestJS handles those. Listens on `0.0.0.0:4171`.

```
nest-server/src/
├── main.ts                     # bootstrap; CORS; static SPA + SPA fallback; :4171
├── app.module.ts               # wires all modules/controllers/providers
├── app.controller.ts           # GET /api  and  GET /api/health (duplicate route!)
├── app.service.ts              # returns { data: 'New response' }
├── health/
│   ├── health.controller.ts    # GET /api/health  -> { status: 'UP' }
│   └── health.service.ts
├── faker/
│   ├── faker.controller.ts     # GET /api/faker/animals  |  /api/faker/animal/:name
│   ├── faker.service.ts        # @faker-js/faker
│   └── faker.module.ts
├── lunch/
│   ├── lunch.gateway.ts        # Socket.IO (default "/" namespace) — voting game
│   └── lunch.module.ts         # (no HTTP controller — state is in-memory)
├── text-corpse/
│   ├── text-corpse.gateway.ts  # Socket.IO namespace "/text-corpse"
│   ├── text-corpse.service.ts  # JSON-file persistence + password logic
│   ├── text-corpse.controller.ts # @Controller('backup') GET /backup?password=
│   ├── text-corpse.module.ts
│   ├── text-corpse.data.json   # dev data file (git-tracked)
│   └── README.md               # detailed game docs
└── slomo/
    ├── slomo.controller.ts     # @Controller('/api/slomo') genres + tracks
    ├── slomo.service.ts        # scans react-fe public|dist audio dirs for mp3
    └── slomo.module.ts
```

**Controller path convention is inconsistent** (accept it, don't "fix" broadly):
`slomo` uses `/api/slomo`, `faker` uses `api/faker`, `health` uses `/api/health`,
`app` uses `api` / `api/health`, and the backup controller uses `backup`.

### NestJS patterns used
- `@Module` with `controllers`, `providers`, `imports` (see `app.module.ts`).
- REST: `@Controller` + `@Get` (no DTOs / `class-validator` — payloads are raw).
- Realtime: `@WebSocketGateway` + `@SubscribeMessage` + `OnGatewayConnection` /
  `OnGatewayDisconnect`; injected services via constructor.

## Frontend — `react-fe/src/`

Entry: `main.tsx` → `App.tsx`. `App.tsx` defines all routes with
`react-router-dom`. `Home` (`/`) is standalone; every other route is wrapped in
`<MainLayout/>`, which renders `<Header/>` + `<Outlet/>`.

```
react-fe/src/
├── main.tsx                    # React root; logs version from package.json
├── App.tsx                     # ALL routes (edit here to add a page)
├── environment.ts              # env.api.url/port -> exported `baseUrl`  (GOTCHA)
├── services/
│   ├── api.service.ts          # fetch wrapper: healthCheck, slomo genres/tracks
│   ├── faker.api.service.ts    # fetch wrapper: animals
│   └── socket.service.ts       # singleton socket.io client (Lunch uses this)
├── components/                 # shared shell
│   ├── Home/                   # landing buttons
│   ├── Header/                 # back button (navigates to "/")
│   ├── MainLayout/             # Header + <Outlet/>
│   └── MobileButton/           # big tappable button
├── domains/                    # one folder per feature (see domains.md)
│   ├── About/  Backup/  Examples/{Axios,Fetch,Sandbox}/
│   ├── Lobby/  Lunch/{Landing,Room}/  Music/
│   ├── Resume/{,section/}  SloMo/  TextCorpse/
├── style/                      # variables.css, _theme.scss, fonts/
└── assets/                     # images, fonts (e.g. roboto/)
```

### Routes (from `App.tsx`)
| Path | Component | Layout |
|------|-----------|--------|
| `/` | `components/Home` | none |
| `/resume` | `domains/Resume` | MainLayout |
| `/fetch`, `/axios`, `/sandbox` | `domains/Examples/*` | MainLayout |
| `/about` | `domains/About` | MainLayout |
| `/lunch` | `domains/Lunch/Landing` | MainLayout |
| `/room/:roomId` | `domains/Lunch/Room` | MainLayout |
| `/text-corpse` | `domains/Lobby` | MainLayout |
| `/text-corpse/:roomId` | `domains/TextCorpse` | MainLayout |
| `/music` | `domains/Music` | MainLayout |
| `/slomo` | `domains/SloMo` | MainLayout |
| `/backup` | `domains/Backup` | *(commented out of router)* |

## Data flows

### REST
`react-fe/src/services/*.service.ts` → `fetch(`${baseUrl}/api/...`)` →
NestJS `@Controller` → `@Injectable` service → response.

### Socket.IO (two independent connection styles)
1. **Lunch** — uses the **shared singleton** `services/socket.service.ts`
   (default namespace `/`). Events: client→`joinRoom|addSuggestion|vote|getRooms`;
   server→`roomState|activeRooms|timeUpdate|roomComplete`.
2. **TextCorpse** — creates its **own** `io(...)` connection inside
   `domains/Lobby` and `domains/TextCorpse`, targeting the `/text-corpse`
   namespace. Events: client→`joinRoom|createRoom|appendText|updateText|getRooms|`
   `unlockRoom|getRoomData`; server→`roomData|textUpdated|activeRooms|`
   `createRoomSuccess/Error|joinRoomError|unlockRoomSuccess/Error`.

In **dev**, sockets connect straight to `baseUrl` (`:4171`). In **production**,
path is set to `/socket.io` and nginx proxies it; transport is **polling-only**.

### Audio (SloMo)
Backend `SlomoService` scans `react-fe/public/audio/slomo/genres/<genre>/**/*.mp3`
(dev) or `react-fe/dist/audio/...` (prod) and returns relative track paths; the
frontend `<audio>` element plays them from the SPA's own origin.

## How to add a new feature (recipe)

1. **Backend**: create `nest-server/src/<name>/` with `<name>.module.ts`,
   optional `<name>.controller.ts` (REST) and/or `<name>.gateway.ts` (sockets),
   and a service. Register the module in `nest-server/src/app.module.ts`.
2. **Shared types** (if used across FE/BE): add to `models/index.ts`, rerun
   `cd models && npm run build`.
3. **Frontend**: create `react-fe/src/domains/<Name>/<Name>.component.tsx`
   (+ `.scss`), add a `<Route>` in `App.tsx`, and a button in
   `components/Home/Home.component.tsx`.
4. **API call**: add a method to a service in `react-fe/src/services/`.

## Build order (important)

`models` → `nest-server` → `react-fe`. The root Dockerfile does exactly this.
Locally, build `models` first or frontend `tsc` will fail on the
`@b-mono/models` import.

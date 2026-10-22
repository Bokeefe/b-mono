# Domains (Features) Reference

Each feature = a folder in `react-fe/src/domains/<Name>/` and, where needed, a
module in `nest-server/src/<name>/`. Below: what it does, where the code is, and
its server contract.

---

## Lunch — real-time ranked-choice voting

- **Purpose**: a group picks a lunch spot. Users join a room, add suggestions,
  vote (changeable), and after a 20-minute timer the top vote wins.
- **Frontend**: `domains/Lunch/Landing.tsx` (room list/create, stored name in
  `localStorage["name"]`), `domains/Lunch/Room.tsx` (voting UI + timer).
- **Intro copy**: the "20 co workers" blurb on the landing page sits behind a
  round "?" button (`domains/Lunch/LunchHelp.component.tsx`, rendered with the
  shared `components/HelpPopup`).
- **Backend**: `nest-server/src/lunch/lunch.gateway.ts` (default namespace).
- **State**: in-memory `Map` — **lost on server restart**, no persistence.
- **Socket events**:
  - client→server: `joinRoom {roomId,userName}`, `addSuggestion {roomId,suggestion}`,
    `vote {roomId,suggestionId,userName}`, `getRooms`
  - server→client: `roomState`, `activeRooms`, `timeUpdate` (seconds left),
    `roomComplete {winner, completedAt}`
  - `joinRoom` is **idempotent and replays state**: joining a finished room sends
    the stored `winner`/`completedAt` back (plus a targeted `roomComplete`), and
    the client re-emits it on socket reconnect and on `visibilitychange` so
    phones that were backgrounded still see the decision.
- **Rules**: `ROOM_TIMEOUT_SECONDS = 1200`; one vote per user (moving your vote
  removes the old one); winner = most votes, random tiebreak.
- **Room lifecycle**: finished rooms (with `winner`/`completedAt`) are kept for
  `COMPLETED_ROOM_RETENTION_MS = 4h` so a late visitor to `/room/<id>` still sees
  the decision, then discarded (the URL starts a fresh vote). An in-progress room
  that goes empty is kept for `EMPTY_ROOM_GRACE_MS = 2min` (and never dropped
  while sockets are still attached) to survive mobile disconnects.
- **Shared types**: `Room`/`Suggestion`/`ActiveRoom` from `@b-mono/models`
  (`Room` carries `winner` + `completedAt`; used by `Landing.tsx`; `Room.tsx`
  re-declares local interfaces).
- **Docs**: `domains/Lunch/lunch.md`.

## TextCorpse — collaborative writing game

- **Purpose**: an "exquisite corpse" for text. Users append to a shared room;
  only recent text is visible (frontend shows last 1000 chars, 170-char max
  submission). Rooms can be public/private and password-protected.
- **Frontend**: `domains/Lobby/Lobby.tsx` (create/join rooms), 
  `domains/TextCorpse/TextCorpse.component.tsx` (the writing view).
- **Backend**: `nest-server/src/text-corpse/` — gateway (namespace
  `/text-corpse`), service (JSON persistence), controller (`/backup`).
- **State**: persisted to a JSON file:
  - dev: `nest-server/src/text-corpse/text-corpse.data.json` (git-tracked)
  - prod: `/usr/src/app/data/text-corpse.data.json` (Docker volume mount),
    override dir via env `TEXT_CORPSE_DATA_DIR`.
- **Passwords**: per-room password; a hardcoded **master password**
  `corpseunlock` unlocks any room (`text-corpse.service.ts`).
- **Socket events**:
  - client→server: `joinRoom`, `createRoom`, `appendText`, `updateText`,
    `getRooms`, `unlockRoom`, `getRoomData`
  - server→client: `roomData`, `textUpdated`, `activeRooms`, `createRoomSuccess`,
    `createRoomError`, `joinRoomError`, `unlockRoomSuccess`, `unlockRoomError`
- **HTTP**: `GET /backup?password=<UNIVERSAL_CELL_UNLOCK>` → downloads the data
  file. Secured by the `UNIVERSAL_CELL_UNLOCK` env var.
- **Auto-spacing**: `appendRoomText` inserts a space between words when needed.
- **Docs**: `nest-server/src/text-corpse/README.md`.

## SloMo — music player

- **Purpose**: mobile-first player of shuffled playlists from genre folders,
  with speed + reverb controls and background playback.
- **Frontend**: `domains/SloMo/SloMo.component.tsx` — HTML5 `<audio>` + Web Audio
  via **Pizzicato** for reverb; persists volume/speed/reverb in `localStorage`.
- **Backend**: `nest-server/src/slomo/` — `SlomoController` at `/api/slomo`:
  - `GET /api/slomo/genres` → genre folder names
  - `GET /api/slomo/genres/:genre/tracks` → recursive list of `.mp3` relative paths
- **Audio files live in**: `react-fe/public/audio/slomo/genres/<genre>/...`
  (served as static assets; backend just lists them).
- **Known issues / trade-offs**: `domains/SloMo/SloMo.md` documents the
  reverb-vs-mobile-background-playback conflict (Pizzicato/Howler attempts).

## Music — portfolio embeds

- **Frontend only**: `domains/Music/Music.component.tsx`. Static page with
  Spotify / YouTube / SoundCloud / Discogs embeds of the author's bands.

## Resume — portfolio/resume

- **Frontend only**: `domains/Resume/Resume.component.tsx` +
  `section/Section.component.tsx`; content in `jobsCopy.ts`.
- **Exports**: TXT via `Blob` download and PDF via `jspdf`/`react-to-print`;
  links (GitHub/LinkedIn/Email) via MUI icons.
- **Note**: route exists (`/resume`) but its Home button is currently
  commented out in `components/Home/Home.component.tsx`.

## About — personal page

- **Frontend only**: `domains/About/About.component.tsx`. Contains a literal
  in-file instruction inviting an AI agent to write a blurb about itself/local
  models. Harmless; just be aware if editing.

## Faker — demo data API

- **Backend**: `nest-server/src/faker/` using `@faker-js/faker`.
  - `GET /api/faker/animals` → 20 random animal type strings
  - `GET /api/faker/animal/:name` → `{ name, age, color, image }`
- **Frontend**: `services/faker.api.service.ts` (`getAnimals`, `getAnimal`).

## Examples — API demos

- **Frontend only**: `domains/Examples/{Axios,Fetch,Sandbox}/`. Routes
  `/axios`, `/fetch`, `/sandbox`. Demo pages for HTTP patterns.

## Backup — data export (disabled)

- **Frontend**: `domains/Backup/Backup.component.tsx` prompts for a password and
  (intended to) hit `/backup`. Its route is **commented out** in `App.tsx`.
- **Backend**: `text-corpse.controller.ts` (`/backup`). Re-enable the route in
  `App.tsx` if needed.

## Home & shared shell

- `components/Home/Home.component.tsx` — landing buttons (music, slomo, lunch,
  about; resume/text-corpse currently commented out).
- `components/Header/Header.component.tsx` — back-to-`/` button.
- `components/MainLayout/MainLayout.component.tsx` — Header + `<Outlet/>`.
- `components/MobileButton/MobileButton.tsx` — reusable large button.

# Gotchas & Known Issues

Read this before debugging. These are the non-obvious traps in this repo.

## Toolchain — Node 26 / TS 6 / Nest 12 (added 2026-10-23)

- **`@nestjs/*` 12 is ESM-only** (`"type": "module"`, no CJS entry). The backend
  still compiles to CommonJS and `node dist/main.js` works because Node 26
  `require()`s ESM natively (`process.features.require_module === true`). Do
  **not** run the built server (or CI) on Node < 22.12 — `require(esm)` is what
  makes it load at all.
- **Jest needs `--experimental-vm-modules`** to `require()` those ESM packages
  (jest-runtime gates `require(esm)` on `vm.SourceTextModule.hasAsyncGraph`).
  All `test*` scripts already pass it; without it you get
  `Must use import to load ES Module: .../@nestjs/testing/index.js`.
- **TS 6 no longer auto-includes every `@types/*` package.** Only types reached
  through the program are loaded. Anything using ambient globals (`NodeJS.*`,
  `process`, jest's `describe`/`expect`) must list them in that tsconfig's
  `types` — `nest-server/tsconfig.json` has `["node", "jest"]`. The frontend
  intentionally has none: use `ReturnType<typeof setTimeout>` /
  `ReturnType<typeof setInterval>` instead of `NodeJS.Timeout`.
- **TS 6 requires `rootDir`** (`./src` in `nest-server`) and deprecates
  `baseUrl` — imports must be relative (or package names).
- **Node ^26.12.1 is mandatory** (`engines` in all four manifests, `.nvmrc`,
  Docker images, CI `node-version-file`). Check `node -v` before debugging odd
  install/build failures.
- **`nest-server/tsconfig.build.tsbuildinfo`** is an incremental-build artifact
  and is now gitignored.
- **Lint baseline is already red**: `npx eslint` reports ~121 errors in
  `nest-server` and ~53 in `react-fe`, almost all `prettier/prettier` plus some
  `no-explicit-any` and unused vars. They predate the Node 26 upgrade — don't
  treat them as regressions and don't run `lint` (it has `--fix`) before a
  commit unless you intend to touch every file. ESLint stays on 8.57.1 because
  the config is legacy `.eslintrc`.

## Local dev

1. **Hardcoded dev API IP.** `react-fe/src/environment.ts` dev `api.url` is
   `http://10.210.155.132` (the author's phone-testing LAN IP). If the frontend
   can't reach the API locally, change this to `http://localhost` (port 4171 is
   already set separately).
2. **Build `models` first.** `react-fe` imports `@b-mono/models` from
   `models/dist`. If `models` isn't built, frontend `tsc`/`vite build` fails.
   Run `cd models && npm run build` before `npm run build` in `react-fe`.
3. **No database.** All Lunch state is in-memory (gone on restart; that includes
   the 4-hour retained results); TextCorpse state is one JSON file. Don't look for
   a DB/ORM.

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

12. **Routes have two sources of truth now.** Add pages to `App.tsx` **and**
    `react-fe/src/seo/routes.ts` (title/description/`render` mode); the build
    fails if they drift. `/backup` route is commented out.
13. **Home buttons vs routes mismatch**: `/claimjumpers` is reachable only by
    direct URL (no Home link). `/resume` gained a Home button in the 2026-10 SEO
    pass. `/text-corpse` has one.
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

## SEO & prerendering (added 2026-10)

25. **`npm run build` in `react-fe` is now three steps** (`tsc && vite build &&
    node scripts/prerender.mjs`). A bare `vite build` produces a shell-only
    `dist` — no `dist/<route>/index.html`, no fresh `sitemap.xml`/`404.html` — and
    the server will then 404 every app route. Always use the full build.
26. **A route lives in three places**: `App.tsx` (`<Route path>`),
    `react-fe/src/seo/routes.ts` (metadata + `render` mode), and
    `DYNAMIC_ROUTES` when the path has a parameter. `scripts/prerender.mjs`
    diffs the first two and fails the build on drift.
27. **Prerender is real SSR**: module-scope code must not touch `window`,
    `document` or `AudioContext`. `environment.ts` guards `window.location`;
    `pizzicato` only logs `No AudioContext found` at import. If a page starts
    crashing the prerender, mark it `render: "shell"` in `seo/routes.ts` rather
    than deleting the prerender step.
28. **`ssr: { noExternal: true }` in `scripts/prerender.mjs` is load-bearing.**
    MUI's ESM build imports directories (`@mui/material/utils`) that Node's ESM
    resolver rejects; externalizing dependencies breaks the prerender.
29. **Vite strips HTML comments** from production HTML, so the per-route head is
    delimited by `<meta name="seo:start">` / `<meta name="seo:end">` markers in
    `react-fe/index.html`. Don't convert them to comments.
30. **Unknown URLs now return 404 + `dist/404.html`** (Express and nginx), and
    `/about/` 301s to `/about`. A new client-only route must be prerendered,
    shell-rendered, or added to `DYNAMIC_ROUTE_PATTERNS` in `nest-server/src/main.ts`
    — otherwise it will 404 in production.
31. **Images and fonts are WebP / WOFF2 now.** `src/assets/*.png|jpg` and the
    `.ttf` files still exist as sources but nothing imports them (Vite only emits
    referenced assets). New artwork should be converted with
    `cwebp -q 82 -resize <w> 0 in.png -o out.webp` and given explicit
    `width`/`height`; fonts with
    `python3 -c "from fontTools.ttLib import TTFont; f=TTFont('x.ttf'); f.flavor='woff2'; f.save('x.woff2')"`
    (needs `pip install --user fonttools brotli`).
32. **`/slomo`, `/lunch`, `/text-corpse` are metadata-only shells.** Their HTML
    contains no page content by design — don't "fix" that by forcing them into
    the prerender list; they depend on sockets/audio at module scope.
33. **Lighthouse CI only runs on GitHub.** `.github/workflows/lighthouse.yml`
    needs Chrome + `@lhci/cli`; there is no local verification path yet.
34. **"SloMo is broken — no 🎸 genre button" is usually stale local state**
    (reported 2026-10-24, was not a code regression). `/slomo` is the only page
    whose UI needs the API, so a dead dev backend looks like a SloMo-only bug:
    the genre screen falls through to "No genres available" (or spins on
    "Loading genres…"), while every static page looks perfect. Diagnose in this
    order — (1) `curl localhost:4171/api/slomo/genres` must return `["🎸"]`
    (the genre *is* the emoji; there is exactly one genre folder); (2) the
    backend needs `npm install` in `nest-server` or it dies at boot on the new
    `compression` dependency; (3) `@emotion/server` in `react-fe/package.json`
    makes Vite re-optimize deps, so a tab left open across that reload can stick
    on the first render — hard reload or `rm -rf react-fe/node_modules/.vite`.
    To verify the *rendered* state, screenshot after a delayed `load` (headless
    Firefox `--headless --new-instance --profile`, wrapper page + slow script);
    a plain `--screenshot` fires at `load`, i.e. before `useEffect` resolves, and
    always shows "Loading genres…".
35. **Want markup indexed but not painted? Use `.sr-only`** (`react-fe/src/App.scss`,
    the standard 1px-clip utility). The home page's `<h1>` + description live in
    it so the landing page still renders as buttons only. Do **not** swap it for
    `display: none` / `visibility: hidden`: that drops the content from the
    accessibility tree and is the shape Google's hidden-text policy targets.
    Note the tradeoff — Google still indexes it, but hidden text carries less
    weight than visible text, so keep the things that matter (title, meta
    description, JSON-LD) outside it. `.sr-only` elements are `position:
    absolute`, so they add no layout box; `.home > *{display:flex}` in
    `Home.scss` does not conflict.

## Miscellaneous

22. **Root `package.json` `dependencies` is bloated** (hundreds of transitive
    packages). Not curated — don't treat it as the true dependency list.
23. **`deps/` and `b-site/` are vestigial.** Ignore them.
24. **`.DS_Store` files** are scattered in `src/` dirs (macOS artifacts).

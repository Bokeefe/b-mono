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
    — otherwise it will 404 in production. Routes that should never be crawled
    (scratch/preview pages) go in `ROUTES` with `noindex: true`: that still writes
    the `dist/<route>/index.html` shell, but tags it `noindex, nofollow` and
    skips it in `dist/sitemap.xml` (`/claimjumpers-back` is the example).
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
36. **A `background-size: cover` artwork can't have its overlay positioned in
    viewport percentages.** `Pages/Claimjumpers/Back.scss` anchors a text panel to
    the blank middle of `back_w_border.webp`: `--scale: max(calc(100vw / 1400),
    calc((100dvh - 64px) / 1394))` is rendered px per source px — the same `max()`
    that `cover` uses — and every overlay offset is `(source px) *
    var(--scale)` measured from the artwork centre. Viewport percentages drift as
    soon as `cover` crops one axis. Measure the target area in the image itself
    (PIL: scan the low-saturation run through the image centre) and keep the
    source-pixel numbers in a comment so they can be re-measured if the art
    changes. Also: `--stage-h` must subtract the 64px `.outlet` margin
    (`MainLayout.scss`), or the stage is a header-height too tall and the page
    scrolls.
37. **Demo fonts have holes — check coverage *and* width before assigning one.**
    `react-fe/src/assets/fonts/` holds a pile of free/demo cuts, all registered at
    the bottom of `App.scss` with one `.x-font` utility class each. Several are
    incomplete and the browser will not tell you: a missing glyph silently falls
    back *per character* to the next family in the stack (which is why every one
    of those stacks ends in `"Quicksand"`). Measured with `fontTools`
    (`TTFont(path).getBestCmap()`): **Kihre Vintage has no digits** (an `<ol>`'s
    markers would come from the fallback), **Biokes has no apostrophes** (neither
    U+0027 nor U+2019), BONESOUP has no `( ) & /` and is caps-only, Panhead has no
    `/`. Check width too, with
    `sum(hmtx[cmap[ord(c)]][0] for c in text) / head.unitsPerEm`: Kihre's
    "Claimjumpers" is 7.64em, so inside the 338-source-px back-cover panel it
    breaks mid-word above ~1.7em. Register the shipped `.otf`/`.ttf` directly
    (`format("opentype")` / `format("truetype")`) rather than deriving `.woff2`
    copies — a generated copy silently goes stale the next time the font is
    swapped, which is exactly what that page is for. Vite emits `.otf`/`.ttf`
    referenced from CSS into `dist/assets/` with a content hash, no config needed.

    Two more reasons not to trust a font binary's metadata: (a) filenames and
    internal names diverge — `LANCAS__.TTF` is "Lancaster", `_aeiou2U.ttf` is
    "_a e i o u", `DavysRibbons.ttf` is "DaRib", `PANHEAD_.ttf` is **`[PANHEAD]`**
    (the brackets are real in the Windows `name` record, the one browsers read, so
    an installed copy answers only to a quoted `font-family: "[PANHEAD]"`), and
    Kihre's records say "Kihre Vintage Demo". (b) `usWeightClass` is often wrong:
    `Roboto-Black.ttf` reports **400**, and its Condensed cuts are a *subfamily*
    rather than a width axis, so registering all 16 Roboto files under one family
    leaves four `(weight, style)` buckets with 2–3 files each and the browser
    silently keeps whichever came last. The `@font-face` descriptors are what CSS
    matches, so hand-write them per file and give Condensed its own family name.

38. **A display face's line box is not its ink, so negative margins on the `h1`
    only bite at small sizes.** The back page pulls the track list up with
    `h1 { margin: -30px 0 }`. At 1440×900 the heading's line box is 87px for 66.9px
    of type, the ink stops well above the box bottom, and the -30px reads as a
    pleasantly tight gap. At 390×844 the same -30px is *larger than the gap + the
    heading's descent*, so the ink of "Claimjumpers" (the `p`/`j` tails) lands on
    "1. tide's…" — measured overlap 22px (h1 bottom 370.8 vs first `<li>` top
    348.6), while the `<ol>` box still overlaps the `<h1>` box by 15.6px on
    desktop where nothing collides. Check the *ink*, not the box, at both widths:
    `getBoundingClientRect()` on the `h1` and the first `li` will report an
    overlap on desktop too. Any such margin belongs in `--scale` units
    (`calc(-8 * var(--scale))`) so it tightens proportionally instead of
    over-correcting on phones.

    Related: the panel is `display: flex; flex-direction: column; overflow-y:
    auto`. Because the overflow is not `visible`, the children's `min-height:
    auto` protection is dropped, so *if* the copy ever outgrows the panel the
    items shrink below their content and overlap rather than scrolling —
    the opposite of what the comment above `.claimjumpers-back-panel` promises.
    `> * { flex-shrink: 0 }` is the fix and is now in place (2026-10-27, when the
    player controls were added and the panel content grew); with it, `safe
    center` keeps the top of the copy reachable at the scroll origin instead of
    clipping it.

39. **A centred one-line heading has a fixed width budget, and `::first-letter`
    gets no allowance of its own.** Enlarging the first glyph adds
    `(N − 1) × glyphWidth` to the line, so size the initial off measurements, not
    taste: a Range over the `h1`'s contents gives the tight text width, a 1-char
    Range gives the glyph's advance, and `N_max ≈ 1 + (contentWidth − textWidth) /
    glyphW`. On this page that is 164 of 189px used at 390 wide and 301 of 347 at
    1440 — a 21px-wide "C" — so the masthead wraps just past 2em; it is set at
    1.8em to keep 6px. Everything scales with `--scale`, so the ratio holds at
    every width (checked at 320 too).
    `::first-letter` also inherits `line-height`, and at 1.8em that would grow the
    line box by ~half a line and push the list down (the panel only has ~21px of
    vertical slack at 390). `line-height: 0` takes the glyph out of line-box
    sizing, so the heading's height — and any negative margin pulling the next
    block up — is unchanged and the initial simply overhangs upward. Keep the
    overhang inside the panel's padding box: `overflow-y: auto` clips it.
    Prefer `::first-letter` over `<span class="initial">` for this: the DOM text
    stays `Claimjumpers`, so the prerendered shell, the sitemap and screen readers
    see the same string, and it is the same glyph — only painted bigger and red.

40. **An empty `<source src="">` makes the audio element fetch the page itself.**
    An empty `src` resolves against the document URL, so `<audio><source
    src="" type="audio/mpeg"></audio>` requests `/claimjumpers-back` as media
    and fails to decode it — a wasted request plus a console error, exactly in
    the state where the API is already down. Render the tag conditionally
    (`{url && <source src={url} />}`): with no `<source>` the element stays at
    `networkState: 0` (EMPTY) and requests nothing.
    Related, same player: `play()` rejects with `NotAllowedError` when autoplay
    is blocked and `AbortError` when a `load()` cancels it mid-flight, so derive
    the play/pause icon from the element's own `onPlay`/`onPause` events instead
    of the click — a click-local flag shows "Pause" over a paused player.

41. **A filename's case is a production-only bug.** Vite resolves `url()` /
    `@import` paths through the local filesystem, so a reference that differs
    only in case from the real file builds fine on macOS (APFS is
    case-insensitive) and then breaks on the Linux build that produces the
    container. An *unresolvable* CSS `url()` is not even a warning: Vite leaves
    it relative, so `Pages/Claimjumpers/Claimjumpers.scss`'s
    `url("../../assets/front_w_border.webp")` — the file was
    `Front_w_border.webp` — shipped verbatim, the browser resolved it against
    the stylesheet's own directory, `GET /assets/front_w_border.webp` was a
    404, and the page painted nothing but `background-color: #fff7d6` (cream).
    Symptoms: the image is missing **only** on the deployed site (the back
    cover, whose filename matched exactly, was fine); `npm run dev`, `vite
    build` and `vite preview` locally all look correct. Fast check: grep the
    built CSS for `url(../` — production output should contain only
    `/assets/<name>-<hash>.<ext>` and absolute `public/` paths like
    `/grex.webp`. Verify with case-sensitive `os.listdir` lookups, not
    `os.path.exists`/`test -f`, or you reproduce the same blind spot. Fix by
    making the spelling match exactly (`git mv` the file if the *reference* is
    the sensible spelling).

## Miscellaneous

22. **Root `package.json` `dependencies` is bloated** (hundreds of transitive
    packages). Not curated — don't treat it as the true dependency list.
23. **`deps/` and `b-site/` are vestigial.** Ignore them.
24. **`.DS_Store` files** are scattered in `src/` dirs (macOS artifacts).

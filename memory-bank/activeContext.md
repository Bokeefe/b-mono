# Active Context — b-mono

> Current work focus, recent changes, next steps. Update this file at the end of
> every meaningful session.

## Session snapshot — 2026-10-22

- **Branch:** `feature/new` at `53134a1` "fixes for lunch app" (tracked on
  `origin/feature/new`).
- **Working tree:** clean at time of writing (ignore `.DS_Store` noise).
- **Just done:** initialized `memory-bank/` (all six core files).
- **Recent commits (newest first):** lunch-app fixes → mobile background link
  restore → static file copy fixes → API-served MP3 work (3 commits) →
  claimjumpers demo page → music page basics → home button animation →
  explainer/cleanup → text-corpse write fix → "cline added a bunch of steering".

## Current focus

1. **Lunch app stability on mobile.** Recent commits target the background/
   reconnect path: the client re-emits `joinRoom` on socket reconnect and on
   `visibilitychange` so a backgrounded phone still sees the winner. The gateway
   replays `winner`/`completedAt` for finished rooms (4h retention) and keeps
   empty in-progress rooms for 2 minutes.
2. **Claimjumpers audio.** A new mini-app (`/claimjumpers`) that lists and plays
   MP3s from `nest-server/public/audio/claimjumpers`; served both by
   `/api/claimjumpers/:filename` (Range-capable `sendFile`) and the static
   `/audio/claimjumpers/...` path. This is the newest feature and the least
   battle-tested.
3. **Static asset serving correctness.** `main.ts` now skips SPA fallback for
   `/api`, `/audio`, `/assets`, `/socket.io`, `/backup` so missing JS chunks 404
   instead of returning `index.html`.

## Active decisions & considerations

- **`.steering/` docs are partly stale.** `architecture.md` / `domains.md` still
  say `react-fe/src/domains/` and list `Pages/Examples`; reality is
  `react-fe/src/Pages/` with no `Examples` routes. Trust the code and
  `memory-bank/systemPatterns.md`, not the folder name in those docs.
  (Fixing `.steering/` is an open candidate task.)
- **New feature checklist is unchanged:** server module → shared type → page →
  route → Home button.
- **URL-only pages are normal here.** `/resume` and `/claimjumpers` work but have
  no Home button; do not "fix" this without asking — it may be intentional
  sequencing.
- **CI/CD still needs a human check.** `PIPELINE_ISSUES.md` states the pipeline
  was worked around by manual SSH; the file is **append-only** — add dated
  entries, never rewrite.
- **Lunch and TextCorpse sockets are deliberately different.** Don't refactor
  them into one client as drive-by cleanup.

## Patterns & preferences observed in this repo

- Commits are short, lowercase, sometimes joking ("faux push", "fake change").
  Several are DevOps retries — expect redundant-looking history.
- Comments are informal and explanatory ("faux push", "curl -X GET ..." usage
  examples above controller methods). Preserve that style; usage comments are
  welcome.
- Fail-soft services: wrap `fs` reads in try/catch, `console.error`, return `[]`.
- Security-sensitive bits are hardcoded rather than configured
  (`MASTER_PASSWORD = 'corpseunlock'`, `/backup` password via env).
- Local models are the primary coding driver; dense context files pay off.

## Next steps (suggested, not committed)

1. Decide whether to refresh `.steering/architecture.md` + `domains.md` to match
   `Pages/` and include Claimjumpers.
2. Add a Home button for `/claimjumpers` (and decide on `/resume`).
3. Verify CD actually deploys unattended (per `PIPELINE_ISSUES.md` goal) and
   append a dated entry with the result.
4. Consider moving the Lunch client to the `/text-corpse` shared pattern or at
   least documenting the divergence.
5. Add a minimal test for `LunchGateway` room lifecycle (retention/grace), since
   that logic is the most time-sensitive and currently untested.

## Session log

### 2026-10-22
- Created `memory-bank/` six core files from verified repo state.
- Confirmed: branch `feature/new` @ `53134a1`; routes include `/claimjumpers`;
  pages live under `react-fe/src/Pages/`; no frontend tests exist; backend has
  three `.spec.ts` files.
- No source code modified.

### 2026-10-22 (later) — page background unified for desktop + mobile
- `react-fe/src/App.scss`: page background moved off `body` onto a fixed,
  viewport-sized `body::before`; the whole `@media (max-width: 768px)` background
  block deleted. Added `html { background-color: var(--brown) }` as the
  overscroll fallback.
- Why: the mobile override set `background-attachment: scroll`, which changes the
  **background positioning area** from the viewport to the whole document. Since
  `background-size: 200px` means `200px auto`, the gradient layer's `auto` height
  becomes 100% of that area — so on phones the lavender→brown ramp was stretched
  across the entire scroll height (you only saw the top slice) and the 200px tile
  grid was re-centred on the document. The compensating `body::before` hack then
  added a *second* grex.jpg copy at its natural 1024px scale with `opacity: .3`
  and no `multiply` blend, which is why mobile looked larger-celled and washed
  out.
- Verified with headless Firefox screenshots at 1200px and 390px: desktop
  rendering is byte-identical (same PNG md5) before/after, and mobile now shows
  the same ramp + 200px cell scale, pinned to the viewport while scrolling.
- `npx vite build` passes; minified CSS contains the new rule.

### 2026-10-22 (later) — Claimjumpers tracklist now comes from the API
- `react-fe/src/Pages/Claimjumpers/Claimjumpers.component.tsx`: deleted the
  hardcoded 8-file `allAlbumFiles` array (leftover from the demo commit
  `f73d7c8`, before `2b378fa` "serve mp3 from api") and seeded it from
  `apiService.getClaimjumperTracks()` (`GET /api/claimjumpers`).
- Also dropped a dead `nextIdx` line in `nextTrack` and guarded
  `selectTrackByIndex` against a missing index (the list is empty for one frame
  while the fetch is in flight).
- Server returns the same 8 filenames in the same order (`localeCompare`), so
  display order and `file.slice(3)` title trimming are unchanged.
- Verified in Firefox 158 over WebDriver BiDi (CDP is gone in FF 129+; drive
  `ws://127.0.0.1:9222/session` from Node 24's built-in WebSocket):
  8 `<li>` rendered from the API, first track active, next/next/prev moved to
  "Untangle" with the matching `/audio/claimjumpers/02%20Untangle.mp3` src.
- `tsc --noEmit` and `eslint` clean. Remaining dead code noted, not removed:
  `services/api.service.ts#getClaimjumperTrack` (singular, returns
  `response.url`) and `Pages/Claimjumpers/readDirectory.js` (Node `fs` helper,
  imported nowhere).

### 2026-10-22 (later) — Claimjumpers controls: emoji → Font Awesome
- Added `@fortawesome/fontawesome-svg-core` ^7.3, `@fortawesome/free-solid-svg-icons`
  ^7.3, `@fortawesome/react-fontawesome` ^3.5 to `react-fe/package.json`
  (lockfile updated; the Dockerfile installs from `package*.json`, so prod is fine).
- Buttons are now `faBackwardStep` / `faPlay`↔`faPause` / `faForwardStep` with
  `aria-label`s; the play button swaps to pause from the audio element's own
  `onPlay` / `onPause` events (not a click-local flag), so it stays correct when
  autoplay is rejected, when a track ends, and when playback is toggled elsewhere.
  `.controls-container button` gained `cursor: pointer`.
- Dev-server gotcha: an already-running Vite server returns `504 Outdated
  Optimize Dep` for newly added deps until it re-optimizes; a normal browser
  auto-reloads, but verify icon work on a fresh port (`vite --port 5199`) if
  screenshots look empty.
- Verified over BiDi: 8 items, labels/icons `backward-step|play|forward-step`,
  `play()` → `pause`, click → `play`, click → `pause`. `vite build` passes.
- Controls now fill the card: `.controls-container { width: 100% }` (the card is
  `align-items: center`, so a `column` flex child is content-width by default)
  and `button { flex: 1 }` → three equal thirds (283px content box − 2×10px gap
  ÷ 3 = 88px each, 40px tall) with `padding: 8px 0`, `border-radius: 8px`,
  `rgba(0,0,0,.06)` background and a `.14` hover — mirrors `.active-track`'s
  tint/radius instead of the default `buttonface` grey slabs.

### 2026-10-22 — new display fonts registered
- User dropped five font folders into `src/assets/fonts/` (still **untracked** in
  git): `aesthetic-curves-demo/` "Aesthetic Curves Demo" (.ttf + .otf),
  `classical-blending-demo/` "Classical Blending Demo" (.ttf + .otf),
  `darib/DavysRibbons.ttf`, `enathica/Enathica Demo.ttf`,
  `underdove/Underdove-Regular.ttf`. Pre-existing fonts live in
  `src/style/fonts/` (Caesar, Oxygen, Quicksand, Astloch, Major Mono).
- All five registered at the bottom of `App.scss` as `@font-face` (`.ttf`,
  `format("truetype")`, `font-display: swap`) + one `.x-font` utility class each,
  matching the Caesar/Oxygen/Quicksand pattern. Relative `url("./assets/...")`
  paths are rewritten/hashed by Vite; **spaces in the filenames are fine** and
  the build emits e.g. `Aesthetic Curves Demo-CGPgLcZI.ttf`.
- Licensing/quality notes: the 177Studio demos ("Aesthetic Curves",
  "Classical Blending") inject a `FREE FOR PERSONAL USE` watermark glyph and are
  very wide; "Davy's Ribbons" renders lowercase as ornamental ribbons; Enathica
  Demo has odd digit glyphs. "Underdove" (blackletter) is the most legible.
- Demo wiring: `<div className="claimjumpers-title">` + `.claimjumpers-title
  { font-family: "Underdove", "Quicksand", sans-serif; font-size: 2rem }` in
  `Claimjumpers.scss` — page-scoped, so swapping families is a one-line change.
- Verified: all six faces report `loaded` in `document.fonts`; title width 224px
  in Underdove vs 304px in `sans-serif` (proves no fallback); 8 tracks; desktop
  and 390px mobile screenshots good; `vite build` emits all five fonts.
- Gotcha for future verification runs: the LAN API (`10.210.155.132:4171`) can
  take >2.5s, so BiDi screenshots need a ~3.5-4s wait or the list renders empty;
  and the BiDi harness needs a fresh headless Firefox per run (a second session
  on the same browser throws).

### 2026-10-22 — square cover image on Claimjumpers
- `//HERE` placeholder (which was rendering as literal JSX text) replaced with a
  square cover image: `import frontImage from "../../assets/Front_w_border.jpg"`
  (same asset-import pattern as `About.component.tsx`'s `performa.png`) +
  `<img className="claimjumpers-image" alt="Claimjumpers cover" />`.
- `.claimjumpers-image { width: 100%; max-width: 320px; aspect-ratio: 1 / 1;
  object-fit: cover; border-radius: 12px }` → measured 320×320 desktop /
  318×318 at 390px viewport, ratio exactly 1.0000. Source is 2859×2865 (0.2%
  off square) so `cover` crops ≈3px total — effectively the whole image.
- TODO-ish: `Front_w_border.jpg` is **6.8 MB / 2859px**; `vite build` copies it
  as-is (`Front_w_border-<hash>.jpg`, 6.5 MB). Downscale before shipping, e.g.
  `sips -Z 1200 --setProperty formatOptions 80 src/assets/Front_w_border.jpg`.
- Title is now three stacked `.claimjumpers-title` divs ("Claimjumpers", "~",
  "demo") at `font-size: 3rem; line-height: 0.5` — user's own edit.

### 2026-10-22 — Claimjumpers-only background (`back_w_border.jpg`)
- The site's background is `body::before` in `App.scss`: fixed, z-index -1,
  `linear-gradient(lavender,brown)` + `url("/grex.jpg")` (public/), `multiply`,
  `200px repeat`. To vary it per page, **don't edit that block** — override it.
- Mechanism used: `useEffect` in the page adds `claimjumpers-page` to
  `document.body` and removes it in the cleanup, then
  `body.claimjumpers-page::before { background-image: url("../../assets/back_w_border.jpg");
  background-color: #fff7d6; background-size: cover; background-repeat: no-repeat;
  background-position: center; background-blend-mode: normal }` in
  `Claimjumpers.scss`. Class selector beats `body::before` on specificity, so
  load order is irrelevant; cleanup keeps it route-scoped (StrictMode's
  effect→cleanup→effect cycle re-adds it correctly).
- `background-blend-mode: normal` is the load-bearing reset — inheriting
  `multiply` would blend the photo with the cream color and darken it.
  `#fff7d6` was sampled from the artwork's own border (canvas getImageData).
- Tried `contain` + cream gutters first (probe: /tmp/bgtest/bgprobe.mjs):
  at 1366×768 the artwork is only 772px wide — narrower than the 800px card —
  so the frame was hidden behind the card and flat cream strips showed at the
  sides. `cover` instead keeps the illuminated borders flanking the card.
- Verified at 1366×768 and 390×844: computed `background-image` is the asset for
  `/claimjumpers` and reverts to the grex stack on `/about` (class gone, `grex.jpg`,
  `multiply`, `repeat`); 8 tracks still render; `vite build` emits
  `back_w_border-<hash>.jpg` and references it from the CSS.
- Caveat: the artwork is square (2847×2834) and 1.8 MB. On a 390px phone, `cover`
  scales it to the viewport height, so the 318px card covers most of it — only
  thin strips of the border show. Also note `Header` stays translucent lavender.







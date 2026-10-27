# Active Context — b-mono

> Current work focus, recent changes, next steps. Update this file at the end of
> every meaningful session.

## Session snapshot — 2026-10-27 — masthead extracted to `ClaimjumpersTitle`

- **Ask:** the band-title styling was copy-pasted across pages; make it one
  reusable component (needed in 3 places).
- **New component:** `src/components/ClaimjumpersTitle/` —
  `ClaimjumpersTitle.component.tsx` + `.scss`. Props: `as` (heading level,
  default `h1`), `children` (default `"Claimjumpers"`), `className`, `versal`
  (default `true`). It renders
  `<h1 class="claimjumpers-title claimjumpers-title--versal">Claimjumpers</h1>`;
  the illuminated initial is `::first-letter` CSS only, so the DOM, the
  prerendered HTML and screen readers keep the same plain string.
- **The type recipe now lives once:** Underdove → Quicksand,
  `font-weight: normal`, `letter-spacing: 0`, antialiased/grayscale,
  `filter: blur(0.3px)`, and the 1.8em red versal with its -0.31em drop. Pages
  tune two custom properties instead of restating the rules:
  `--claimjumpers-title-size` (default `3rem`) and
  `--claimjumpers-title-leading` (default `normal`). The back cover sets the
  size in `--scale` units and keeps its measured negative margins; `/music` sets
  only the leading (0.5) and passes `versal={false}` ("The Claimjumpers" starts
  on a `T`, which Underdove does not ship — a versal would fall back to
  Quicksand mid-word).
- **Sizing datum** (font `hmtx`, not guessed): "Claimjumpers" is 4.655em wide in
  Underdove, 0.614em of which is the `C` — with the 1.8em versal the mark is
  ~5.15em, i.e. ~247px at 3rem, so it fits the 480px landing column on one line.
- **`--art-red` moved to `style/variables.css`** (`:root`): the versal and the
  back cover's now-playing track now share the sampled red, and `Back.scss` no
  longer declares it locally.
- **Bug fixed by the extraction:** the rewritten front page had added a bare
  `h1 { … }` block to `Claimjumpers.scss`. Vite bundles page CSS globally, so
  that rule was re-painting **every** `h1` on the site in Underdove with a red
  first letter, and its `font-size: calc(65 * var(--scale))` was invalid on
  `/claimjumpers` (`--scale` only exists on `.claimjumpers-back`) — the landing
  masthead was falling back to the inherited 16px. It is class-scoped now, at a
  real 3rem.
- **Verified:** `tsc --noEmit` + eslint on the touched files + `npm run build`
  (vite + prerender) all green; the bundle contains only `.claimjumpers-title*`
  rules for Underdove, and `dist/claimjumpers/index.html` /
  `dist/music/index.html` carry the expected class names.
- **Dead CSS left in place on purpose** (`Claimjumpers.scss`, from the removed
  front-cover player): `.claimjumpers-container`, `.active-track`,
  `.claimjumpers-image`, `.controls-container` and `audio { display: none }`
  (a *global* hide). Also `.page-container { max-width: 480px }` there applies
  to every page — it is what keeps `/music` narrow, so scoping it would widen
  the whole site and needs its own change.

## Session snapshot — 2026-10-27 — `/claimjumpers-back` is now a working player

- **Ask:** wire prev / play-pause / next, click-a-track and auto-advance into the
  back cover, ported from the front-cover player. Route stays
  `/claimjumpers-back` (still unlinked), `/claimjumpers` untouched.
- **Component (`Back.component.tsx`).** Same data path as the front cover:
  `apiService.getClaimjumperTracks()` → sorted filenames, streamed from the
  static `${baseUrl}/audio/claimjumpers/` mount (not the controller's
  `sendFile`). State is `allAlbumFiles` / `currentIndex` / `isPlaying` plus
  `autoPlayRef`; an effect on `currentFileUrl` calls `audio.load()` and then
  `play()` when the change came from a user gesture (called straight from the
  handler, which keeps the gesture alive for mobile autoplay rules). `play` is a
  `useCallback` so that effect doesn't re-`load()` on every render, and the
  same-index case calls it directly instead of via a state change.
- **`isPlaying` is driven by the element**, not by the click: `onPlay`/`onPause`
  set it, so the button stays honest when autoplay is rejected, when the track
  ends (`onEnded={nextTrack}`) or when playback stops anywhere else.
- **The printed titles are curated and do not match the filenames**
  (`03 Sad World (The Millenium cover).mp3` prints as "Sad World* / feat
  Gwendolyn Stanley"), so `TRACKLIST` is paired **positionally** with the sorted
  API list: entry `i` plays file `i`. Reordering or renaming on disk means
  editing that array. Because the route is `noindex`, `prerender.mjs` emits a
  metadata **shell** for it rather than SSR'd markup, so the track titles exist
  only in the client bundle (checked: no "Tide" in
  `dist/claimjumpers-back/index.html`, and `sitemap.xml` has no entry).
- **Controls are real `<button>`s** with `disabled={!hasTracks}`; the eight list
  entries are buttons too (disabled until their file exists,
  `aria-current="true"` on the now-playing one) so the page keeps its printed
  numbering while being keyboard reachable.
- **CSS (`Back.scss`).** Player rules are scoped under
  `.claimjumpers-back-panel .controls-container` because `Claimjumpers.scss`
  styles `.controls-container` too (front cover, fixed rem); everything here is
  in `--scale` units. `justify-content: safe center` + `> * { flex-shrink: 0 }`
  is gotcha #38's fix, applied now that the controls make the panel content
  taller.
- **Verified (headless Firefox over WebDriver BiDi, 390×844, real dev servers):**
  play → `paused: false`, icon/label flips to "Pause"; next → `02 Untangle.mp3`;
  seeking to `duration - 0.6` fires `onEnded` and auto-advances to track 2; prev
  from 1 wraps to 8, next from 8 wraps to 1; clicking list entry 6 loads
  `06 Scatteredgood.mp3`; next while paused starts playing (same as the front
  cover). With `GET /api/claimjumpers` stubbed to reject: no `<source>` is
  rendered (`networkState: 0`, no request) and every control is disabled and
  inert. `npx tsc --noEmit` and ESLint clean on the page.
- **Layout measured** at 320×640, 390×844, 844×390 and 1440×900: content fits the
  panel with no internal scroll at 320/390/1440 (panel 343.5px vs 344px of
  content at 390). In landscape the panel is still cropped vertically by `cover`
  (pre-existing) and the fine print now ends ~2px past the stage edge.
- **New gotcha #40:** an empty `<source src="">` resolves to the document, so the
  audio element fetches the page as media — render the tag conditionally.

## Session snapshot — 2026-10-26 — scratch page `/claimjumpers-back`

- **Ask:** a new frontend page inside `react-fe/src/Pages/Claimjumpers/`, "back",
  on route `/claimjumpers-back`, deliberately **unlinked** (no Home button, no
  link from `/claimjumpers`) — a private playground page.
- **Files:** `Pages/Claimjumpers/Back.component.tsx` + `Back.scss`, a
  `<Route path="/claimjumpers-back">` in `App.tsx`, and one entry in
  `seo/routes.ts` (required — `scripts/prerender.mjs` fails the build when the
  two route lists disagree).
- **New `RouteSeo.noindex` flag (optional).** A `noindex` route still gets a
  `dist/<route>/index.html` shell so the URL 200s through Express/nginx, but its
  `<meta name="robots">` is `noindex, nofollow`, `resolveSeo` reports
  `noindex: true` in the browser, and `scripts/prerender.mjs` filters it out of
  `dist/sitemap.xml`. Reuse it for future scratch/preview pages instead of
  leaving them out of `ROUTES` (which would make them 404 in production).
- **Verified:** `models` build → `npx tsc --noEmit` clean → `npm run build`
  (prerender logs `/claimjumpers-back shell`) → `node dist/main.js` + curl:
  `/claimjumpers-back` **200** with the right title and noindex,
  `/claimjumpers-back/` **301**, `/nope-not-real` still **404**, and
  `sitemap.xml` still lists only the original 8 routes.
- **Follow-up, same day — the back cover became the page background.** The page
  now paints `assets/back_w_border.webp` as a `cover`-sized background and
  exposes `.claimjumpers-back-panel`, a text container sitting over the blank
  cream panel in the artwork (measured on the image: x 490–879, y 419–1038 of
  1400×1394). Overlay offsets use
  `--scale: max(calc(100vw / 1400), calc((100dvh - 64px) / 1394))` — rendered px
  per source px, the same `max()` `cover` uses — so the copy stays inside the
  painted border while `cover` crops one axis. The old `.page-container` card was
  dropped, because the artwork has to be full-bleed. Verified with headless
  Firefox `--screenshot` at 390×844, 844×390 and 1440×900 (text centred inside
  the panel in all three; in landscape the panel is cropped vertically but the
  copy is still centred).
- **Follow-up, same day — type experiments.** Every face in `src/assets/fonts/` is
  now registered at the bottom of `App.scss` (the 4 new drops — BONESOUP, Biokes,
  Kihre Vintage, Panhead — plus 4 that had been sitting there unregistered:
  Lancaster, Rotunda Pommerania, MK Broken Types, AEIOU), each with a `.x-font`
  utility class, matching the Caesar/Oxygen/Quicksand pattern. `src` points at the
  shipped `.otf`/`.ttf` (`format("opentype")` / `format("truetype")`) so swapping a
  file needs no other change; `npm run build` emits all 8 into `dist/assets/` with
  content hashes. `Roboto`'s 15 weight files are deliberately still unregistered.
  `Back.scss` now assigns **"Kihre Vintage" to `h1`–`h3`** and **"Biokes" to the
  panel copy** (one-line swaps; every other face is an `.x-font` class away).
  Two consequences worth remembering: Kihre is 7.64em wide for "Claimjumpers", so
  the masthead dropped from `2.5em` to `1.6em` (and lost its
  `letter-spacing: 0.03em`) to stay inside the 338-source-px panel, and Biokes has
  no apostrophes at all, so `'` in "Tide's"/"Comin'"/"Sun's" renders from
  Quicksand via per-glyph fallback. Coverage holes for all of them are in
  `.steering/gotchas.md` #37. Verified at 1440×900 and 390×844: heading ink
  321px of the 347px content box, and the track list now fits on one line per
  entry ("8. The Colors that Make the World" no longer wraps). `npm run build` is
  clean; `npm run lint` fails in this checkout on 54 pre-existing problems
  (App.tsx, SloMo, Music, Resume, …) — none in the files touched here, and ESLint
  does not lint `.scss`.

## Session snapshot — 2026-10-26 (later) — font housekeeping: Roboto in, `*-demo` out

- **Ask:** register Roboto, delete every font folder ending in `*-demo`, and
  lower-case the track list with CSS.
- **Roboto registered** as **two** families at the bottom of `App.scss`, 16
  `@font-face` rules with hand-written weights: `"Roboto"` 100/300/400/500/700/900
  (+ italic each, 12 files) and `"Roboto Condensed"` 400 + 700 (+ italic each, 4
  files), plus `.roboto-font` / `.roboto-condensed-font`. The files' own metadata
  can't be trusted (`Roboto-Black` claims `usWeightClass 400`; Condensed is a
  subfamily, not a width axis) — see gotcha #37. `.ttf` only, no `.woff2`, so
  `dist/assets/` now carries 21 `.ttf` (~2.7 MB of Roboto among them); browsers
  still fetch a face only when a page uses it. Fallback is
  `"Helvetica Neue", Arial` rather than Quicksand, since Roboto is a grotesque.
- **`*-demo` folders removed.** `aesthetic-curves-demo/` (27.6 MB, mostly specimen
  PNGs) and `classical-blending-demo/` were **deleted from the worktree during this
  session** (files on disk gone, `git status` still tracking them as ` D` — the
  build earlier in the session had still emitted
  `dist/assets/Aesthetic Curves Demo-ZVGIB-hm.woff2`, so the deletion came after
  it, from outside these edits). Their `@font-face` rules and `.x-font` classes are
  gone; `git checkout -- <path>` restores either folder.
  `kihre-vintage-demo/` and the new `whiskey-ranch-demo/` are **untracked**, so
  `rm` would have been unrecoverable — they were **moved to
  `/tmp/b-demo-fonts-quarantine/`** instead. Nothing referenced Kihre any more
  (the panel is on `"aeiou"` copy + `"Underdove"` headings), so its `@font-face`
  and `.kihre-vintage-font` went too, and the stale Kihre comment in `Back.scss`
  was rewritten to state the panel's 338-source-px width constraint without it.
  **Still to decide:** `enathica/Enathica Demo.woff2` is a personal-use demo cut
  too — the only `Demo` file left, and the next thing to replace if the site ever
  sells anything.
- **Track list lower-cased in CSS only:** `text-transform: lowercase` on the
  panel's `ol, ul` in `Back.scss`. Paint-time only — the text nodes keep their
  capitals, so the DOM, prerendered HTML, and screen-reader/crawler text are
  unchanged. It inherits into `.subnote`, so credits lower-case too.
- **New coverage hole:** `"Underdove"` (the current heading face) has **no
  uppercase `T` and no `0`** — recorded in the `App.scss` inventory. The
  lowercase list dodges it by accident; a drop cap or an uppercase "T" would fall
  back to Quicksand mid-word.
- **Gotcha #38:** the `h1 { margin: -30px 0 }` the page uses to tighten the gap
  collides with line 1 at 390×844 (measured 22px overlap) while looking fine at
  1440×900 — a display face's line box is much taller than its ink, so negative
  margins need `--scale` units. Same gotcha notes that the panel's
  `overflow-y: auto` cancels flex `min-height: auto`, so children would shrink and
  overlap instead of scrolling if the copy outgrows the panel
  (`> * { flex-shrink: 0 }` is the fix if it ever does).
- **Versal on the masthead.** The `C` of "Claimjumpers" is red (`--art-red:
  #c8502c`, sampled from the artwork's painted border — no new palette entry in
  `style/variables.css`) and 1.8em, via `h1::first-letter` — CSS only, so the DOM
  and the prerendered shell still say `Claimjumpers` and the letter is the same
  letter, just painted larger and red. Size is measured, not chosen: the word
  already used 164 of 189 rendered px at 390 wide for a 21px-wide `C`, so 2em left
  1.6px and would wrap on any metric difference; 1.8em keeps 6px (11.5px at
  1440), one line at 390/1440/320. `line-height: 0` on the pseudo-element keeps
  the taller glyph out of line-box sizing, so the h1's height and the `-18px`
  margin pulling the list up are untouched (`panelFreeV` stayed 21.1px at 390) and
  the C overhangs upward like a real versal — gotcha #39 has the formula.
  Roboto); every `url()` in `App.scss` resolves on disk; `npm run build` exits 0
  with only the pre-existing chunk-size warning and prerenders all 9 routes;
  `dist/assets/` has 21 `.ttf` + 6 `.woff2`; no `Kihre`/`Aesthetic`/`Classical`
  left in the built CSS; headless screenshots at 1440×900 and 390×844 show the
  list in lower case.

## Session snapshot — 2026-10-25 — second playlist download (`The World Is Getting Worst (Acoustic)`)

- Scraped `open.spotify.com/playlist/7K6qCYaSM1ZfmBpKxtgVn2` with
  `--source browser` → **133/133 tracks, 0 missing albums** in ~7.5 s, written to
  `tools/spotify-playlist/out/playlist2.json`.
- CSV `out/sockseek-the-world-is-getting-worst-acoustic.csv`; downloads land in
  `~/Music/playlist-out/sockseek-the-world-is-getting-worst-acoustic/`.
  First run: **106/133** downloaded (88 mp3, 17 flac, 1 alac/m4a, 1.4 GB, no
  `.incomplete` leftovers, ffprobe spot-check clean); 27 failed — 21
  `No search results` (reason 9), 6 `All downloads failed` (reason 4).
  Re-run is resumable (state 1 skipped, state 2 retried).
- **Sockseek path rules confirmed from source:** a CSV's basename becomes
  `JobList.ItemName`, which becomes the default output subfolder
  (`Csv.cs:59-60`, `FileManager.cs:91-97`), and `_index.csv` defaults inside
  that folder (`JobPreparer.cs:199-202`). So every playlist fed as
  `sockseek-tracks.csv` shares one folder + index; pass `--csv` with a distinct
  basename to separate them.
- **`--name-format` caveat:** paths are joined to the output dir
  (`FileManager.cs:252-260`), so `'{artist}/{album}/{title}'` *replaces* the CSV
  subfolder rather than nesting inside it — include `{default-folder}` to keep it.
- The first library folder is now `~/Music/playlist-out/mtv3/` (renamed from
  `sockseek-tracks/`); the new playlist folder sits beside it.

## Session snapshot — 2026-10-24 (evening) — local Spotify playlist scraper (`tools/spotify-playlist/`)

- **Ask:** a local tool that turns a public Spotify playlist into a numbered
  song/album/artist list (example: `open.spotify.com/playlist/4xcMWLMk7VDLfvxeI4Sg3p`).
- **Shipped:** `tools/spotify-playlist/spotify_playlist.py` (stdlib only, Python
  3.9+, ~1100 lines), `README.md`, `test_spotify_playlist.py` (24 unittest
  cases, **all green**, no network — local `http.server` mock). Nothing in the
  build/CI/Docker path changed; the script is standalone.
- **Why not one scraper:** the playlist page is client-rendered and
  `open.spotify.com/get_access_token` / `api-partner` / `api.spotify.com` all
  return 403/401 anonymously (verified 2026-10-24). What *does* work without
  auth is `open.spotify.com/embed/playlist/<id>`, whose `__NEXT_DATA__` blob has
  title + artists + duration for **up to 100 tracks** — but **no album name**
  (verified: the string `album` does not appear in the blob). Hence:
  - `--source auto` (default): official Web API when `SPOTIFY_CLIENT_ID` /
    `SPOTIFY_CLIENT_SECRET` are set → album, pagination, ISRC, release date;
  - otherwise embed scrape + album fill from public **Deezer** search
    (`api.deezer.com/search?q=`), matched on normalised title + duration ±4 s +
    artist-token overlap, 5 threads paced at ~8 req/s (54 s → 12.7 s for 100
    tracks). Live result on the example playlist: **81/100 albums resolved**;
    misses are real catalogue gaps (e.g. William Onyeabor "Fantastic Man",
    Droopy Eye), not matcher bugs.
- **Formats:** `table` (default, aligned numbered columns), `list`
  (`1. Song — Album — Artist`), `markdown`, `csv`, `tsv`, `json`; `-o FILE` with
  extension-inferred format, `--fields`, `--max-col`, `--no-enrich`,
  `--no-header`, `--quiet`. Exit 0/1, warnings on stderr.
- **Web API notes encoded:** try `/playlists/{id}/items` first and fall back to
  `/tracks` (403 for apps created after 2024-11-27), skip `track: null` entries,
  treat `type: episode` as album = show name, and stop at 20 000 entries.
- **Not verified:** the Web API path against the real Spotify API (no client
  credentials available) — covered only by the mock-server tests. First real run
  with credentials should be treated as the acceptance test.
- **Follow-up (same day) — `--source browser`.** Added
  `tools/spotify-playlist/browser/scrape_playlist.mjs` (Playwright, its own
  `package.json`; `node_modules` is git-ignored) plus `--source browser` in the
  CLI. **Live result: the example playlist is 138 tracks** (`total_on_spotify:
  138`, **0 empty albums**) — so the embed's 100 was genuinely truncation.
  Parsing: `[data-testid="tracklist-row"]` → numeric first `[role="gridcell"]`
  (the "Recommended" rows have no number) + `a[href*="/track|artist|album/"]`.
  The grid is virtualised, so rows must be **accumulated while scrolling**
  (`mouse.wheel`); reading the DOM once at the end captured only 28/138.
  Also added `added_at` (Date added) to the Track model, JSON and `--fields`.
- **No anonymous-API route exists:** `open.spotify.com/api/token` now answers
  `400 … "Usage of this endpoint is not permitted under the Spotify Developer
  Terms and Developer Policy, and applicable law"` (with or without `totp`
  params), so the old TOTP/token scraping approach is closed. The browser route
  works logged-out (h1 + rows render for anonymous visitors) but is ToS-gray and
  markup-dependent — document as personal use only.
- **Follow-up — `tools/soulseek-dl/` (playlist → files).** SoulseekQt has **no
  CLI/API/IPC** (its only listeners are the peer ports 59080/59081) and Soulseek
  allows one session per account, so the GUI can't be driven. Built a bridge to
  **Sockseek** (the renamed `sldl`/`slsk-batchdl`, v3.0.6, single binary):
  `sync.py` converts `playlist.json` → `sockseek-tracks.csv`
  (`Artist,Title,Album,Length`, which Sockseek auto-detects) and shells out with
  `--skip-music-dir` / `--print jobs` (dry run) / `--limit` / `--pref-format`.
  Verified: the real export produced **138/138 parsed jobs** via
  `--print jobs` (no credentials, no network); 19 unit tests green. Sockseek's
  own Spotify input is unusable here (needs a dev app **and** Premium), which is
  why the CSV bridge exists.
- **Live download verified (same session, after the user fixed their Soulseek
  password):** `--limit 2` → login OK → search → download →
  `Completed: 2 succeeded, 0 failed`. One peer went stale after 30 s and
  Sockseek auto-retried another user and succeeded (normal P2P behaviour). Both
  mp3s `ffprobe` clean (338 s / 151 s, ~320–380 kbps VBR, correct tags). Files
  land in `<output-dir>/sockseek-tracks/` (subfolder named after the CSV) with an
  `_index.csv` resume state; `--name-format '{artist}/{album}/{title}'` gives a
  proper tree. `output-dir = ~/…` does tilde-expand.
- **Missed tracks (user ran the full list):** first full run gave **124/138**;
  `_index.csv` state 2 + `failurereason` 9 (`No search results`, 9 tracks) and 4
  (`All downloads failed`, 5 tracks). Re-running with
  `--search-timeout 15000 --max-retries 5` recovered 6 → **130/138**. Root
  causes: the default 5000 ms search window, artist-qualified queries matching
  poorly (verified: title-only `Back to School` = 827 hits, `Deftones - Back to
  School` = 0), title spelling drift, and dead peers. `--extra` quoting was also
  broken (a quoted string became one argv token) — fixed with `shlex.split`, and
  `--search-timeout` / `--max-retries` / `--length-tol` are now first-class flags
  (`--length-tol` must be emitted as `--length-tol=-1`).
- **Shell gotcha fixed:** `~/bin` on PATH must be exported from `~/.zshenv`
  (read by non-interactive shells), not only `~/.zshrc`; `sync.py` also probes
  `~/bin/sockseek` + `/usr/local/bin/sockseek` directly. Earlier failure mode was
  `tar: #: Not found in archive` caused by an inline `# comment` on a command
  line in a zsh where `interactive_comments` is off — don't put trailing
  comments in documented one-liners.

## Session snapshot — 2026-10-24 (later) — "/slomo has no 🎸 genre button" — **not a regression**

- **Report:** on `feature/seo` the SloMo genre screen showed no button; on
  `feature/new` it did. The genre *is* the emoji (the only genre folder is `🎸`),
  so "the guitar emoji button" is the entire genre list.
- **Ruled out with evidence:** `GET /api/slomo/genres` → `200 ["🎸"]` (plain and
  gzip), CORS reflects every dev origin (`localhost/127.0.0.1/192.168.2.1/
  10.210.155.132:5173`), and the button renders in dev (:5173) **and** from
  `dist` (:4171) at 390×844, 430×932 and 1440×900. `feature/new` rendered side
  by side (`git archive` → Vite on :5174) is pixel-equivalent. SloMo's whole diff
  is `bartender.png` → `bartender.webp`; `.mobile-btn`/`slideInUp` untouched.
- **Cause: stale local state** (user confirmed fixed after reload/restart). Two
  branch-local traps produce this exact symptom: the dev backend dies at boot if
  `compression` isn't installed (`nest-server` dep is new) — only SloMo's UI
  needs the API, so only SloMo looks broken; and `@emotion/server` in
  `react-fe/package.json` makes Vite re-optimize deps, so a tab left open across
  that reload can stick on the first render ("Loading genres…"). See
  `.steering/gotchas.md` #34 for the 3-step diagnosis.
- **Debug recipe worth reusing:** headless Firefox
  (`--headless --new-instance --profile <dir>` so it doesn't collide with the
  user's open Firefox) against a wrapper page that delays `load` ~7 s — a plain
  `--screenshot` fires at `load`, before `useEffect` resolves, and always shows
  "Loading genres…" (false negative).
- **State:** `feature/seo` @ `57652cc` "seo work" + 12 uncommitted entries
  (`nest-server/src/main.ts`, `compression` dep, `Dockerfile`, memory-bank +
  `.steering` docs, `lighthouse.yml` + `lighthouserc.json`).

## Session snapshot — 2026-10-24 — SEO / crawlability + prerendering pass

- **Branch:** `feature/seo`, branched from `feature/new` (the develop branch);
  the SEO pass is commit `57652cc` with the server/Docker/CI pieces below still
  uncommitted (12 working-tree entries).
- **Goal:** make the site findable and shareable — it was a pure client-rendered
  SPA with one static `<title>BVerse</title>`, no description, no robots.txt, no
  sitemap, no crawlable links on the home page, and a catch-all that answered
  **HTTP 200** for every unknown URL (infinite soft 404s). `/robots.txt` and
  `/sitemap.xml` returned the SPA shell as `text/html`.
- **Landed:**
  - `react-fe/src/seo/routes.ts` — single source of truth for per-route title,
    description, `render: "prerender" | "shell"`, `changefreq`, `priority`,
    plus `DYNAMIC_ROUTES` (`/room/:roomId`, `/text-corpse/:roomId`) which are
    `noindex`.
  - `react-fe/src/seo/SeoManager.tsx` — syncs `<title>`/description/robots/
    canonical/OG/Twitter with `useLocation()` on client navigations.
  - `react-fe/src/entry-server.tsx` + `react-fe/scripts/prerender.mjs` — build
    step that bundles the route tree with `vite build --ssr`, renders it with
    `renderToString` + `StaticRouter` + an Emotion cache, and writes
    `dist/<route>/index.html`, `dist/sitemap.xml`, `dist/404.html`. It fails the
    build if `App.tsx` and `routes.ts` drift apart.
  - `App.tsx` split into `AppRoutes` (router-free, reusable by the prerenderer)
    and `App` (`BrowserRouter` + `SeoManager`), plus a `*` → `NotFound` route.
  - `index.html` rewritten: description/canonical/OG/Twitter/theme-color, a
    `<noscript>` summary, and `seo:start`/`seo:end` **meta** markers (Vite strips
    HTML comments from production builds).
  - Home page: the 5 `<button>`s (invisible to crawlers) became `<Link>`s,
    with an `<h1>` + real copy (later moved into a `.sr-only` wrapper — see the
    snapshot above); a `/resume` button was added.
  - Heading hierarchy fixed: About 3×`h1` → 1×`h1`+`h2`s, Music 4×`h1` → 1+`h2`s,
    Resume gained the missing `h1` (name), Claimjumpers title divs → `h1`.
  - `react-fe/public/robots.txt`, `og-image.jpg` (1200×630), `apple-touch-icon.png`.
  - Server (`nest-server/src/main.ts`): `compression()`, immutable
    `/assets/*` caching, prerendered-dir lookup **without** the `/about` →
    `/about/` redirect, trailing-slash 301, `no-cache` for HTML, real
    **404 + `404.html`** for unknown URLs, `X-Robots-Tag: noindex` for live
    rooms, and a path-traversal guard.
  - nginx (`Dockerfile`): gzip, 1-year immutable asset cache, **http→https** and
    **www→apex** 301s, `try_files $uri $uri/index.html $uri.html =404` +
    `error_page 404 /404.html`, room regex location with `X-Robots-Tag`.
  - Core Web Vitals: all bitmaps → WebP (`performa` 744 KB→6.6 KB, `bartender`
    564 KB→22 KB, `Front_w_border` 1.8 MB→320 KB, `back_w_border` 1.8 MB→280 KB,
    `grex` 123 KB→15 KB, `ex-corpse` 816 KB→117 KB); the 8 used fonts → WOFF2
    (`Aesthetic Curves` 775 KB→160 KB, `Classical Blending` 536 KB→92 KB,
    `Underdove` 206 KB→54 KB); `width`/`height` + `loading="lazy"` where relevant.
  - `.github/workflows/lighthouse.yml` + `lighthouserc.json` (SEO score is a hard
    failure, accessibility/performance are warnings).
- **Verified on Node 26.12.1:** root `npm run build` (models + Nest + Vite +
  prerender), `npm test` (3 suites / 6 tests), and a prod smoke test of
  `node dist/main.js`: `/`, `/about`, `/resume`, `/music`, `/claimjumpers`,
  `/slomo`, `/lunch`, `/text-corpse` → 200; `/nope` → **404** with the noindex
  404 page; `/about/` → **301** `/about`; `/room/abc` + `/text-corpse/abc` → 200
  with `X-Robots-Tag: noindex, nofollow`; `/robots.txt` → `text/plain`;
  `/sitemap.xml` → `application/xml`; `/og-image.jpg` → 200; hashed assets →
  `public, max-age=31536000, immutable` **and** gzip; `/api/health` → 200;
  `/backup` → 401; `/socket.io/?EIO=4` → 200; traversal attempt → 404.
  Prerendered output: home 72 words + `<h1>` + 6 crawlable links, about 568 words
  (the agent-written "ethical organic local fair trade AI" blurb is the bulk of
  it; model name lives in `LOCAL_MODEL` at the top of `About.component.tsx`),
  résumé **589 words**, music 53 words + 5 iframes.
- **Not verified:** `docker build` (Docker still not installed — the new nginx
  config is unexercised), the Lighthouse workflow (needs a GitHub runner with
  Chrome), and the visual result of the Home/Claimjumpers/About markup changes
  (no browser pass). Prod still serves the old image until the next deploy.
- **Deliberate decisions:**
  - Prerender by **SSR-rendering React at build time**, not with Puppeteer — no
    Chromium in the Docker build stage. Needed `ssr: { noExternal: true }`
    because MUI's ESM build uses directory imports Node cannot resolve.
  - Only `prerender` routes get real markup; `/slomo`, `/lunch`, `/text-corpse`
    are socket/audio-driven and get metadata-only shells.
  - `main.tsx` keeps `createRoot` (not `hydrateRoot`): the prerendered DOM is
    discarded on boot, which avoids hydration mismatches on the live pages.
  - Canonical host is `https://antigogglin.org` (apex, no `www`).

## Session snapshot — 2026-10-23 — Node 26 / TS 6 / Nest 12 upgrade

- **Branch:** `feature/new`; upgrade changes are uncommitted in the working tree.
- **Goal:** move the monorepo to **Node 26.12.1** and prove the production build
  still works end to end.
- **Landed:**
  - Node pinned everywhere: `.nvmrc` (`26.12.1`), `engines`
    (`node ^26.12.1`, `npm >=11`) in root / `models` / `nest-server` /
    `react-fe`; Docker stages `node:26.12.1` and `node:26.12.1-alpine`; root
    prod stage now `npm ci --omit=dev`; CI uses `actions/setup-node@v4` with
    `node-version-file: .nvmrc`; new `.dockerignore`.
  - TypeScript **^6.0.3** repo-wide (Nest 12 / `@nestjs/schematics@12` require
    it). `models` target ES2022; `nest-server` target ES2023, `rootDir: ./src`,
    `types: ["node", "jest"]`, `baseUrl` removed.
  - NestJS 10 → **12.2.0** (ESM-only), `@faker-js/faker` 10.6, jest 30 +
    ts-jest 29.4, Vite 5 → **7.3**, `@vitejs/plugin-react` 5.2,
    `@testing-library/{react,dom,jest-dom}` 16.3/10.4/7.0, socket.io 4.8.4,
    `@types/node` 26.6.5.
  - React stays **18**, MUI **6**, react-router **6** — UI majors are unrelated
    to a runtime upgrade.
  - `react-fe`: `NodeJS.Timeout` → `ReturnType<typeof setTimeout>` /
    `...typeof setInterval>` in `SloMo.component.tsx` +
    `TextCorpse.component.tsx` (TS 6 doesn't inject `@types/node` into the DOM
    project).
  - Backend `test*` scripts run jest via
    `node --experimental-vm-modules` (needed to `require()` ESM-only Nest);
    stale scaffold specs repaired (missing `HealthService`/`FakerService`
    providers, obsolete `'Hello World!'` assertion) → **6/6 green**.
- **Verified on Node 26.12.1:** `models` build, `nest-server` build, `react-fe`
  build (`tsc && vite build`), root `npm run build`, `npm test` (6/6), and a
  prod-mode smoke test of `node dist/main.js` — `/api`, `/api/health`,
  `/api/faker/animals`, `/api/slomo/genres`, `/api/claimjumpers`, `/backup`
  (401 without password), SPA `/` and a deep route, hashed `/assets/*` 200,
  missing asset 404, `/socket.io` handshake OK.
- **Not verified:** `docker build` (Docker isn't installed on this machine) and a
  real deploy. Lint sits at its pre-existing baseline (see `.steering/gotchas.md`).

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

### 2026-10-22 — iPhone reports "background image gone after 5922eb8"
- **Cause:** 5922eb8 replaced the mobile-only `body::before { background:
  url(grex.jpg); opacity: .3 }` with the desktop stack
  `linear-gradient(...), url(grex.jpg)` + `background-blend-mode: multiply`.
  The gradient is an opaque layer painted **over** grex.jpg, so the texture is
  visible *only* through the blend. Any engine/compositing situation that drops
  the blend (iOS Safari on fixed + `z-index:-1` pseudo-element layers) leaves a
  flat gradient — i.e. "the background image is missing". Measured in WebKit
  (`/tmp/pw/v-*.png`): blend ignored ⇒ 55 unique colors, grex gone.
- **Fix (App.scss):** layer order swapped — `background-image: url("/grex.jpg"),
  linear-gradient(...)` with `background-blend-mode: multiply, normal`. The
  opaque texture is now the TOP layer, so an ignored blend degrades to "raw grex
  texture visible" instead of "gradient only". `multiply` is commutative, so
  where the blend works the result is **pixel-identical** (verified: full-app
  WebKit screenshot at 390×844 dpr2, background strip maxdiff 0 / 0 px changed).
  With the blend force-disabled, the same page now shows the cells (231,231,231).
- Do **not** "fix" this by putting an alpha gradient above the tile: alpha
  compositing cannot darken below the gradient color, so it looks washed out
  (that is what the old `opacity: .3` mobile rule looked like).
- `body.claimjumpers-page::before` is unaffected (single opaque artwork layer,
  `background-blend-mode: normal`); verified pixel-identical after the change.
- Still-unexplained alternative: if the phone was showing `/claimjumpers`, the
  1.8 MB 2847×2834 artwork could be dropped by iOS image-memory limits, leaving
  the flat `#fff7d6` — that page never depended on blending at all.
- `background-size: 200px` (one value) applies to **both** layers, so the
  lavender→brown gradient tiles in 200px strips rather than spanning the
  viewport. That is pre-existing behavior (unchanged), left alone on purpose.







# Active Context — b-mono

> Current work focus, recent changes, next steps. Update this file at the end of
> every meaningful session.

## Session snapshot — 2026-10-30 — the back cover is drawn, not pasted on

- **Ask:** "add a page-load animation to `/claimjumpers-back`, especially for
  `<ClaimjumpersTitle />`, so the page doesn't read as a static drawing."
- **The masthead animation is opt-in.** `ClaimjumpersTitle` grew `animate?: boolean`
  (default `false`) that only appends `claimjumpers-title--animate`, so
  `/claimjumpers` and `/music` keep byte-identical markup and no animation —
  verified in the browser: the front cover still renders
  `claimjumpers-title claimjumpers-title--versal` with `animation-name: none`.
- **The wipe *is* the animation.** `@keyframes claimjumpers-title-ink-in` (950ms,
  `cubic-bezier(0.16, 1, 0.3, 1)`, 220ms delay) reaches `opacity: 1` at 45%,
  unblurs 6px → the heading's own resting `blur(0.3px)` (not `0`, so there is no
  snap at the end), rises `-0.1em` and reveals the word with
  `clip-path: polygon(0% -35%, X% -35%, X% 135%, 0% 135%)` — a left→right write
  rather than a fade. The `-35% / 135%` margins are insurance for a page that
  pins `--claimjumpers-title-leading` or hangs the versal under the baseline.
- **The versal blushes after the word lands — and it genuinely blushes now:**
  `claimjumpers-title-versal-light-in` runs on the *heading* and walks a
  registered `@property --claimjumpers-title-versal-mix` (`<number>`,
  `inherits: true`, initial `1`) from `0` to `1`, while the pseudo's colour is
  written `color-mix(in oklab, var(--art-red) calc(mix * 100%), currentColor)`:
  0 is the word's own ink, 1 is the painted red. It starts at 40% of the wipe and
  lasts 45% of it, both derived from `--claimjumpers-title-enter-duration`, so
  retiming is still one number. `currentColor` keeps the ink end palette-free,
  scoping to `--versal` keeps a stray red initial off pages that turn it off, and
  the initial value *is* the resting style — so reduced-motion, prerendered and
  non-animating pages keep the plain `color: var(--art-red)` above it.
- **Panel choreography, retimable in one place.** `--back-enter-controls-delay`
  140ms, `-title-delay` 220ms, `-tracks-delay` 820ms, `-track-step` 55ms,
  `-fine-delay` 1360ms, `-rise-duration` 420ms on `.claimjumpers-back-panel`;
  controls, masthead, the eight `TRACKLIST` rows (`@for $i from 2 through 8`
  `:nth-child` delays) and the fine print rise `calc(-8 * var(--scale))` into
  place. The stage settles out of `scale(1.035)` + `opacity 0.55` over 1100ms
  about the same centre the panel is measured from, so the copy rides the sleeve
  into registration instead of sliding across it.
- **Only layout-neutral properties** (opacity / transform / filter / clip-path /
  colour). The panel is measured to the painted frame to within a pixel and the
  versal's `line-height: 0` + `vertical-align` recipe only holds while the line
  box is untouched, so nothing may rewrap or grow mid-animation. The rise starts
  *above* the resting spot because overflow at a scroll container's start edge is
  clipped, while overflow past its end edge can flash the panel's `overflow-y`
  scrollbar; `.claimjumpers-back` also got `overflow: hidden` so the settle's
  extra 1.7% never reaches the document.
- **`backwards` fill everywhere, never `both`.** Every `to` keyframe *is* the
  resting style (`transform: none`, `clip-path` gone, `opacity: 1`), so nothing is
  left applied afterwards — no leftover transform making the stage or a row a
  containing block, no stale compositor layer.
- **Reduced motion is free:** everything is inside
  `@media (prefers-reduced-motion: no-preference)`, so a visitor who asks for less
  motion gets the finished drawing immediately rather than a shortened version.
- **Verified in headless Firefox over WebDriver BiDi** (framing per earlier
  sessions' recipe). Two things worth re-learning: this headless build **ignores
  `--window-size`** — `browsingContext.setViewport` is the only way to resize —
  and `emulation.setEmulatedMedia` is not implemented, so reduced motion was
  tested by launching a profile with `user_pref("ui.prefersReducedMotion", 1)`.
  Frames at 80/380/700/1000/1500/2600ms at 1366×683 and 390×844: title
  `opacity 0 → 1`, `blur 6px → 0.3px`, clip `0% → 91% → 100%`, panel
  `scrollHeight == clientHeight` (599/599 and 344/344) on *every* frame, document
  `scrollWidth` pinned to the viewport on every frame (the settle never flashes a
  scrollbar), rows arriving in 55ms steps, fine print last. Front cover and the
  reduced-motion profile both stay completely static. `tsc --noEmit` and
  `eslint src/components/ClaimjumpersTitle src/Pages/Claimjumpers` clean.
- **Cross-checked in Blink too**, by driving the Playwright
  `chromium_headless_shell` (Chrome for Testing 156) over raw CDP — no `playwright`
  package needed, `--remote-debugging-port` + `Target.attachToTarget` with
  `flatten: true` is enough: at 1440×900 the title reads
  `opacity 0.53 → 1`, `blur 4.4px → 0.3px`, clip `27.6% → 99.96% → none`, panel
  `638/638` and `document.scrollWidth` 1440 on every frame, and
  `Emulation.setEmulatedMedia({features:[{name:'prefers-reduced-motion',
  value:'reduce'}]})` *is* implemented there, so the reduced-motion path was
  re-verified without a profile. Front cover: `animation-name: none`, mix pinned
  at `1`, still red.
- **Traps:** (1) **`::first-letter` cannot be animated at all** — a `@keyframes`
  aimed at it is a no-op: Blink *and* Gecko both report `animation-name: none` on
  the pseudo even where `&.claimjumpers-title--versal::first-letter` plainly
  matches, so the first version's `color: currentColor → var(--art-red)` keyframe
  never ran and the versal just sat red through the wipe. Hence the registered
  custom property above, which *is* interpolated (measured: Chrome-for-Testing
  156 mix 0 → 0.552 → 1, Firefox 159 0 → 0.888 → 1, the pseudo's computed colour
  walking `oklab(0.321 0 0)` (#333 ink) → `oklab(0.584 0.129 0.097)`, which is
  exactly what `color-mix(... #c8502c 100%, …)` yields — the resting paint is
  unchanged). (2) `document.scrollHeight` is
  `viewport + 72px` on every Claimjumpers route (the body is `100dvh` tall but
  starts 64px down, plus its 8px margins) — pre-existing, not the animation:
  hiding `.claimjumpers-back` leaves it at 755.
- **Files:** `react-fe/src/components/ClaimjumpersTitle/ClaimjumpersTitle.component.tsx`,
  `.../ClaimjumpersTitle.scss`,
  `react-fe/src/Pages/Claimjumpers/Back.component.tsx` (`<ClaimjumpersTitle animate />`),
  `.../Back.scss`.


## Session snapshot — 2026-10-29 (h) — tobacco and cannabis, without inventing a single date

- **Ask:** "add tobacco and cannabis to the planting calendar: both share Tomato
  start dates and are picked until the first fall frost."
- **Neither crop is in the source.** The Almanac prints 74 spring rows (73 kept
  after the ornamental drop) and tobacco/cannabis are not among them (and the page
  template is fixed, so there is nothing to parse). Rather than hand-typing dates,
  the rows are *declared* in `tools/planting-calendar/local-crops.mjs` with
  `like: 'tomatoes'` and the scraper copies the donor row's cells verbatim — an
  invented date is exactly the kind of thing that would be wrong forever, while a
  copied one is wrong only if Tomatoes is.
- **`until: 'firstFallFrost'` instead of a day count.** A harvest window is
  normally `planting + days`; these two are picked *until the frost*, so the row
  carries `harvest.until = 'firstFallFrost'` and `buildEvents` ends the window on
  `season.firstFallFrost` for whatever year is on screen. A window that would run
  backwards collapses to its first day instead of becoming `inverted`.
- **Provenance travels.** Rows, events, the payload, the `.ics` feed and the Google
  hand-off all carry `origin: 'local'` + `derivedFrom: 'Tomatoes'`. The page adds
  one footer sentence (`localNote`) and the feed adds
  `Locally added: the windows mirror Tomatoes` plus
  `Dates: locally added, not from The Old Farmer's Almanac` — a downloaded file
  must never claim the Almanac printed this.
- **`mergeLocalCrops()` runs before the stats tally** so `stats.dateCells` /
  `stats.harvest` still reconcile with the backend's expanded event count.
  `schemaVersion` 4 → 5, `stats.local {crops, slugs}`, `--no-local` to build the
  page's own dataset. Failure is soft — a missing donor, a missing table, a missing
  planting basis or a slug the page has started printing each produce a warning
  (`local-donor-missing` / `local-table-missing` / `local-basis-missing` /
  `local-duplicate`) and skip the row rather than emit a half-row.
- **New numbers (Englewood 2026):** 74 printed spring rows + 2 local = **75**, 97
  rows total, **239 date cells** (233 printed + 6 copied), 83 N/A, 94 crops with a
  harvest window (43 sourced, 51 estimated, 2 none, 0 undecided). Events 324 →
  **332** (329 drawable), harvest windows 89 → **91** (90 drawable).
  Tobacco: Mar 13-27 start, May 22-29 transplant, Jul 6 last planting, harvest
  Aug 20 → **Oct 5**. Cannabis: same plantings, harvest Sep 19 → **Oct 5**.
- **Page:** chips read `~Tobacco` / `~Cannabis`; the agenda line grows the second
  clause (`about 90 days from transplant, until the first frost`) via
  `harvestNote()` when `harvest.untilLabel` is set; the footer's attribution only
  says "Everything else comes from the Almanac" when a local row is actually on
  screen.
- **Verified:** 21/21 scraper tests (merge, missing donor, page-starts-printing-it,
  and a fixture with `local: false` because its slice has no Tomatoes row), 51/51
  backend jest (frost-capped window, cannot-ripen collapse, provenance on every
  event, feed counts 75/91), `tsc --noEmit` in both packages, eslint+prettier
  clean, `npm run build` green (prerender included), the real payload inspected
  through the bundled FE helpers (chips, agenda, footer sentence, Google details,
  search), and the `.ics` re-parsed: 329 drawable VEVENTs of 332, 332 unique UIDs,
  tobacco's DESCRIPTION carrying both new lines.
- **Traps:** the scraper's own fixture table has no Tomatoes row, so its
  `parseCalendar` call must pass `local: false` — otherwise the merge warns about a
  donor that the real page does have; and `filterEvents` order is the dataset's,
  so the footer sentence reads "Cannabis and Tobacco" (alphabetical), not the order
  they were declared in.
- **Next:** commit; a 360/1280 browser pass for the new chips and footer sentence;
  `marigold` / `comfrey-plant` still sit in `EXCLUDED_CROPS` as non-edibles.

## Session snapshot — 2026-10-29 (g) — harvest windows: "when would these be ready to pick?"

- **Ask:** "figure out about when these crops would be ready for harvesting… the
  average days to harvest on a seed package description. The harvest or picking
  event could be added to each plant and to the calendar."
- **What the source actually has.** The **autumn** table already prints `Average
  Days to Maturity` — scraped since the first version and ignored, because
  `buildEvents` skipped any cell without dates. The **spring** table has no such
  column, and the per-crop growing guides have no parseable number (checked
  anise-hyssop, tomatoes, lettuce, beans, carrots, basil, and a second location's
  calendar: the two table templates are fixed). So the rule is: **the page's own
  number where it prints one, a seed-packet table where it does not** — and the
  provenance travels with the value.
- **`tools/planting-calendar/harvest-days.mjs` (new).** `HARVEST_BASIS` is the
  anchor ladder (`transplantOutdoors` → `transplant` → `directSow` →
  `startSeedsOutdoors`: transplanting wins, because that is what a packet's
  number measures). `DAYS_TO_HARVEST` holds 49 seed-packet averages rounded to
  five days, plus `null` for the two perennials with no first-season harvest
  (asparagus, comfrey). `harvestDays(slug, ownCell, otherTableCell)` returns
  `almanac` / `estimate` / `null` / **`undefined` for "nobody has decided"**, and
  the scraper turns that last case into a `harvest-unknown` warning +
  `stats.harvest.unknown`, so a new crop cannot slip in without a decision.
- **The scrape stores a number, never a date.** Each row gets
  `harvest: {days, basis, source}`; `buildEvents` adds the days to the anchor
  cell *per request*, which is what keeps re-dating free (and stops ginger's
  240 days from landing in a January the payload is not about). `schemaVersion`
  3 → 4, `stats.harvest {crops, estimated, sourced, none, unknown}`.
- **New numbers (Englewood 2026):** 92 of 95 rows carry a window — 43 from the
  Almanac's column (22 autumn rows + 21 spring rows borrowing the same crop's
  autumn figure), 49 estimates, 2 deliberate blanks (asparagus, comfrey), 0
  undecided; spring Garlic is N/A everywhere, so it has nothing to count from.
  **89 windows**, of which 88 are drawable — Kohlrabi's autumn one inherits the
  source's backwards `Aug 31-17` transplant range and stays `inverted`. Autumn
  garlic (Oct 19 + 120) and ginger/turmeric (May 22 + 240/250) mature after New
  Year and are **left out, not clamped**: the calendar serves one year at a time,
  and the numbers stay in the JSON so nothing is hidden. Events 235 → **324**;
  VEVENTs 233 → **321**.
- **Page:** sixth legend family `harvesting` (own amber `--pc-harvest`, not a
  borrowed theme colour), estimate chips prefixed `~`, agenda lines read
  `Harvest · about 75 days from transplant · Jul 22 – Aug 19 · day 22 of 29`,
  footer explains the 43/49 split, `harvest` joins the `?columns=` export scope,
  and both the `.ics` description and the Google deep link swap "Almanac window:"
  for `Days to harvest: 75 from transplant (seed-packet average)` — a derived
  window must not claim to be a printed one.
- **Verified:** 17/17 scraper tests (`harvestDays`, `plantingBasis`, per-row
  provenance, "every row with a planting window has a decision"), 46/46 backend
  jest (harvest arithmetic, next-year drop, missing anchor, re-dating, ICS
  description/category), FE `tsc` + eslint + `npm run build`, and a live browser
  pass at 360/1280 (legend `harvesting 88`, 20 harvest chips in August,
  `search "harvest" → showing 88 of 321`, hiding the family drops the chips and
  the `?columns=` value, no console errors, no overflow). Feed re-parsed with
  python `icalendar`: 321 VEVENTs, 321 unique UIDs, `DTEND > DTSTART` everywhere,
  nothing dated outside 2026, ≤75 octets, CRLF.
- **Traps:** the harvest of an inverted source range is inverted too (same
  reason, no special case); spring Garlic must not produce a warning just because
  it has no dates; and `nest build` is still what copies `data/*.json` into
  `dist` before a spare-port server will show it.
- **Next:** commit; `marigold` / `comfrey-plant` are still in the dataset as
  non-edibles (one line each in `EXCLUDED_CROPS`); `Cache-Control` on the JSON
  endpoint; `?location=` multi-city.

## Session snapshot — 2026-10-29 (f) — Obedient Plant removed at the source, not from the JSON

- **Ask:** "I could remove the 'obedient plant' from this entire thing … it isn't
  an edible plant. It takes up too much of the calendar." Both halves were true:
  it is an ornamental (*Physostegia virginiana*), and its `Jan 15 – Feb 12`
  indoor window was **23 of the 23 chips in the January grid** — the whole month,
  from one crop.
- **Cut it at the scraper, not in the JSON.** Editing `co-englewood.json` alone
  would have been undone by the next `node scrape.mjs`. `EXCLUDED_CROPS`
  (slug → reason) in `tools/planting-calendar/scrape.mjs` now drops rows inside
  `parseCalendar`, keyed by the slug in the guide URL so a re-spelled name cannot
  resurrect it; `--keep <slug>` restores one for a run without editing the list.
  `parseRows`/`parseTable` stay faithful parsers — the policy lives in the
  assembly step, which is `partitionCrops()` (exported, unit-tested).
- **Excluded rows are dropped *before* `stats` is tallied**, so
  `stats.dateCells` still equals the events the backend expands (the feed spec
  asserts that sum). New top-level `excluded[]` records `{table, name, slug,
  reason}`, and `schemaVersion` went 2 → 3, so the JSON explains why it holds 73
  crops where the page prints 74. The CLI log prints each dropped row.
- **Diff discipline:** the scraper was first re-run against the cached HTML and
  diffed against the committed JSON — identical apart from `fetchedAt` — so the
  regenerated file's diff is *only* the removed crop, the recounted stats and the
  new `excluded[]`.
- **New numbers (Englewood 2026):** 73 spring + 22 fall crops = 95, 233 dated
  windows, 81 N/A, 2 inverted, 1 hidden; 235 events (233 + 2 frost), 233 VEVENTs
  unfiltered (66 for direct seeding, unchanged).
- **Removal exposed a copy bug, fixed with it.** December's hand-off said
  "2027's windows open in January" / `jump to january 2027` — hard-coded, and now
  a dead end (Denver starts nothing before Feb 12). `seasonOpening()` derives the
  month from the earliest window on screen (safe by the re-dating invariant:
  windows keep month and day every year) and `formatMonthName()` names it, so the
  button now reads `jump to february 2027` and lands on 46 chips.
- **Verified:** 13/13 scraper tests (`dateCells 233`, v3, exclusion + `--keep` +
  `partitionCrops`), 37/37 backend jest, FE `tsc` + eslint + `npm run build`
  green; live browser pass (360 + 1280) Oct 2026 14 chips → Nov 1 → Dec 0 with
  "open in February" → jump → **February 2027, 46 chips**, footer
  `95 crops · 233 dated windows`, two API calls, no console errors. (The 360 px
  "Obse…" truncation noted in (e) is moot: the crop is gone.)
- **Note:** the trap that cost time — the dev watch server serves
  `dist/planting-calendar/data`, and `nest build` is what copies JSON into
  `dist`; a stale server reports the *old* dataset. Rebuild, or boot
  `dist` on a spare port, before believing an API response.
- **Next:** `git status` review and commit (still untracked); `Cache-Control` on
  the JSON endpoint; `?location=` multi-city. Marigolds is the other ornamental
  still in the dataset — one line in `EXCLUDED_CROPS` if wanted.

## Session snapshot — 2026-10-29 (e) — the page can now reach 2027 (it never asked)

- **Ask:** "okay, sounds good but why don't I see anything into 2027? I want this
  to be usable forever onward." The API had been serving `?year=2027` since
  snapshot (d) — the **page** never asked for it.
- **Root cause (frontend, not data).** `apiService.getPlantingCalendar()` hit
  `/api/planting-calendar` once, with no `?year=` and no dependency array, so the
  component held exactly one season (the current year, from the server default).
  The month grid happily paged into 2027 and drew that stale 2026 array, so
  every month after December looked empty. Nothing was broken in the dataset,
  the projection or the feed; there was simply no second request.
- **Fix: follow the cursor's year.** `cursorYear = Number(cursor.slice(0, 4))`,
  the fetch effect depends on it, and payloads are kept in a
  `useRef(new Map<number, PlantingCalendarPayload>())` so stepping back a year is
  instant (verified: only `?year=2026` and `?year=2027` fire across a full
  round-trip). No year picker — walking the grid forward *is* the control, which
  is what makes it work forever rather than one year further.
- **Stale-payload guard.** `season = payload?.season.year === cursorYear ? payload : null`.
  Everything drawn from events (chips, agenda, counts, export link) reads
  `season`; the year-agnostic chrome (location, legend, search) keeps using the
  last payload so the page does not flash. While a year is in flight the count
  line says `reading 2027 in the almanac…` instead of painting 2026 chips into
  2027 cells.
- **Empty months explain themselves.** `Nothing scheduled this month` + next
  window, and past the last one a hand-off button `jump to january 2027`
  (`openMonth`, so it lands on the month view and triggers the next fetch). This
  is the affordance a first-time visitor needs in November: the plan is not
  missing, it is next door.
- **Two follow-ups found while checking the edges.** `counts` (the per-family
  legend numbers) is tallied from the last `payload` instead of `season`, since
  the counts are identical in every year and reading them off the season flashed
  the legend to zero mid-load; and `clampYear()` in `planting-calendar.utils.ts`
  pins the cursor to the API's 1900–2200 range — past 2200 the API falls back to
  the current year, which would have left the page on `reading 2201…` forever.
  Asserted against the esbuild bundle (`Dec 2200 + 12 months -> 2200-12-31`,
  `Jun 1899 - 12 months -> 1900-01-01`); `lifetime` reach confirmed live at
  `?year=2035`, `2100`, `2200`, with `2201` correctly falling back to 2026.
- **Exports follow the screen.** `icsHref(kinds, year)` / `ExportPanel({ year })`
  always pin the year being viewed (2030 view → 2030 file). The *subscription*
  URL does the opposite on purpose: `icsPublicHref` drops `?year=` when it equals
  the current year, because the API already defaults to it — subscribe once and
  it stays current. The panel spells that out.
- **Verified in a real browser** (Playwright from
  `tools/spotify-playlist/browser/node_modules`, production `dist` served with a
  20-line static+`/api` proxy on :4321, 360×800 and 1280×900): Oct 2026 14
  chips → Nov 1 → **Dec 0 with the hand-off note** → **Jan 2027 23 chips**,
  footer `96 crops · 235 dated windows · season 2027 (MARSTON FLTR PLT, CO) ·
  re-dated from 2026`, `ics href …?year=2027`, subscribe URL year-less on the
  2026 view and `?year=2027` on the 2027 view, zero console errors / failed
  requests. FE `tsc` + eslint + `npm run build` green.
- **Supersedes:** the "browser pass at 360px + desktop" next-step from (d) —
  done. (The chips in a 360 px month cell truncate long crop names, e.g.
  "Obedient Plant" → "Obse…"; pre-existing, full name in day view, not touched.)
- **Next:** `git status` review and commit (whole feature is still untracked);
  `Cache-Control` on the JSON endpoint (per-year payloads are now fetched on
  demand, so caching pays); `?location=` multi-city.

## Session snapshot — 2026-10-29 (d) — moon dates dropped; the calendar is now perennial

- **Ask:** "to make this work more perennially we could drop the moon dates and
  just use frost dates and this calendar can be used in perpetuity."
- **Agreed with the premise, added the missing half.** Moon-favourable windows
  are real but pinned to one year's lunar phases, so they were the only part of
  the Almanac table that could never be reused — dropped everywhere. But the
  dates themselves were still hard **2026** ISO strings, so in 2027 the grid
  would simply be empty; dropping moon alone does not buy perpetuity.
- **Re-dating, not re-scraping.** `projectYear(iso, year)` in
  `planting-calendar.events.ts` keeps the month and day and swaps the year
  (Feb 29 clamps to Feb 28). Every window in the dataset is a *month/day* range
  derived from **average** frost dates, so this is faithful, and it is what
  keeps the Almanac's own labels ("May 22-29", "Jan 15-Feb 12") literally true —
  a day-offset-from-frost projection would drift a day across leap boundaries
  and silently falsify those labels.
- **Default year = current year** (`calendarYear()` in the controller, `?year=`
  to override, range 1900–2200). Pure functions (`buildEvents`, `buildFeed`,
  `buildPayload`) default to the *dataset* year so unit tests stay deterministic;
  only the controller reaches for `new Date()`. A `?year=`-less page and a
  `?year=`-less subscription URL therefore keep working each January.
- **IDs are year-scoped** (`co-englewood:2027:spring:tomatoes:transplantOutdoors`)
  so importing 2027 over 2026 in Google Calendar does not collide on UID.
  Frozen payload carries `season.year` (what you see) + `season.sourceYear`
  (the almanac it came from); the footer only says `· re-dated from 2026` when
  they differ.
- **Removed end to end:** scraper (`planting-moon` parsing, `stats.moonCells`,
  `moon-window-unparsed` warnings, summary line — the span is still in the HTML
  and is now covered by a test asserting it is *ignored*), dataset cells (180
  stripped, `schemaVersion` 1 → 2, `moonCells` gone), `PlantingEvent.moon`,
  `?moon=1`/`includeMoon`, the ICS `Moon-favourable:` description line, the
  page's dim caption, its `.pc-event-moon` CSS rule, the Google-Calendar
  details line, and the FE types. `TASK_KINDS`/`filterEvents` never had a moon
  entry, so no legend or filter behaviour moved.
- **Verified:** backend prettier + `tsc --noEmit` green; **37** jest tests (2
  moon cases replaced by 5 re-dating cases: `projectYear` including leap clamp,
  synthetic 2027 re-date, default-year no-op, whole-plan shape equality, feed
  filename/CALNAME/`DTSTART`, payload `season`/`sourceYear`); scraper 10/10 with
  the ignore-the-moon-span assertions; FE `tsc` + eslint + `npm run build` green
  (no `moon` left in `dist`); live restarted `nest --watch` → `GET
  /api/planting-calendar` = 237 events, 0 moon keys, ids `:2026:`, `?year=2027`
  = 237 events all 2027 with labels untouched, `calendar.ics?year=2027` = 235
  VEVENTs, `UID:planting-co-englewood-2027-…`,
  `filename="planting-calendar-co-englewood-2027-spring.ics"`, 0 `Moon` lines.
- **Supersedes:** the "moon dates are metadata / `.ics?moon=1`" decisions in
  snapshots (b) and (c) above; the schema row in
  `tools/planting-calendar/README.md` now documents `schemaVersion: 2` and no
  `moon`/`moonCells`.
- **Known trade-off:** month/day projection is exact for the Almanac's own
  windows but does not re-derive days-to-maturity against *this* year's actual
  frost; a strict frost-offset projection is the alternative if that ever
  matters. Feb 29 sources would clamp.
- **Next:** browser pass at 360px + desktop; `git status` review and commit;
  `Cache-Control` on the JSON endpoint; `?location=` multi-city.

## Session snapshot — 2026-10-29 (c) — planting calendar polish: legend, search, Denver name

- **Ask (five notes after the MVP shipped):** a colour-coded legend by task type;
  "not sure how useful spring/fall/everything is, if it even is a filter"; "what
  does the search do?"; call it *Denver* Planting Calendar on the button + page;
  the "take it with you" buttons are black until hover.
- **Legend = the filter.** `TASK_KINDS` in `planting-calendar.utils.ts` defines
  five chore families (`indoor` 54, `transplant` 62, `sow` 66, `last` 51,
  `frost` 2 events for Englewood) with the dataset columns each owns;
  `eventKind()` is now the single place a colour is decided (it used to be a
  `chipKind` helper inside the component). The `Legend` component renders a
  swatch + label + count per family and toggles it on/off (`aria-pressed`), and
  the count line reads `showing 118 of 235 · 2 types hidden`. Chips and swatches
  share `--pc-*-soft` variables (`color-mix(… , white)`) so the key cannot drift.
- **Season chips deleted.** "spring / fall / everything" only re-cut a table pair
  the month view already navigates; the state, the `SeasonFilter` type and the
  `season` branch in `filterEvents` are gone. `filterEvents(events, { kinds, query })`
  now filters `kinds.includes(eventKind(event))`.
- **Search is now self-explanatory.** A visible `find` label + placeholder
  ("a crop or a chore — tomato, transplant"), a `clear` button, a count line, and
  when the visible month/week has no match: `No matches this month. Next:
  Tomatoes — Start seeds indoors, Feb 12. [jump to Feb 12]` (helpers
  `viewRange`, `eventsInRange`, `nextEventFrom`). An empty crop query says
  "Nothing in the plan matches".
- **Export follows the legend.** The `.ics` button links the plain URL when all
  five families are on, and `?columns=directSow,startSeedsOutdoors` when not —
  a new `columns` option in `FeedOptions` + `@Query('columns')` in the
  controller (`asColumns` splits/trims). Verified live: 235 / 66 / 2 VEVENTs for
  all / sow / frost, and page ↔ feed counts agree kind for kind.
- **Renamed to Denver.** Page `<h1>` "denver planting calendar", subtitle
  "Englewood, CO, in the Denver metro · frost dates", Home button
  `denver\nplanting\ncalendar` (needs `.is-small` in `Home.scss`: three lines do
  not fit the 64px square at 16px), `seo/routes.ts` title/description retitled
  (metro search term, Englewood kept for accuracy), page README retitled.
- **Black-on-black bug:** `.planting-calendar a { color: inherit }` is
  specificity (0,1,1) and out-ranked `.pc-export-btn` (0,1,0), so the button
  label inherited `--pc-ink` on a `--pc-ink` background; only `:hover` (0,2,0)
  set `color: white`. Fixed by writing the blanket rule as `:where(a)` (zero
  specificity), which keeps `.pc-export-btn`'s own colours both at rest and on
  hover, and adding `:focus-visible` to the hover styles.
- **Verified:** backend prettier + `tsc --noEmit` + **32** jest tests green (two
  new feed cases: column scoping, empty `columns` = plain feed); FE `tsc`,
  eslint and `npm run build` green (prerender + sitemap ok); `dist` CSS contains
  the legend rules and `:where(a){color:inherit}` *before* `.pc-export-btn`;
  live `node dist/main` + curl for the three column filters; python `icalendar`
  re-parse of each (unique UIDs, `DTEND > DTSTART`, CRLF, ≤75 octets); FE logic
  re-asserted via `esbuild --bundle` into `/tmp/pc-utils` + `check.mjs`
  (kinds, `kindColumns`, `viewRange`, `eventsInRange`, `nextEventFrom`, ics URLs)
  and `/tmp/pc-live.mjs` (live page/feed agreement).
- **Next:** browser pass at 360px + desktop, `Cache-Control` on the JSON
  endpoint, `?location=` for more cities, "this week" digest on Home.

## Session snapshot — 2026-10-29 (b) — planting calendar UI: month/week/day + Google export

- **Ask:** "calendar view … by month, week or day … could incorporate google
  calendars … export to their personal google calendar."
- **Shipped end to end** — dataset → Nest module → SPA page → calendar export:
  - `nest-server/src/planting-calendar/`: `types` / `dataset` (fail-soft loader)
    / `events` (expansion) / `ical` (RFC 5545 writer) / `feed` (payload + feed
    builders) / `service` (thin Nest cache) / `controller` / `module`, registered
    in `app.module.ts`. **`buildEvents` is the single source of truth**: it turns
    each dated cell into one `PlantingEvent` plus two frost markers, so the API,
    the `.ics` feed and the page can never disagree.
  - `GET /api/planting-calendar` → dataset + `events[]` (237 for Englewood:
    235 dated cells + 2 frost dates).
  - `GET /api/planting-calendar/calendar.ics?table=all|spring|fall&moon=1` →
    `text/calendar`, attachment `planting-calendar-co-englewood-2026[-season].ics`.
    All-day `VALUE=DATE` events, `DTEND` exclusive (+1 day), CRLF, 75-octet
    folding, unique UIDs, `DTSTAMP` pinned to the dataset's `fetchedAt` so
    responses are byte-identical (cacheable).
  - `react-fe/src/Pages/PlantingCalendar/` → `PlantingCalendar.component.tsx`
    (month grid / week columns / day agenda, prev-next-today, season chips,
    crop search, per-task "+ google" link, export panel), `planting-calendar.utils.ts`
    (local-date math, `monthGrid`, `weekOf`, filtering, `windowProgress`),
    `planting-calendar.export.ts` (Google template link + `.ics` URLs),
    `PlantingCalendar.scss` (all `pc-`-prefixed), and a README.
  - Wiring: `<Route path="/planting-calendar">` in `App.tsx`, `seo/routes.ts`
    entry (`render: "shell"`, weekly, 0.7), `Home` link "planting\ncalendar"
    (now 7 buttons), `apiService.getPlantingCalendar()`, shared types in
    `react-fe/src/services/planting-calendar.types.ts`, root script
    `npm run planting:data`.
- **Dataset moved** from `tools/planting-calendar/datasets/` to
  `nest-server/src/planting-calendar/data/co-englewood.json`: the root
  `Dockerfile` copies only `nest-server/dist`, `public` and `react-fe/dist`, so
  `tools/` never reaches production; `nest-cli.json` already copies every
  `src/**/*.json` into `dist`. The scraper's default `--out` now points there
  (README + test updated), `out/` HTML cache stays in `tools/`.
- **Google Calendar, without OAuth:** (1) per-task deep link
  `calendar.google.com/calendar/render?action=TEMPLATE&…&dates=YYYYMMDD/YYYYMMDD`
  (end + 1 day); (2) the `.ics` download + Google's Settings → Import & export
  link for the whole season; (3) the same endpoint as an optional subscribe-URL.
- **Verified:** 30 new backend jest tests green (`npx jest src/planting-calendar`
  — expansion, inverted ranges, moon expansion, ICS folding/escaping, feed
  scoping, committed dataset); `tsc --noEmit` clean in both packages; eslint
  clean on the new files; `react-fe` `npm run build` green (prerender lists
  `/planting-calendar shell`, sitemap + `dist/planting-calendar/index.html` with
  the right `<title>`); live `node dist/main` + curl: JSON 200, page 200, ICS
  200 with 235 VEVENTs; **feed parsed by python `icalendar` 6.3.2** — unique
  UIDs, `DTEND > DTSTART` everywhere, em dashes/escaped commas decoding back;
  FE logic exercised by compiling `utils`/`export` to `/tmp/pc-utils` and
  running assertions (month-grid shape, month clamping, filtering, Google URL).
- **Bug the tests caught:** the ICS writer folded a whole multi-line VEVENT
  block as if it were one line (yielding `DT` / ` END;VALUE=DATE:` splits).
  Fixed by emitting `eventToVeventLines()` and folding per physical line.
- **Local gotcha:** this machine runs **Node 24.4**, not the pinned 26.12.1, so
  *every* `@nestjs/*` import fails under jest (`Must use import to load ES
  Module`). That breaks the three pre-existing suites too. The new specs are
  deliberately Nest-free (pure modules), so they pass on 24.4; run
  `nvm use` before trusting `npm test` output.
- **Deliberate choices:** inverted source ranges never render as chips (they
  are listed in the footer instead); moon dates are metadata on the task, with
  the ICS feed able to emit them separately; search matches crop + operation +
  task; days are local-date strings (never `toISOString()`) so a garden day
  cannot shift across a time zone.
- **Next:** optional — a table view of the raw dataset, more locations behind a
  `?location=` param, or a "this week" digest on Home.



## Session snapshot — 2026-10-29 — planting calendar scraped to JSON (new project)

- **Ask:** "Can you scrape https://www.almanac.com/gardening/planting-calendar/CO/Englewood
  into some form we can work with?" — first step of a planned, more advanced
  planting calendar to host on the app.
- **Answer: yes, and it's already done** — `tools/planting-calendar/scrape.mjs`
  (Node ESM, zero dependencies, no browser) → `datasets/co-englewood.json`.
  Raw HTML cached in git-ignored `out/`; `--no-cache` refetches.
- **Why it's easy:** the page is server-rendered Drupal. Two tables
  (`#seed-start-dates-table`, `#seed-start-dates-table-fall`); each dated cell is
  `<td data-date-start data-date-end>` with two spans (`planting-frost` = the real
  window, `planting-moon` = optional moon dates). Frost dates live on
  `.planting-tables-wrapper` (`data-spring-frost` / `data-fall-frost`); station +
  elevation in the `<caption>`.
- **Payload:** `schemaVersion`, `source`, `location`, `season` (year, station,
  elevation, both frost dates), `tables.spring` / `tables.fall`
  (`columns[{key,label,hint}]` + `crops[{name,slug,url,hidden,dates}]`), `stats`
  and `warnings[]`. Column keys are stable: `startIndoors`,
  `transplantOutdoors`, `directSow`, `lastPlanting` / `startSeedsOutdoors`,
  `transplant`, `daysToMaturity`, `frostTolerance`. Cell shapes: `{na:true}`,
  `{label,start,end,moon?}`, `{label,days}`, `{label}`, `null`.
- **Numbers (Englewood, 2026):** 74 spring + 22 fall crops, 235 dated windows,
  82 N/A, 180 moon windows, 2 inverted ranges, 1 hidden row (Garlic).
  *(Superseded by (f): 73 + 22 crops = 95, 233 windows, 81 N/A, 1 row excluded.)*
- **Verified:** a separate Python cross-check read the cached HTML and compared
  **all 384 cells** (dates, N/A, empty, text, moon presence) — 0 mismatches; 10
  `node --test` cases green (`node --test tools/planting-calendar/scrape.test.mjs`);
  `eslint` clean (needs the `/* eslint-env node */` header — root eslintrc is
  browser-only). Colorado Springs re-scraped via `--stdout` to prove the scraper
  is location-generic (different station, elevation, fall frost).
- **Quirks kept, not fixed:** Kohlrabi's fall windows are backwards in the source
  (`Aug 10-Jul 27`, `Aug 31-17`) → `inverted-range` warnings; Garlic is
  `display:none` in the spring table with all-N/A cells → `"hidden": true`.
- **Gotcha for later:** `/gardening/planting-calendar/<STATE>/<City>` is the only
  URL shape that returns tables (ZIP paths serve the location form); spaces are
  URL-encoded and hyphens do **not** work (`Colorado-Springs` → 0 rows).
- **Next (awaiting the user's ideas):** wire it in as `nest-server` module
  (`GET /api/planting-calendar`) + a `/planting-calendar` page + route/SEO entry;
  the dataset is committed at `tools/planting-calendar/datasets/co-englewood.json`.

- **Ask:** "`background-image: url("../../assets/front_w_border.webp")` doesn't
  load on the deployed mobile site; the back cover's background works."
- **Cause: filename case, not CSS.** The file was tracked as
  `assets/Front_w_border.webp` (capital `F`) but `Claimjumpers.scss` referenced
  `front_w_border.webp`. macOS is case-insensitive, so Vite resolved it locally
  and rewrote it to `/assets/Front_w_border-<hash>.webp`; **Linux (Docker) could
  not**, and Vite silently leaves an unresolvable `url()` relative — the
  deployed bundle therefore contained
  `url(../../assets/front_w_border.webp)`, which the browser resolves against
  `/assets/` → `GET /assets/front_w_border.webp` → **404** (confirmed on the
  live site) → only `background-color: #fff7d6` painted. `back_w_border.webp`
  matched its file exactly, so it was rewritten to
  `/assets/back_w_border-BZ3bD5lN.webp` (200) and worked.
- **Fix:** `git mv react-fe/src/assets/Front_w_border.webp
  react-fe/src/assets/front_w_border.webp` (the SCSS spelling was the sensible
  one; nothing else referenced the file). Rebuilt: the bundle now carries
  `url(/assets/front_w_border-_COr8XEB.webp)` and that file is emitted, so the
  next deploy serves it.
- **Swept the tree for siblings:** a case-sensitive walk of every `url()` /
  `from "…asset"` in `react-fe/src` (36 refs) now finds no mismatches; the only
  "unresolved" hits were `/grex.webp` (a `public/` absolute path) and two
  template-literal `url(${…})` strings in `SloMo.component.tsx`.
- Recorded as gotcha #41 in `.steering/gotchas.md` (check the built CSS for
  `url(../` — prod output must only contain `/assets/...`).

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
4. **Planting calendar.** Newest and most active: dataset scraped from the
   Almanac, events expanded server-side, page at `/planting-calendar`, ICS feed.
   Latest layer is **harvest windows** — derived per request from days to
   maturity, marked `~` when the number is a seed-packet average rather than the
   Almanac's own (see snapshot (g)).

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
6. Planting calendar follow-ups: `Cache-Control` on `GET /api/planting-calendar`,
   `?location=` multi-city (the scraper already takes `--state/--city`), and
   decide whether `marigold` / `comfrey-plant` join `EXCLUDED_CROPS` (both are
   non-edibles the Almanac files with the vegetables).

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







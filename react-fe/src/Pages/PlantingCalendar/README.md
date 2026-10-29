# Denver planting calendar page

Month / week / day view of one location's planting windows, colour-coded by the
kind of chore, plus export to Google Calendar (or any `.ics` reader). Route:
`/planting-calendar`.

The page is titled **Denver planting calendar** because that is what people
search for; the dates come from the Almanac's Englewood, CO station — the
closest one to the city, named in the subtitle so the page never implies more
precision than it has.

## Data flow

```
tools/planting-calendar/scrape.mjs  ──writes──▶ nest-server/src/planting-calendar/data/co-englewood.json
                                                        │
                                     POST-less, static:  ▼
             GET /api/planting-calendar[?year=]  →  dataset + events[]
                                     │
      ┌──────────────────────────────┴───────────────────────────────┐
      ▼                                                              ▼
react-fe page (this folder)                          GET …/calendar.ics?table=&year=
renders the events it is given                       all-day VCALENDAR, 75-octet folded
```

**The backend expands the dates; this page never parses a cell.** `buildEvents`
(`nest-server/src/planting-calendar/planting-calendar.events.ts`) turns every
dated cell into one `PlantingEvent`, adds two frost markers and one **harvest
window per crop** (planting date + the days that crop needs), so the calendar,
the JSON API and the `.ics` feed are guaranteed to agree.

**The calendar is perennial.** The Almanac's windows are month/day ranges keyed
to *average* frost dates, so `buildEvents` re-dates them into whatever year is
asked for (`projectYear`, month and day preserved, Feb 29 clamped) instead of
the dataset being re-scraped every season. The API defaults to the current
year; the payload carries `season.year` (what you are looking at) next to
`season.sourceYear` (the almanac it was scraped from), and the footer only
mentions the latter when they differ. Moon-favourable windows were deliberately
dropped: they follow that year's lunar phases and can never be reused.

**The page follows the cursor's year.** `cursorYear` comes from the date being
viewed, and the effect refetches `?year=` whenever it changes, keeping one
payload per season in a `Map` so paging back is instant. That is the difference
between a page that works this season and one that works every season: walk the
month grid into January and 2027 loads itself, no year picker needed. Anything
drawn from an event — chips, agenda, counts, footer, `.ics` link — reads from
that season's payload only (`season`); while a new year is in flight the old
payload stays for the year-agnostic chrome (location, legend) and the count line
says `reading 2027 in the almanac…` rather than drawing 2026 chips in 2027
cells.

## Files

| File | Role |
|------|------|
| `PlantingCalendar.component.tsx` | the page: view switcher, navigation, search, `Legend`, `MonthView`, `WeekView`, `DayView`, `EventRow`, `ExportPanel` |
| `planting-calendar.utils.ts` | pure date math (`toIso`, `addDays`, `addMonths`, `monthGrid`, `weekOf`), `TASK_KINDS`/`eventKind`, filtering, `viewRange`, labels, `windowProgress` |
| `planting-calendar.export.ts` | Google deep link, `.ics` URLs (legend-aware), the import help URL |
| `PlantingCalendar.scss` | all styling, every selector `pc-`-prefixed |

Shared types live in `services/planting-calendar.types.ts` (a mirror of the
backend's `planting-calendar.types.ts`); the API call is
`apiService.getPlantingCalendar(year)`, which appends `?year=` when given one.

## Behaviour worth knowing

- **Days are strings, never timestamps.** `toIso()` uses local getters on
  purpose; `toISOString()` would shift a garden day across a time zone.
- **A window occupies every day between `start` and `end`**, so a `May 22-29`
  transplant shows up seven times in the month grid and reads as
  "day 4 of 8" in the day agenda.
- **The legend is also the filter.** Six chore families (`TASK_KINDS`) map to
  dataset columns; `eventKind()` is the single place a colour is decided, and the
  legend swatches share the `--pc-*-soft` variables with the chips, so the key
  cannot drift from what it explains. Tapping a family hides it — the count line
  then says `showing 118 of 321 · 2 types hidden` — and an empty selection says so
  instead of silently showing everything.
- **Harvest windows are the one derived family.** `buildEvents` adds the crop's
  days-to-maturity to its transplant (or sowing) date; the row says whether that
  number is the Almanac's or a seed-packet average, and only the average is
  drawn as an approximation — a `~` on the chip and `about 65 days from
  transplant` in the agenda. Three crops whose harvest lands after New Year
  (garlic, ginger, turmeric) get no window at all; the dataset still records
  their days, the footer just does not pretend a year-scoped calendar can draw
  them.
- **Two windows end on the frost, not on a count.** Tobacco and cannabis are
  killed by the first frost, so their rows carry `until: 'firstFallFrost'` and
  the event ends on `season.firstFallFrost` instead of `days` after planting:
  `about 90 days from transplant, until the first frost`. Everything else keeps
  the fixed offset, so `harvestNote()` only adds the second clause when
  `harvest.untilLabel` is set.
- **Tobacco and cannabis are locally added.** Neither row exists in the Almanac's
  tables, so they come from `tools/planting-calendar/local-crops.mjs`, carry
  `origin: "local"` and `derivedFrom: "Tomatoes"`, and the footer says so in one
  sentence (`localNote()`): *"Cannabis and Tobacco are local additions, not the
  almanac's: the windows mirror Tomatoes, and picking runs to the first frost."*
  Their chips, agenda rows and `.ics` entries are ordinary events — the only
  difference is that the provenance line names the mirror instead of the Almanac.
- **The old spring/fall/everything chips are gone.** With one location's two
  tables and a month view that already navigates by date, "season" filtered
  almost nothing and read as a second, unexplained set of controls.
- **Search matches crop + column label + task text**, so `tomato` and
  `transplant` are both usable. When the month or week on screen has no match it
  says so and offers `jump to <date>` for the next one, rather than leaving an
  empty grid that looks broken.
- **An empty month explains itself.** Winter months have no chores, so the page
  says `Nothing scheduled this month` and offers the next window; past the last
  one it hands off to next season — and it names the month it actually opens in
  (`jump to february 2027`), which `seasonOpening()` derives from the earliest
  window on screen, since windows keep their month and day every year. Hard-coding
  January would land a Denver visitor on an empty month. That hand-off is also
  how a visitor walks forward season after season.
- **The range is the API's, not the calendar's.** `clampYear()` keeps the cursor
  inside 1900–2200 (mirroring `asYear` in the controller), because an
  out-of-range `?year=` falls back to the current year and the "is this season
  mine?" guard would otherwise sit on `reading 2201…` forever.
- **Inverted source ranges are hidden.** Kohlrabi's two fall ranges are
  published backwards by the Almanac; `filterEvents` drops `inverted` events and
  the footer names them instead — only a footnote, never a wrong chip.
- **Moon-favourable windows are gone.** They are the Almanac's "gardening by the
  Moon" dates: real, but tied to that year's lunar phases, so they were the one
  part of the table that could never be reused. The frost-based windows stay,
  which is what lets one scrape serve every season.
- **`a { color: inherit }` is written as `:where(a)`.** A bare descendant `a`
  rule out-ranks single-class rules (0,1,1 vs 0,1,0), which painted the
  *take it with you* buttons dark-on-dark. `:where()` is zero specificity, so
  `.pc-export-btn` keeps its own colours.
- `render: "shell"` in `seo/routes.ts`: the page fetches on mount, so there is
  no meaningful prerender (same call as `/slomo` and `/lunch`).

## Calendar export

Three routes out, none of which needs OAuth:

1. **Per task** — `googleCalendarUrl()` builds
   `calendar.google.com/calendar/render?action=TEMPLATE&…` with all-day
   `YYYYMMDD/YYYYMMDD` (end + 1 day, matching the ICS convention).
2. **The visible plan** — the *download .ics* button hits
   `/api/planting-calendar/calendar.ics`, which Google imports via
   Settings → Import & export. It follows the legend: with every task type on it
   is the plain URL; hide one and it becomes `?columns=directSow,…`, so the file
   matches the calendar you were looking at. `?table=all|spring|fall` and
   `?year=2027` are still honoured for anyone poking the URL directly (the year
   defaults to the current one, so the plain URL keeps working). The button
   always carries the year on screen, so downloading from a 2030 view gives a
   2030 file. Filename is
   `planting-calendar-<state>-<city>-<year>[-season].ics`.
3. **Subscription URL** — the same endpoint can be added by URL in Google
   Calendar, if you are happy for Google to refresh it on its own schedule. This
   one deliberately *drops* `?year=` when the season on screen is the current
   one, because the API already defaults to the current year: subscribe once and
   it stays current. Browsing a past or future season keeps the year, since that
   is not the default.

The feed is verified with a real parser (python `icalendar`): 329 all-day
VEVENTs unfiltered — 237 drawable planting windows (the Almanac's 231 plus the 6
copied onto the two local rows), 2 frost markers and 90 harvest windows — out of
332 unique UIDs (the 3 that cannot be drawn are Kohlrabi's two backwards ranges
and the harvest built on one of them). `DTEND > DTSTART` everywhere, nothing
dated outside the season, CRLF, ≤75 octets per line, em dashes and escaped
commas decoding back to the Almanac's wording. Harvest entries replace the
"Almanac window" line with `Days to harvest: 75 from transplant (seed-packet
average)` — `…, until the first frost …` for the local rows — and carry
`CATEGORIES:…,Harvest`. A locally-added row appends `Locally added: the windows
mirror Tomatoes`, so a downloaded file never claims the Almanac said it.

## Refreshing the data

The committed dataset was scraped for the 2026 almanac, but it does not expire:
the API re-dates the windows to the current year on every request, so the page
and the `.ics` feed roll over on their own each January (the footer says
`re-dated from 2026` while that is happening), and the page can be paged into
any year rather than only the current one. Re-run the scraper
(`node tools/planting-calendar/scrape.mjs`) only when you want the Almanac's
current crop list, a new location, or refreshed average frost dates — not just
because the year changed.

## Checks

- Backend: `cd nest-server && npx jest src/planting-calendar` (51 tests: event
  expansion, harvest arithmetic and the frost-capped windows, locally-added rows
  and their provenance, year re-dating, ICS folding/escaping, feed scoping by
  table and by column, the committed dataset).
- Scraper: `cd tools/planting-calendar && node --test` (21 tests, including the
  local-row merge).
- Frontend: `npm run build` (tsc + vite + prerender). The pure helpers are
  verified by bundling `planting-calendar.utils.ts` / `planting-calendar.export.ts`
  with `npx esbuild … --bundle --format=esm --platform=node --outdir /tmp/pc-utils`
  and running an assertions script against the emitted JS — the app has no
  frontend test harness. The year rollover was additionally checked in a real
  browser (360 px and 1280 px) against the running API: October → November →
  December 2026 → January 2027 (January is now empty — nothing Denver grows is
  started before February — so December hands off with `jump to february 2027`,
  which lands on 46 February chips), the footer reads `season 2027 … re-dated
  from 2026`, only two API calls fire (`?year=2026` then `?year=2027`), and no
  console errors. The harvest family was checked the same way: six legend
  entries with `harvesting 88`, 20 harvest chips in August (some prefixed `~`),
  `Harvest · about 75 days from transplant · Jul 22 – Aug 19 · day 22 of 29` in
  the day agenda, `search “harvest” → showing 88 of 321`, hiding the family
  drops those chips and removes `harvest` from the `.ics` link, and the footer
  explains the 92 rows / 43+49 split. The locally-added rows were checked by the
  same helper script against the real payload (`~Tobacco` / `~Cannabis` chips,
  `about 90 days from transplant, until the first frost` in the agenda, one footer
  sentence naming both crops, the Google details carrying the same clause, and
  `filterEvents({ query: "tobacco" })` finding its window), and the feed was
  re-parsed for the new entries: 332 VEVENTs, 329 drawable, 332 unique UIDs, the
  tobacco harvest DESCRIPTION carrying both new lines.

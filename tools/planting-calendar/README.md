# planting-calendar

Scrapes [The Old Farmer's Almanac planting calendar](https://www.almanac.com/gardening/planting-calendar)
for a location into plain JSON, so the dates can drive our own calendar UI
instead of living in someone else's table.

```bash
# Englewood, CO (default) -> nest-server/src/planting-calendar/data/co-englewood.json
node tools/planting-calendar/scrape.mjs

# any other place the Almanac knows about
node tools/planting-calendar/scrape.mjs --state CO --city "Colorado Springs"
node tools/planting-calendar/scrape.mjs --state ME --city Portland --no-cache
```

No `npm install`, no browser, no third-party HTML parser: the page is
server-rendered Drupal HTML and Node's `fetch` plus a few regexes are enough.

## What the page gives us

Two tables per location, both keyed off the local frost dates:

| Table | Columns |
|-------|---------|
| `#seed-start-dates-table` (spring) | Crop, Start Seeds Indoors, Transplant Outdoors, Direct Sow, Last Planting Date |
| `#seed-start-dates-table-fall` (fall) | Crop, Start Seeds Outdoors, Transplant, Average Days to Maturity, Frost Tolerance |

Every dated cell is a `<td data-date-start data-date-end>` holding two spans:
`planting-frost` (the real, frost-based window) and `planting-moon` (the
optional "gardening by the Moon" window). Only the frost span has ISO
attributes, and **only the frost window is captured**: the moon windows are
pinned to one year's lunar phases, so they are the one thing in the page that
cannot be reused. The frost windows are month/day ranges hanging off *average*
frost dates, which is why the backend re-dates them instead of re-scraping
(`?year=`).

The page also carries, and we capture:

- location (heading + the `location` form field)
- `data-spring-frost` / `data-fall-frost` on `.planting-tables-wrapper`
- climate station name and elevation, out of the table `<caption>`
- the season year (from the first `data-date-start`)

## Output

One JSON file per location: `nest-server/src/planting-calendar/data/<state>-<city>.json`
(it lives in the backend package: `tools/` never reaches the Docker image, and
`nest-cli.json` copies `src/**/*.json` into `dist`, which is what ships).
`out/<state>-<city>.html` caches the raw page (git-ignored) so re-parsing costs
nothing; `--no-cache` refetches.

```jsonc
{
  "schemaVersion": 5,
  "source":   { "site": "The Old Farmer's Almanac", "url": "...", "fetchedAt": "2026-10-29T17:46:49Z", "scraper": "tools/planting-calendar/scrape.mjs" },
  "location": { "label": "Englewood, CO", "city": "Englewood", "state": "CO", "path": "/gardening/planting-calendar/CO/Englewood", "title": "Planting Calendar & Schedule for Englewood, CO" },
  "season":   { "year": 2026, "station": "MARSTON FLTR PLT, CO", "elevationFt": 5610,
                "lastSpringFrost": "2026-05-08", "firstFallFrost": "2026-10-05" },
  "tables": {
    "spring": {
      "id": "seed-start-dates-table",
      "caption": "On average, your last spring frost occurs on May 8 (...)…",
      "columns": [ { "key": "crop", "label": "Crop", "hint": null },
                   { "key": "startIndoors", "label": "Start Seeds Indoors",
                     "hint": "Begin seeds inside before moving seedlings outdoors." }, … ],
      "crops": [
        {
          "name": "Arugula",
          "slug": "arugula",
          "url": "https://www.almanac.com/plant/arugula",
          "hidden": false,
          "harvest": { "days": 40, "basis": "transplantOutdoors", "source": "almanac" },
          "dates": {
            "startIndoors": {
              "label": "Mar 13-27",
              "start": "2026-03-13",
              "end": "2026-03-27"
            },
            "transplantOutdoors": { … },
            "directSow": { "na": true },
            "lastPlanting": { "label": "Sep 7", "start": "2026-09-07", "end": "2026-09-07" }
          }
        },
        {
          // Not the page's row: see "Local rows" below.
          "name": "Tobacco",
          "slug": "tobacco",
          "url": null,
          "hidden": false,
          "origin": "local",
          "derivedFrom": "Tomatoes",
          // The same cells Tomatoes carries, copied — and picked to the frost.
          "harvest": { "days": 90, "basis": "transplantOutdoors", "source": "estimate",
                       "until": "firstFallFrost" },
          "dates": { … }
        }
      ]
    },
    "fall": { "columns": [ … "daysToMaturity", "frostTolerance" … ], "crops": [ … ] }
  },
  "stats":    { "crops": { "spring": 75, "fall": 22 }, "dateCells": 239, "naCells": 83,
                "invertedRanges": 2, "hiddenRows": 1,
                "harvest": { "crops": 94, "estimated": 51, "sourced": 43, "none": 2, "unknown": 0 },
                "local": { "crops": 2, "slugs": ["cannabis", "tobacco"] } },
  "excluded": [ { "table": "spring", "name": "Obedient Plant", "slug": "obedient-plant",
                  "reason": "ornamental (Physostegia virginiana), not edible; ..." } ],
  "warnings": [ { "table": "fall", "crop": "Kohlrabi", "column": "startSeedsOutdoors",
                  "issue": "inverted-range", "detail": "2026-08-10 -> 2026-07-27 (Aug 10-Jul 27); source publishes it backwards" } ]
}
```

### Cell shapes

| Shape | Meaning |
|-------|---------|
| `{ "na": true }` | the Almanac prints "N/A" — that method isn't recommended for the crop |
| `{ "label", "start", "end" }` | a date window; `start === end` for single days |
| `{ "label", "days" }` | plain number, e.g. Average Days to Maturity (`40`) |
| `{ "label" }` | plain text, e.g. Frost Tolerance (`Frost-hardy`) |
| `null` | the cell is empty in the source |

`label` is always the Almanac's own wording, so the UI can show what the source
shows even if we later normalise the ISO dates.

### Column keys

Stable and derived from the header text, so they are safe to switch on:

`startIndoors`, `transplantOutdoors`, `directSow`, `lastPlanting` (spring) and
`startSeedsOutdoors`, `transplant`, `daysToMaturity`, `frostTolerance` (fall).

## Harvest windows

The calendar knows *when to plant* because the page says so. It knows *when to
pick* only because of one column — and only half the year has it:

| Where the number comes from | Rows (Englewood) | `source` |
|---|---|---|
| The autumn table's **Average Days to Maturity**, used by that row | 22 | `almanac` |
| The same crop's autumn figure, borrowed by its spring row | 21 | `almanac` |
| `DAYS_TO_HARVEST` in `harvest-days.mjs` — seed-packet averages | 49 | `estimate` |
| `local-crops.mjs` — the two rows the page never prints | 2 | `estimate` |
| Nothing to pick in the first season (asparagus, comfrey) | 2 | — |
| No planting date in that table, so nothing to count from (spring Garlic) | 1 | — |

The spring table has no days-to-maturity column, and the per-crop growing guides
give no figure a parser can trust (they say "harvest in stages"; variety
day-counts appear as prose), so `harvest-days.mjs` holds the numbers a seed
packet would print, rounded to five days — the precision a calendar can honestly
claim. A slug mapped to `null` there means "no first-season harvest"; a slug
*missing* from it is undecided and produces a `harvest-unknown` warning plus
`stats.harvest.unknown`, so a new crop cannot slip in without a decision.

Three rules make the numbers comparable:

- **`basis`** is the planting action the days count from: transplanting if the
  crop is transplanted, sowing if it is direct-sown (`transplantOutdoors` →
  `transplant` → `directSow` → `startSeedsOutdoors`).
- **No dates are stored.** The scrape records the number and the column; the
  backend adds them to the planting cell per request, so a re-dated plan
  re-derives its harvest too.
- **Out-of-year is dropped, not clamped.** Autumn garlic (Oct 19 + 120) and
  ginger/turmeric (May 22 + 240/250) mature after New Year; the calendar serves
  one year at a time, so `buildEvents` leaves those three windows out. The
  numbers stay in the JSON — nothing is hidden, there is just nowhere to draw it.
- **`until` ends a window on a season marker instead of an offset.** Picking
  normally stops `days` after planting; a row that names a marker keeps going
  until it — `until: "firstFallFrost"` means the window closes on
  `season.firstFallFrost`, so it follows the frost into any year. Only the local
  rows use it (both plants are killed by the first frost); if a crop cannot ripen
  in time the window collapses to that one day rather than running backwards.

## Local rows

Two crops here are wanted and not printed: **tobacco** and **cannabis** appear in
neither of the Almanac's tables, for any location. They live in
[`local-crops.mjs`](./local-crops.mjs) and `mergeLocalCrops()` adds them after
parsing — never by hand-editing the JSON, which the next run would overwrite.

A local entry names a **donor** row (`like: 'tomatoes'`) and the table to add to,
and copies that row's cells verbatim: same windows, same labels, same
`hidden` flag. Nothing in the file is a date, so "start tobacco when you start
tomatoes" stays true the next time the Almanac shifts a tomato window.

The harvest window is the one thing the entry decides, because no cell carries
it: `harvest: { days: 90, until: 'firstFallFrost' }` reads "the first real
picking is about 90 days after transplanting, and picking continues to the first
frost".

Three rules keep a local row honest:

- **It says it is local.** `origin: "local"` plus `derivedFrom: "Tomatoes"` on the
  row and on every event it produces; `stats.local` counts it; the page, the
  `.ics` description and the Google Calendar hand-off all say "locally added —
  windows mirror Tomatoes" instead of "from The Old Farmer's Almanac".
- **It is counted like a parsed row.** The merge runs before the tally, so a
  copied cell lands in `stats.dateCells`/`naCells` and its number in
  `stats.harvest` — the backend's event count still reconciles with `stats`.
- **It fails soft.** A missing table (`local-table-missing`), a missing donor row
  (`local-donor-missing`), a donor with no planting date to count from
  (`local-basis-missing`), or a slug the page has started printing itself
  (`local-duplicate`, whose detail suggests dropping the declaration) is a
  `warnings[]` entry and no row — one stale declaration never blanks the output.

`--no-local` leaves the local rows out entirely, which is the way to check that a
regenerated dataset differs from the previous one only by this file.

### Warnings

`warnings[]` records anything the scraper had to take a position on: inverted
ranges, a `label` that disagrees with the ISO attributes, and a missing table.
Nothing is silently repaired — if the app wants to hide or flag an odd row, the
information is there.

### Exclusions

`excluded[]` is the one place the JSON is *not* a straight dump of the page: it
lists rows the scraper drops on purpose, with the reason. Today that is
`obedient-plant`, an ornamental (*Physostegia virginiana*) that the Almanac files
with the vegetables even though nobody eats it — and whose 29-day indoor window
was, on its own, the entire January view.

The list lives in `EXCLUDED_CROPS` (slug → reason) in `scrape.mjs`, keyed by the
slug in the crop's guide URL so a re-spelled name cannot resurrect it on the next
scrape. Rows are dropped *before* `stats` is tallied, so `stats`, `excluded[]`
and the events the backend expands always agree. `--keep <slug>` restores a row
for one run without editing the list.

## CLI

| Flag | Meaning |
|------|---------|
| `--state CO` | two-letter state/province (default `CO`) |
| `--city Englewood` | city as the Almanac spells it (default `Englewood`) |
| `--url <url>` | scrape an exact calendar URL, overrides `--state`/`--city` |
| `--out <file>` | JSON destination (default `nest-server/src/planting-calendar/data/<state>-<city>.json`) |
| `--keep <slug>` | keep a crop that `EXCLUDED_CROPS` drops (repeatable) |
| `--no-local` | leave out the rows declared in `local-crops.mjs` |
| `--no-cache` | ignore `out/` and refetch |
| `--stdout` | print the JSON instead of writing a file |
| `-h`, `--help` | usage |

## Known data quirks (Englewood, Oct 2026)

- **Kohlrabi's fall windows are backwards in the source** (`Aug 10-Jul 27`,
  `Aug 31-17`). The ISO attributes say the same thing, so the scraper keeps the
  values and raises `inverted-range` warnings. Do not "fix" these by guessing.
- **Garlic is in the spring table but `display:none`** (it is a fall planting,
  and its cells are all N/A). It is kept with `"hidden": true` rather than
  dropped.
- **The table is a gardening table, not a kitchen one.** It files ornamentals
  next to vegetables — Obedient Plant is the one we drop, and Marigolds is still
  in there. Anything else added to `EXCLUDED_CROPS` shows up in `excluded[]`.
- **The year is the Almanac's**: `season.year` comes from the data attributes,
  and the dates are annual averages, not this year's forecast. Re-scrape when
  the Almanac rolls to a new season.
- **"N/A" is a recommendation, not an impossibility** — the page says so in its
  own footnote.

## Notes & limits

- **City/state only.** `/gardening/planting-calendar/<STATE>/<City>` is the only
  URL shape that returns tables; a ZIP path serves the "enter your location"
  form instead. Multi-word cities go in URL-encoded, which
  `--city "Colorado Springs"` handles.
- **Unofficial scrape of a public page.** Keep it to personal use, leave the
  cache on, and don't hammer the site — one request per location per season is
  plenty.
- **Markup-dependent.** If the Almanac changes its table ids or the
  `data-date-*` attributes, re-run and check `stats`/`warnings`; they are the
  canary.

## Tests

```bash
node --test tools/planting-calendar/scrape.test.mjs
```

21 tests, no network: a hand-written slice of the real markup drives the parser
(including the ornamental row it must drop, and `--keep` putting it back), the
harvest rules are exercised on their own (`plantingBasis`, `harvestDays`), the
local-row merge is exercised on a hand-built table (copying, ordering, and the
two ways it can decline: a missing donor and a page that prints the crop itself),
and `nest-server/src/planting-calendar/data/co-englewood.json` is validated for
shape (every dated cell has ISO start/end, every warning points at a real cell,
every row with a planting date has a harvest decision, the two local rows mirror
Tomatoes and end on the frost, and nothing in `excluded[]` is still in the
tables).

## Where the JSON goes

The file is consumed by the `planting-calendar` Nest module, which serves it
with the dates expanded into events:

- `GET /api/planting-calendar` — dataset + `events[]` (what the page draws),
  re-dated to the current year
- `GET /api/planting-calendar/calendar.ics?table=all|spring|fall&year=2027` — an
  importable iCalendar feed. `year` defaults to the current one, so the URL keeps
  working next season without a re-scrape: every window keeps its month and day
  (see `projectYear` in `planting-calendar.events.ts`).
- `GET /api/planting-calendar/calendar.ics?columns=directSow,startSeedsOutdoors`
  — the same feed narrowed to the page's task-type legend (`columns` are the
  dataset column keys above; unknown keys simply match nothing)

The UI and its gotchas are documented in
`react-fe/src/Pages/PlantingCalendar/README.md`. Shortcut for a re-scrape:
`npm run planting:data` from the repo root.

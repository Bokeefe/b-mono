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
  "schemaVersion": 3,
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
        }
      ]
    },
    "fall": { "columns": [ … "daysToMaturity", "frostTolerance" … ], "crops": [ … ] }
  },
  "stats":    { "crops": { "spring": 73, "fall": 22 }, "dateCells": 233, "naCells": 81,
                "invertedRanges": 2, "hiddenRows": 1 },
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

13 tests, no network: a hand-written slice of the real markup drives the parser
(including the ornamental row it must drop, and `--keep` putting it back), and
`nest-server/src/planting-calendar/data/co-englewood.json` is validated for shape
(every dated cell has ISO start/end, every warning points at a real cell, and
nothing in `excluded[]` is still in the tables).

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

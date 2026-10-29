/* eslint-env node */
// Crops grown here that the Almanac's planting table does not print.
//
// The Englewood page is a fixed list of vegetables and herbs: tobacco and
// cannabis are not in it, in either table, for any location. They still belong
// on a Denver garden calendar, so they are declared here and merged in by
// `mergeLocalCrops()` in `scrape.mjs` — never by hand-editing the generated
// JSON, which the next `node scrape.mjs` would overwrite.
//
// Two rules keep a local row honest:
//
//  1. **It never invents a schedule.** `like` names a row the Almanac *does*
//     print, and the local row copies that row's dated windows verbatim. So
//     "start tobacco when you start tomatoes" stays true even if the source
//     shifts a tomato date next year — nothing here is a date.
//  2. **It says it is local.** The row carries `origin: 'local'` and
//     `derivedFrom`, the scraper counts it in `stats.local`, and the page, the
//     .ics description and the Google hand-off all say "locally added, windows
//     mirror Tomatoes" instead of "from The Old Farmer's Almanac".
//
// `harvest.until` is the one thing a local row knows that no cell prints. Both
// crops are killed by the first frost, so picking runs *to* that date rather
// than for a fixed span after planting: `days` is the seed-packet wait before
// the first pick (which starts the window), and `until: 'firstFallFrost'` ends
// it on the autumn frost marker the backend already has. The backend re-dates
// both ends, so the window follows the frost in any year.

/** Drawn on every local row, so the JSON explains where the row came from. */
export const LOCAL_ORIGIN = 'local';

/**
 * Rows to add after parsing. `table` picks which table to mirror and `like` the
 * donor slug; `harvest.days` is counted from the donor's transplant date.
 */
export const LOCAL_CROPS = [
  {
    name: 'Cannabis',
    slug: 'cannabis',
    table: 'spring',
    like: 'tomatoes',
    // Transplanted late May, harvested as the days shorten; ~120 days to a
    // finished plant, then however long the plant is left to ripen — up to the
    // first frost, which is what kills it.
    harvest: { days: 120, until: 'firstFallFrost' },
  },
  {
    name: 'Tobacco',
    slug: 'tobacco',
    table: 'spring',
    like: 'tomatoes',
    // Leaves are primed in stages from late August; the stalk comes down at the
    // frost. 90 days is the usual transplant-to-first-priming figure.
    harvest: { days: 90, until: 'firstFallFrost' },
  },
];

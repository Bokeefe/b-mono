/* eslint-env node */
// Days to harvest — the number a seed packet prints and the Almanac prints only
// in half its table.
//
// The autumn table has an "Average Days to Maturity" column, so those rows come
// straight out of the page (`source: 'almanac'`). The spring table has no such
// column, and the per-crop growing guides do not state a number in any
// machine-readable way (they say things like "harvest in stages" and list
// variety days-to-maturity as prose), so a spring crop falls back to this table
// (`source: 'estimate'`) — seed-packet averages, rounded to the nearest five,
// which is the precision a planting calendar can honestly claim anyway.
//
// One rule makes the numbers comparable: they are counted from the moment the
// plant goes into the garden — from transplanting for a crop that is
// transplanted, from sowing for one that is direct-sown. `HARVEST_BASIS` is
// that ladder, and `basis` records which rung each crop used, so the calendar
// can say "about 75 days from transplant" rather than a bare number.
//
// A slug mapped to `null` is a plant with no first-season harvest at all
// (asparagus takes two years to make a spear; comfrey is cut from an
// established crown). A slug that is simply absent is undecided, and the
// scraper records a warning rather than inventing a number.

/**
 * Which planting action the days are counted from, most specific first.
 *
 * Transplanting wins when a crop offers both: the number on the packet is the
 * transplant-to-harvest figure for anything grown as a seedling, and the
 * seedling is what most people put in the ground.
 */
export const HARVEST_BASIS = [
  'transplantOutdoors',
  'transplant',
  'directSow',
  'startSeedsOutdoors',
];

/**
 * The Almanac's verbatim labels ("Transplant Outdoors") become instructions, so
 * the calendar can say "from transplant" / "from sowing".
 */
export const HARVEST_FROM = {
  transplantOutdoors: 'transplant',
  transplant: 'transplant',
  directSow: 'sowing',
  startSeedsOutdoors: 'sowing',
};

/**
 * slug -> days, for rows the Almanac's spring table gives no number for.
 *
 * `null` = nothing to harvest in the first season. Everything else is a
 * seed-packet average counted from this crop's rung of `HARVEST_BASIS`
 * (transplant where the crop is transplanted, sowing where it is direct-sown).
 */
export const DAYS_TO_HARVEST = new Map([
  // Herbs and flowers — leaf/flower harvest, not fruit.
  ['anise-hyssop', 75],
  ['basil', 70],
  ['borage', 60],
  ['chamomile', 70],
  ['chervil', 65],
  ['cilantro-coriander', 50],
  ['dill', 50],
  ['lavender', 100],
  ['lemon-balm', 75],
  ['lemon-verbena', 90],
  ['lovage-plants', 85],
  ['marigolds', 50],
  ['marjoram', 70],
  ['mint', 70],
  ['oregano', 70],
  ['parsley', 75],
  ['rosemary', 85],
  ['sage', 75],
  ['salad-burnet', 60],
  ['savory', 65],
  ['tarragon', 70],
  ['thyme', 80],
  // Fruiting vegetables grown from transplants.
  ['bell-peppers', 75],
  ['eggplants', 75],
  ['jalapeno-peppers', 75],
  ['tomatillos', 80],
  ['tomatoes', 75],
  // Melons, squash and corn.
  ['cantaloupes', 80],
  ['corn', 80],
  ['cucumbers', 55],
  ['honeydew-melons', 80],
  ['pumpkins', 100],
  ['watermelons', 85],
  ['winter-squash', 100],
  ['zucchini', 55],
  // Roots, alliums and legumes.
  ['celery', 90],
  ['dry-beans', 95],
  ['fava-beans', 80],
  ['leeks', 110],
  ['okra', 55],
  ['onions', 110],
  ['parsnips', 110],
  ['peanuts', 130],
  ['potatoes', 80],
  ['salsify', 120],
  ['sweet-potatoes', 100],
  ['watercress', 55],
  // Tropical roots: a long season, so their harvest lands after New Year in
  // this climate and the calendar (one year at a time) cannot draw it.
  ['ginger', 240],
  ['turmeric-root', 250],
  // No first-season harvest to wait for.
  ['asparagus', null],
  ['comfrey-plant', null],
]);

/** The first rung of `HARVEST_BASIS` this row actually has a date for. */
export function plantingBasis(dates = {}) {
  for (const column of HARVEST_BASIS) {
    const cell = dates[column];
    if (cell && !cell.na && cell.start && cell.end) return column;
  }
  return null;
}

/**
 * Days to harvest for one row, and where the number came from.
 *
 *   { days, source: 'almanac' }  the page printed it (this table or the other)
 *   { days, source: 'estimate' } seed-packet average from `DAYS_TO_HARVEST`
 *   null                         deliberately no harvest (see above)
 *   undefined                    nobody has decided — the scraper warns
 *
 * `ownDays` is the row's own `daysToMaturity` cell (autumn only); `sourceDays`
 * is the same crop's number from the other table, which is how a spring row
 * inherits the autumn table's figure for the crop.
 */
export function harvestDays(slug, ownDays, sourceDays) {
  if (Number.isFinite(ownDays)) return { days: ownDays, source: 'almanac' };
  if (Number.isFinite(sourceDays)) return { days: sourceDays, source: 'almanac' };
  if (!DAYS_TO_HARVEST.has(slug)) return undefined;

  const days = DAYS_TO_HARVEST.get(slug);
  return days === null ? null : { days, source: 'estimate' };
}

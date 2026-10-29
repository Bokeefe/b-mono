/**
 * Shapes of the scraped dataset (`data/co-englewood.json`, produced by
 * `tools/planting-calendar/scrape.mjs`) and of the calendar events derived from
 * it. Dates are plain `YYYY-MM-DD` strings end to end: the Almanac publishes
 * calendar days, not instants, so nothing here is ever converted to a
 * timestamp (and therefore nothing shifts across time zones).
 */

export type PlantingTableName = 'spring' | 'fall';

/** One table cell. Exactly one of `na`, a date range, or plain text. */
export interface PlantingCell {
  label?: string;
  start?: string;
  end?: string;
  na?: boolean;
  /** Present on fall `daysToMaturity` cells. */
  days?: number;
  /** Source published a range that runs backwards (see `warnings[]`). */
  inverted?: boolean;
}

export interface PlantingCrop {
  name: string;
  slug: string;
  url: string | null;
  /** Row is `display: none` on the Almanac page (kept, not dropped). */
  hidden?: boolean;
  /**
   * `local` = a row the page never printed, declared in
   * `tools/planting-calendar/local-crops.mjs` (tobacco, cannabis). Its windows
   * are a copy of `derivedFrom`'s, so it must never be quoted back as the
   * Almanac's.
   */
  origin?: 'local';
  /** Name of the row a `local` crop copies its windows from ("Tomatoes"). */
  derivedFrom?: string | null;
  /**
   * Days to the first picking and where that number came from, so the calendar
   * can date a harvest window. Absent for a plant with no first-season harvest
   * (asparagus, comfrey) and for a row with nothing to count from.
   */
  harvest?: PlantingHarvest | null;
  dates: Record<string, PlantingCell | null | undefined>;
}

export interface PlantingHarvest {
  /** Days from `basis` to the first harvest. */
  days: number;
  /** Dataset column the days are counted from ("transplantOutdoors"). */
  basis: string;
  /** `almanac` = the page printed it; `estimate` = a seed-packet average. */
  source: 'almanac' | 'estimate';
  /**
   * Picking does not stop `days` after planting but at a season marker — both
   * local crops are killed by the frost, so the window runs *to* that date. The
   * backend reads the same field off `season`, which is why no date is stored.
   */
  until?: 'firstFallFrost';
}

export interface PlantingColumn {
  key: string;
  label: string;
  hint: string | null;
}

export interface PlantingTable {
  id: string;
  caption: string;
  columns: PlantingColumn[];
  crops: PlantingCrop[];
}

export interface PlantingSeasonInfo {
  /** The Almanac's own season — the year the scrape happened in. */
  year: number;
  /** Set when the calendar has been re-dated: the year the windows came from. */
  sourceYear?: number;
  station: string | null;
  elevationFt: number | null;
  lastSpringFrost: string | null;
  firstFallFrost: string | null;
}

export interface PlantingLocation {
  label: string;
  city: string;
  state: string;
  path: string;
  title?: string;
}

export interface PlantingSource {
  site: string;
  url: string;
  fetchedAt: string;
  scraper: string;
}

export interface PlantingStats {
  crops: Record<PlantingTableName, number>;
  dateCells: number;
  naCells: number;
  invertedRanges: number;
  hiddenRows: number;
  /**
   * How many rows carry a harvest window, and how much of it is the Almanac's
   * own days-to-maturity rather than a seed-packet average. `none` counts rows
   * that deliberately have no first-season harvest.
   */
  harvest?: {
    crops: number;
    estimated: number;
    sourced: number;
    none: number;
    unknown: number;
  };
  /** Rows added from `local-crops.mjs` — the crops the page never printed. */
  local?: {
    crops: number;
    slugs: string[];
  };
}

export interface PlantingWarning {
  table: string;
  crop: string;
  column: string;
  issue: string;
  detail: string;
}

export interface PlantingExcludedCrop {
  table: string;
  name: string;
  slug: string | null;
  reason: string;
}

export interface PlantingDataset {
  schemaVersion: number;
  source: PlantingSource;
  location: PlantingLocation;
  season: PlantingSeasonInfo;
  tables: Record<PlantingTableName, PlantingTable>;
  stats: PlantingStats;
  /**
   * Rows the scraper leaves out of the dataset on purpose (ornamentals in a
   * planting table), so the JSON explains why it holds fewer crops than the
   * source prints. Empty when nothing was dropped.
   */
  excluded?: PlantingExcludedCrop[];
  warnings: PlantingWarning[];
}

/** `window` = multi-day range, `day` = single date, `frost` = season marker. */
export type PlantingEventKind = 'window' | 'day' | 'frost';

/**
 * The wait behind a harvest window, carried on the event so the page and the
 * feed can both say "about 75 days from transplant" without re-deriving it.
 */
export interface PlantingEventHarvest {
  /** Days between the planting date and the first picking. */
  days: number;
  /** Dataset column key the wait is counted from ("transplantOutdoors"). */
  from: string;
  /** Wording for `from`: "transplant" or "sowing". */
  fromLabel: string;
  /** True when `days` is a seed-packet average rather than the Almanac's. */
  estimated: boolean;
  /**
   * The season marker the window closes on instead of a fixed offset
   * ("firstFallFrost"), and its wording for prose ("the first frost"). Null for
   * every crop counted the ordinary way.
   */
  until?: string | null;
  untilLabel?: string | null;
}

export interface PlantingEvent {
  /**
   * Stable across scrapes of the same location/season and year-scoped (the
   * calendar is re-dated, so 2027 and 2026 must not share an ICS UID) — safe
   * as an ICS UID.
   */
  id: string;
  crop: string;
  slug: string;
  guideUrl: string | null;
  table: PlantingTableName | 'season';
  column: string;
  columnLabel: string;
  /** Imperative one-liner for the day agenda ("Transplant outdoors"). */
  task: string;
  /** "Tomatoes — Transplant Outdoors" */
  title: string;
  /** Inclusive first day. */
  start: string;
  /** Inclusive last day (equal to `start` for `kind: 'day'`). */
  end: string;
  /** The Almanac's own wording ("May 22-29"), preserved verbatim. */
  label: string;
  kind: PlantingEventKind;
  days: number | null;
  /** Harvest windows only: the wait that produced them, and its provenance. */
  harvest?: PlantingEventHarvest | null;
  /**
   * Carried down from the row so the feed, the hand-off and the page can all say
   * "locally added" instead of "from the Almanac" without looking the crop up.
   */
  origin?: 'local';
  derivedFrom?: string | null;
  /** Source range runs backwards; the UI lists these instead of placing them. */
  inverted: boolean;
  hidden: boolean;
}

/** What `GET /api/planting-calendar` returns: raw dataset + expanded events. */
export interface PlantingCalendarPayload extends PlantingDataset {
  events: PlantingEvent[];
}

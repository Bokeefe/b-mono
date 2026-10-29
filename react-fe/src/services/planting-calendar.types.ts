/**
 * Mirror of the API payload from `GET /api/planting-calendar`
 * (`nest-server/src/planting-calendar/planting-calendar.types.ts`).
 *
 * The frontend does not expand dates itself — the backend ships finished
 * events so the page, the ICS feed and the API can never disagree — so this is
 * deliberately only the shapes the UI reads.
 */

export type PlantingTableName = "spring" | "fall";
export type PlantingEventKind = "window" | "day" | "frost";

export interface PlantingEvent {
  id: string;
  crop: string;
  slug: string;
  guideUrl: string | null;
  table: PlantingTableName | "season";
  column: string;
  columnLabel: string;
  /** Imperative line for the agenda: "Transplant outdoors". */
  task: string;
  title: string;
  /** Inclusive ISO days, dated in `season.year`. */
  start: string;
  end: string;
  /** The Almanac's own wording ("May 22-29"), preserved verbatim. */
  label: string;
  kind: PlantingEventKind;
  days: number | null;
  inverted: boolean;
  hidden: boolean;
}

export interface PlantingSeasonInfo {
  /** The year the calendar is dated in (re-dated per request). */
  year: number;
  /** The Almanac year the windows were scraped from. */
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
  path?: string;
  title?: string;
}

export interface PlantingStats {
  crops: Record<PlantingTableName, number>;
  dateCells: number;
  naCells: number;
  invertedRanges: number;
  hiddenRows: number;
}

export interface PlantingWarning {
  table: string;
  crop: string;
  column: string;
  issue: string;
  detail: string;
}

/** A row the scraper drops on purpose, e.g. an ornamental in a planting table. */
export interface PlantingExcludedCrop {
  table: string;
  name: string;
  slug: string | null;
  reason: string;
}

export interface PlantingCalendarPayload {
  schemaVersion: number;
  location: PlantingLocation;
  season: PlantingSeasonInfo;
  stats: PlantingStats;
  /** Rows left out of the dataset on purpose (see the scraper's README). */
  excluded?: PlantingExcludedCrop[];
  warnings: PlantingWarning[];
  events: PlantingEvent[];
}

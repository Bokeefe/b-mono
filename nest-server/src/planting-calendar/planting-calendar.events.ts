import {
  PlantingDataset,
  PlantingEvent,
  PlantingTableName,
} from './planting-calendar.types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && ISO_DATE.test(value);

/**
 * Move a `YYYY-MM-DD` day into another year, keeping its month and day.
 *
 * This is what makes the calendar perennial. Every window in the dataset is a
 * month/day range derived from *average* frost dates, so the same schedule
 * applies in any year; re-dating keeps the Almanac's own labels ("May 22-29")
 * literally true. Feb 29 clamps to Feb 28 in a common year.
 */
export const projectYear = (iso: string, year: number): string => {
  if (!isIsoDate(iso)) return iso;
  const [, month, day] = iso.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(
    Math.min(day, lastDay),
  ).padStart(2, '0')}`;
};

/** Day arithmetic on `YYYY-MM-DD` strings, in UTC so DST can never shift a day. */
export const addDays = (iso: string, days: number): string => {
  const [year, month, day] = iso.split('-').map(Number);
  const stamp = Date.UTC(year, month - 1, day) + days * 86_400_000;
  return new Date(stamp).toISOString().slice(0, 10);
};

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );

export const eachDay = (start: string, end: string): string[] => {
  const span = daysBetween(start, end);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, index) => addDays(start, index));
};

/**
 * The Almanac's header text is the column label ("Transplant Outdoors"); the
 * agenda wants an instruction. Keys are the scraper's stable column keys.
 */
const TASKS: Record<string, string> = {
  startIndoors: 'Start seeds indoors',
  transplantOutdoors: 'Transplant outdoors',
  directSow: 'Direct sow',
  lastPlanting: 'Last planting date',
  startSeedsOutdoors: 'Start seeds outdoors',
  transplant: 'Transplant',
};

export const taskFor = (column: string, fallbackLabel: string): string =>
  TASKS[column] ?? fallbackLabel;

export const locationSlug = (dataset: PlantingDataset): string =>
  `${dataset.location.state}-${dataset.location.city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export interface BuildEventsOptions {
  /** Restrict to one table (default: both). */
  table?: PlantingTableName | 'all';
  /**
   * Calendar year to date the events in (default: the dataset's own season).
   * The dataset is re-dated, never re-scraped — see `projectYear`.
   */
  year?: number;
}

/**
 * Flatten the dataset's date cells into calendar events.
 *
 * Everything the UI needs is decided here rather than in React, so the JSON
 * API, the ICS feed and the page can never disagree about a given day. Events
 * are re-dated into `options.year` (the dataset's own year by default), which
 * is what lets one scrape serve every season.
 */
export const buildEvents = (
  dataset: PlantingDataset,
  options: BuildEventsOptions = {},
): PlantingEvent[] => {
  const { table = 'all' } = options;
  const year = options.year ?? dataset.season.year;
  const project = (iso: string) => projectYear(iso, year);
  const slug = locationSlug(dataset);
  const events: PlantingEvent[] = [];
  const tables: PlantingTableName[] =
    table === 'all' ? ['spring', 'fall'] : [table];

  for (const tableName of tables) {
    const seasonTable = dataset.tables?.[tableName];
    if (!seasonTable) continue;

    const columnLabels = new Map(
      seasonTable.columns.map((column) => [column.key, column.label]),
    );

    for (const crop of seasonTable.crops ?? []) {
      for (const [column, cell] of Object.entries(crop.dates ?? {})) {
        if (!cell || cell.na) continue;
        if (!isIsoDate(cell.start) || !isIsoDate(cell.end)) continue;

        const columnLabel = columnLabels.get(column) ?? column;
        const task = taskFor(column, columnLabel);
        const inverted =
          cell.inverted === true || daysBetween(cell.start, cell.end) < 0;
        const event: PlantingEvent = {
          id: `${slug}:${year}:${tableName}:${crop.slug}:${column}`,
          crop: crop.name,
          slug: crop.slug,
          guideUrl: crop.url ?? null,
          table: tableName,
          column,
          columnLabel,
          task,
          title: `${crop.name} — ${columnLabel}`,
          start: project(cell.start),
          end: project(cell.end),
          label: cell.label ?? `${project(cell.start)} → ${project(cell.end)}`,
          kind: cell.start === cell.end ? 'day' : 'window',
          days: cell.days ?? null,
          inverted,
          hidden: crop.hidden === true,
        };

        events.push(event);
      }
    }
  }

  // Season markers: the frost dates every window above is derived from.
  const frost = dataset.season ?? ({} as PlantingDataset['season']);
  const frostEvent = (
    iso: string | null | undefined,
    suffix: string,
    column: string,
    columnLabel: string,
    task: string,
    tableName: PlantingTableName,
  ) => {
    if (!isIsoDate(iso) || table === tableName) return;
    events.push({
      id: `${slug}:${year}:season:frost:${suffix}`,
      crop: 'Frost date',
      slug: 'frost-date',
      guideUrl: null,
      table: 'season',
      column,
      columnLabel,
      task,
      title: task,
      start: project(iso),
      end: project(iso),
      label: project(iso),
      kind: 'frost',
      days: null,
      inverted: false,
      hidden: false,
    });
  };

  // `table` is passed the *opposite* season so "spring only" still gets the
  // spring frost marker and "fall only" the fall one.
  frostEvent(
    frost.lastSpringFrost,
    'spring',
    'lastSpringFrost',
    'Last Spring Frost (average)',
    'Last spring frost',
    'fall',
  );
  frostEvent(
    frost.firstFallFrost,
    'fall',
    'firstFallFrost',
    'First Fall Frost (average)',
    'First fall frost',
    'spring',
  );

  return events.sort(
    (a, b) =>
      a.start.localeCompare(b.start) ||
      a.end.localeCompare(b.end) ||
      a.crop.localeCompare(b.crop) ||
      a.column.localeCompare(b.column),
  );
};

/** Events that can occupy days (a backwards source range cannot). */
export const drawableEvents = (events: PlantingEvent[]): PlantingEvent[] =>
  events.filter((event) => !event.inverted);

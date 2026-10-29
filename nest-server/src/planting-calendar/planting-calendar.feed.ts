import {
  buildEvents,
  locationSlug,
  projectYear,
} from './planting-calendar.events';
import { buildIcs } from './planting-calendar.ical';
import {
  PlantingCalendarPayload,
  PlantingDataset,
  PlantingTableName,
} from './planting-calendar.types';

export type PlantingTableQuery = PlantingTableName | 'all';

export interface FeedOptions {
  table?: PlantingTableQuery;
  /**
   * Dataset column keys to keep (the page's task-type legend). Omitted or empty
   * means every column, which keeps `/calendar.ics` itself unchanged.
   */
  columns?: string[];
  /**
   * Calendar year to date everything in. Defaults to the dataset's own season;
   * the controller passes the current year, which is why the feed (and any
   * subscription URL) keeps working year after year without a re-scrape.
   */
  year?: number;
}

export interface PayloadOptions {
  /** Calendar year to date the events and frost dates in. */
  year?: number;
}

export interface IcsFeed {
  body: string;
  filename: string;
}

/** The dataset year the windows were scraped for. */
export const datasetYear = (dataset: PlantingDataset): number =>
  dataset.season.year;

/**
 * Dataset + expanded events: exactly what `GET /api/planting-calendar` returns.
 * `season` is re-dated along with the events, and remembers where it came from.
 */
export const buildPayload = (
  dataset: PlantingDataset,
  options: PayloadOptions = {},
): PlantingCalendarPayload => {
  const year = options.year ?? datasetYear(dataset);

  return {
    ...dataset,
    season: {
      ...dataset.season,
      year,
      sourceYear: dataset.season.year,
      lastSpringFrost: dataset.season.lastSpringFrost
        ? projectYear(dataset.season.lastSpringFrost, year)
        : null,
      firstFallFrost: dataset.season.firstFallFrost
        ? projectYear(dataset.season.firstFallFrost, year)
        : null,
    },
    events: buildEvents(dataset, { year }),
  };
};

/** The dataset's events, optionally scoped — shared by the API and the feed. */
export const buildFeed = (
  dataset: PlantingDataset,
  options: FeedOptions = {},
): IcsFeed => {
  const table = options.table ?? 'all';
  const year = options.year ?? datasetYear(dataset);
  const expanded = buildEvents(dataset, { table, year });
  const columns = options.columns ?? [];
  const events =
    columns.length > 0
      ? expanded.filter((event) => columns.includes(event.column))
      : expanded;

  const scope =
    table === 'all'
      ? 'Planting Calendar'
      : table === 'spring'
        ? 'Spring Planting'
        : 'Fall Planting';

  const body = buildIcs(events, {
    calendarName: `${scope} — ${dataset.location.label} ${year}`,
    description:
      `Dates from The Old Farmer's Almanac planting calendar for ${dataset.location.label}. ` +
      `${events.length} all-day entries, ${events.filter((event) => !event.inverted).length} importable.`,
    locationLabel: dataset.location.label,
    seasonYear: year,
    // Fixed, so repeated requests produce identical bytes (cache friendly).
    dtstamp: dataset.source?.fetchedAt
      ? new Date(dataset.source.fetchedAt)
      : new Date(),
  });

  return {
    body,
    filename: `planting-calendar-${locationSlug(dataset)}-${year}${
      table === 'all' ? '' : `-${table}`
    }.ics`,
  };
};

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  addDays,
  buildEvents,
  daysBetween,
  drawableEvents,
  eachDay,
  locationSlug,
  projectYear,
  taskFor,
} from './planting-calendar.events';
import { PlantingDataset, PlantingEvent } from './planting-calendar.types';

const DATASET_FILE = [
  join(__dirname, 'data', 'co-englewood.json'),
  join(process.cwd(), 'src', 'planting-calendar', 'data', 'co-englewood.json'),
].find((candidate) => existsSync(candidate));

const dataset: PlantingDataset = JSON.parse(readFileSync(DATASET_FILE, 'utf8'));

/** Small hand-written dataset: two crops, one inverted range. */
const sample: PlantingDataset = {
  schemaVersion: 2,
  source: {
    site: "The Old Farmer's Almanac",
    url: 'https://example.test',
    fetchedAt: '2026-10-29T17:59:31Z',
    scraper: 'test',
  },
  location: {
    label: 'Testville, CO',
    city: 'Testville',
    state: 'CO',
    path: '/x',
  },
  season: {
    year: 2026,
    station: 'TEST, CO',
    elevationFt: 5000,
    lastSpringFrost: '2026-05-08',
    firstFallFrost: '2026-10-05',
  },
  tables: {
    spring: {
      id: 'seed-start-dates-table',
      caption: '',
      columns: [
        { key: 'crop', label: 'Crop', hint: null },
        { key: 'transplantOutdoors', label: 'Transplant Outdoors', hint: null },
      ],
      crops: [
        {
          name: 'Tomatoes',
          slug: 'tomatoes',
          url: 'https://example.test/tomatoes',
          hidden: false,
          dates: {
            transplantOutdoors: {
              label: 'May 22-29',
              start: '2026-05-22',
              end: '2026-05-29',
            },
          },
        },
      ],
    },
    fall: {
      id: 'seed-start-dates-table-fall',
      caption: '',
      columns: [
        { key: 'crop', label: 'Crop', hint: null },
        {
          key: 'startSeedsOutdoors',
          label: 'Start Seeds Outdoors',
          hint: null,
        },
      ],
      crops: [
        {
          name: 'Kohlrabi',
          slug: 'kohlrabi',
          url: null,
          hidden: false,
          dates: {
            startSeedsOutdoors: {
              label: 'Aug 10-Jul 27',
              start: '2026-08-10',
              end: '2026-07-27',
            },
          },
        },
      ],
    },
  },
  stats: {
    crops: { spring: 1, fall: 1 },
    dateCells: 2,
    naCells: 0,
    invertedRanges: 1,
    hiddenRows: 0,
  },
  warnings: [],
};

describe('date helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-25', 7)).toBe('2026-11-01');
  });

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-05-22', '2026-05-29')).toBe(7);
    expect(daysBetween('2026-08-10', '2026-07-27')).toBe(-14);
  });

  it('expands an inclusive range (and refuses a backwards one)', () => {
    expect(eachDay('2026-05-22', '2026-05-24')).toEqual([
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
    ]);
    expect(eachDay('2026-08-10', '2026-07-27')).toEqual([]);
  });

  it('maps column keys to instructions', () => {
    expect(taskFor('directSow', 'Direct Sow')).toBe('Direct sow');
    expect(taskFor('unknown', 'Fallback Label')).toBe('Fallback Label');
  });

  it('re-dates a day into another year, keeping its month and day', () => {
    expect(projectYear('2026-05-22', 2027)).toBe('2027-05-22');
    expect(projectYear('2026-01-01', 2028)).toBe('2028-01-01');
    // Feb 29 only exists in leap years: clamp instead of rolling into March.
    expect(projectYear('2026-02-29', 2027)).toBe('2027-02-28');
    expect(projectYear('2026-02-29', 2028)).toBe('2028-02-29');
    expect(projectYear('not-a-date', 2027)).toBe('not-a-date');
  });

  it('slugifies the location', () => {
    expect(locationSlug(dataset)).toBe('co-englewood');
    expect(
      locationSlug({
        ...dataset,
        location: { ...dataset.location, city: 'Colorado Springs' },
      }),
    ).toBe('co-colorado-springs');
  });
});

describe('buildEvents (synthetic dataset)', () => {
  it('emits one event per dated cell plus both frost markers, sorted by day', () => {
    const events = buildEvents(sample);
    expect(events.map((event) => event.id)).toEqual([
      'co-testville:2026:season:frost:spring',
      'co-testville:2026:spring:tomatoes:transplantOutdoors',
      'co-testville:2026:fall:kohlrabi:startSeedsOutdoors',
      'co-testville:2026:season:frost:fall',
    ]);
  });

  it('keeps the Almanac label and the task wording', () => {
    const tomatoes = buildEvents(sample).find(
      (event) => event.crop === 'Tomatoes',
    );
    expect(tomatoes.label).toBe('May 22-29');
    expect(tomatoes.kind).toBe('window');
    expect(tomatoes.task).toBe('Transplant outdoors');
    expect(tomatoes.title).toBe('Tomatoes — Transplant Outdoors');
  });

  it('flags a backwards source range instead of repairing it', () => {
    const kohlrabi = buildEvents(sample).find(
      (event) => event.crop === 'Kohlrabi',
    );
    expect(kohlrabi.inverted).toBe(true);
    expect(kohlrabi.start).toBe('2026-08-10');
    expect(kohlrabi.end).toBe('2026-07-27');
    expect(drawableEvents(buildEvents(sample))).toHaveLength(3);
  });

  it('re-dates the same plan into another year, labels untouched', () => {
    const events = buildEvents(sample, { year: 2027 });
    const tomatoes = events.find((event) => event.crop === 'Tomatoes');

    expect(tomatoes.start).toBe('2027-05-22');
    expect(tomatoes.end).toBe('2027-05-29');
    // The printed window is year-free, so it stays literally true.
    expect(tomatoes.label).toBe('May 22-29');
    expect(tomatoes.id).toBe(
      'co-testville:2027:spring:tomatoes:transplantOutdoors',
    );
    expect(
      events.find((event) => event.column === 'lastSpringFrost').start,
    ).toBe('2027-05-08');

    // A backwards source range stays backwards (listed, still not drawn).
    const kohlrabi = events.find((event) => event.crop === 'Kohlrabi');
    expect(kohlrabi.start).toBe('2027-08-10');
    expect(kohlrabi.end).toBe('2027-07-27');
    expect(kohlrabi.inverted).toBe(true);
  });

  it('defaults to the dataset year, so a plain call is unchanged', () => {
    expect(buildEvents(sample, { year: 2026 })).toEqual(buildEvents(sample));
  });

  it('filters by table but keeps that season’s frost marker', () => {
    const springOnly = buildEvents(sample, { table: 'spring' });
    expect(springOnly.map((event) => event.column)).toEqual([
      'lastSpringFrost',
      'transplantOutdoors',
    ]);
  });
});

describe('buildEvents (committed Englewood dataset)', () => {
  const events = buildEvents(dataset);

  it('produces one event per dated cell plus the two frost markers', () => {
    const dated = Object.values(dataset.tables)
      .flatMap((table) => table.crops)
      .flatMap((crop) => Object.values(crop.dates))
      .filter((cell) => cell && !cell.na && cell.start && cell.end);

    expect(dataset.location.label).toBe('Englewood, CO');
    expect(events).toHaveLength(dated.length + 2);
    expect(events.filter((event) => event.kind === 'frost')).toHaveLength(2);
  });

  it('only the two Kohlrabi fall ranges are inverted', () => {
    const inverted = events.filter((event) => event.inverted);
    expect(inverted).toHaveLength(dataset.stats.invertedRanges);
    expect(
      inverted.map((event) => `${event.crop}/${event.column}`).sort(),
    ).toEqual(['Kohlrabi/startSeedsOutdoors', 'Kohlrabi/transplant']);
  });

  it('every drawable event has start <= end and lands inside its season year', () => {
    for (const event of drawableEvents(events)) {
      expect(daysBetween(event.start, event.end)).toBeGreaterThanOrEqual(0);
      expect(event.start.slice(0, 4)).toBe('2026');
      expect(event.end.slice(0, 4)).toBe('2026');
      expect(event.id).toMatch(/^co-englewood:/);
    }
  });

  it('ids are unique (each one becomes an ICS UID)', () => {
    const ids = events.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries the frost dates the windows were derived from', () => {
    expect(
      events.find((event) => event.column === 'lastSpringFrost').start,
    ).toBe('2026-05-08');
    expect(
      events.find((event) => event.column === 'firstFallFrost').start,
    ).toBe('2026-10-05');
  });

  it('re-dates the whole plan onto another year without moving a month or day', () => {
    const redated = buildEvents(dataset, { year: 2027 });
    const shape = (list: PlantingEvent[]) =>
      list.map((event) => [
        event.crop,
        event.column,
        event.start.slice(5),
        event.end.slice(5),
        event.label.slice(5),
      ]);

    expect(shape(redated)).toEqual(shape(events));
    expect(redated.every((event) => event.start.startsWith('2027'))).toBe(true);
    expect(redated.every((event) => event.end.startsWith('2027'))).toBe(true);
    // Year-scoped ids, so importing 2027 never overwrites 2026 in a calendar.
    expect(redated.every((event) => event.id.includes(':2027:'))).toBe(true);
    expect(events.every((event) => event.id.includes(':2026:'))).toBe(true);
  });
});

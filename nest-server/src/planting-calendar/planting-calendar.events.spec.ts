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
import {
  PlantingDataset,
  PlantingEvent,
  PlantingHarvest,
} from './planting-calendar.types';

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

/** `sample` with a harvest window bolted onto its Tomatoes row. */
const withHarvest = (
  harvest: PlantingHarvest | null,
  dates = sample.tables.spring.crops[0].dates,
): PlantingDataset => ({
  ...sample,
  tables: {
    ...sample.tables,
    spring: {
      ...sample.tables.spring,
      crops: [{ ...sample.tables.spring.crops[0], harvest, dates }],
    },
    fall: { ...sample.tables.fall, crops: [] },
  },
});

describe('harvest windows', () => {
  it('adds the days to the planting date they are counted from', () => {
    const events = buildEvents(
      withHarvest({
        days: 75,
        basis: 'transplantOutdoors',
        source: 'estimate',
      }),
    );
    const harvest = events.find((event) => event.column === 'harvest')!;

    // Transplant May 22-29 plus 75 days.
    expect(harvest.start).toBe('2026-08-05');
    expect(harvest.end).toBe('2026-08-12');
    expect(harvest.kind).toBe('window');
    expect(harvest.days).toBe(75);
    expect(harvest.task).toBe('Harvest');
    expect(harvest.columnLabel).toBe('Harvest');
    expect(harvest.title).toBe('Tomatoes — Harvest');
    expect(harvest.label).toBe('about 75 days from transplant');
    expect(harvest.id).toBe('co-testville:2026:spring:tomatoes:harvest');
    expect(harvest.harvest).toEqual({
      days: 75,
      from: 'transplantOutdoors',
      fromLabel: 'transplant',
      estimated: true,
      until: null,
      untilLabel: null,
    });
  });

  it('runs the window to the first frost when the row names that marker', () => {
    const events = buildEvents(
      withHarvest({
        days: 90,
        basis: 'transplantOutdoors',
        source: 'estimate',
        until: 'firstFallFrost',
      }),
    );
    const harvest = events.find((event) => event.column === 'harvest')!;

    // Transplant May 22 onwards + 90 days, then picking continues to the date the
    // plant dies on: the season's own first-fall-frost marker, not an offset.
    expect(harvest.start).toBe('2026-08-20');
    expect(harvest.end).toBe('2026-10-05');
    expect(harvest.kind).toBe('window');
    expect(harvest.label).toBe(
      'about 90 days from transplant, until the first frost',
    );
    expect(harvest.harvest).toEqual({
      days: 90,
      from: 'transplantOutdoors',
      fromLabel: 'transplant',
      estimated: true,
      until: 'firstFallFrost',
      untilLabel: 'the first frost',
    });
  });

  it('gives a crop that cannot ripen before the frost the frost day alone', () => {
    // 200 days from late May is December: the window would run backwards.
    const harvest = buildEvents(
      withHarvest({
        days: 200,
        basis: 'transplantOutdoors',
        source: 'estimate',
        until: 'firstFallFrost',
      }),
    ).find((event) => event.column === 'harvest')!;

    expect(harvest.start).toBe('2026-10-05');
    expect(harvest.end).toBe('2026-10-05');
    expect(harvest.kind).toBe('day');
    expect(harvest.inverted).toBe(false);
  });

  it('says whose number it used', () => {
    const almanac = buildEvents(
      withHarvest({ days: 60, basis: 'transplantOutdoors', source: 'almanac' }),
    ).find((event) => event.column === 'harvest')!;

    expect(almanac.harvest?.estimated).toBe(false);
  });

  it('words a direct-sown harvest “from sowing”', () => {
    const sown = buildEvents(
      withHarvest(
        { days: 70, basis: 'directSow', source: 'almanac' },
        {
          directSow: {
            label: 'Apr 10-17',
            start: '2026-04-10',
            end: '2026-04-17',
          },
        },
      ),
    ).find((event) => event.column === 'harvest')!;

    expect(sown.harvest?.fromLabel).toBe('sowing');
    expect(sown.start).toBe('2026-06-19');
    expect(sown.end).toBe('2026-06-26');
  });

  it('drops a window that would land in the next season', () => {
    // 300 days from May is March 2027 — a date this payload cannot own.
    const events = buildEvents(
      withHarvest({
        days: 300,
        basis: 'transplantOutdoors',
        source: 'estimate',
      }),
    );

    expect(events.filter((event) => event.column === 'harvest')).toHaveLength(
      0,
    );
  });

  it('ignores a harvest with no planting date to count from', () => {
    const missing = buildEvents(
      withHarvest({ days: 70, basis: 'directSow', source: 'almanac' }),
    );
    const none = buildEvents(withHarvest(null));

    expect(missing.filter((event) => event.column === 'harvest')).toHaveLength(
      0,
    );
    expect(none.filter((event) => event.column === 'harvest')).toHaveLength(0);
  });

  it('re-dates the harvest window along with the rest of the plan', () => {
    const dataset = withHarvest({
      days: 75,
      basis: 'transplantOutdoors',
      source: 'estimate',
    });
    const redated = buildEvents(dataset, { year: 2027 }).find(
      (event) => event.column === 'harvest',
    )!;

    expect(redated.start).toBe('2027-08-05');
    expect(redated.end).toBe('2027-08-12');
    expect(redated.id).toBe('co-testville:2027:spring:tomatoes:harvest');
  });
});

describe('locally-added rows', () => {
  const local = (): PlantingDataset => ({
    ...sample,
    tables: {
      spring: {
        ...sample.tables.spring,
        crops: [
          {
            ...sample.tables.spring.crops[0],
            name: 'Cannabis',
            slug: 'cannabis',
            url: null,
            origin: 'local',
            derivedFrom: 'Tomatoes',
            harvest: {
              days: 120,
              basis: 'transplantOutdoors',
              source: 'estimate',
              until: 'firstFallFrost',
            },
          },
        ],
      },
      fall: { ...sample.tables.fall, crops: [] },
    },
  });

  it('carries the origin down to every event, so the feed need not look it up', () => {
    const events = buildEvents(local()).filter(
      (event) => event.kind !== 'frost',
    );

    expect(events.length).toBeGreaterThan(1);
    for (const event of events) {
      expect(event.origin).toBe('local');
      expect(event.derivedFrom).toBe('Tomatoes');
    }
  });

  it('leaves the page’s own rows unmarked', () => {
    const events = buildEvents(
      withHarvest({
        days: 75,
        basis: 'transplantOutdoors',
        source: 'estimate',
      }),
    );

    for (const event of events) expect(event.origin).toBeUndefined();
  });
});

describe('buildEvents (committed Englewood dataset)', () => {
  const events = buildEvents(dataset);

  it('produces one event per dated cell, one harvest window per crop, plus the two frost markers', () => {
    const dated = Object.values(dataset.tables)
      .flatMap((table) => table.crops)
      .flatMap((crop) => Object.values(crop.dates))
      .filter((cell) => cell && !cell.na && cell.start && cell.end);
    const harvests = events.filter((event) => event.column === 'harvest');

    expect(dataset.location.label).toBe('Englewood, CO');
    // 94 rows carry a number — the page's own 92 plus the two locally-added
    // crops; three of them mature after New Year (below).
    expect(dataset.stats.harvest).toEqual({
      crops: 94,
      estimated: 51,
      sourced: 43,
      none: 2,
      unknown: 0,
    });
    expect(harvests).toHaveLength(91);
    expect(events).toHaveLength(dated.length + 2 + harvests.length);
    expect(events.filter((event) => event.kind === 'frost')).toHaveLength(2);
  });

  it('dates a real harvest window from the transplant date plus the days', () => {
    const tomatoes = events.find(
      (event) => event.slug === 'tomatoes' && event.column === 'harvest',
    )!;

    // Transplant May 22-29 + 75 days, from the seed-packet table.
    expect(tomatoes.start).toBe('2026-08-05');
    expect(tomatoes.end).toBe('2026-08-12');
    expect(tomatoes.harvest).toEqual({
      days: 75,
      from: 'transplantOutdoors',
      fromLabel: 'transplant',
      estimated: true,
      until: null,
      untilLabel: null,
    });

    // Carrots are direct-sown and their 70 days are the Almanac's own number.
    const carrots = events.find(
      (event) => event.slug === 'carrots' && event.column === 'harvest',
    )!;
    expect(carrots.harvest).toEqual({
      days: 70,
      from: 'directSow',
      fromLabel: 'sowing',
      estimated: false,
      until: null,
      untilLabel: null,
    });
  });

  it('leaves out the three crops that mature after New Year, without hiding the number', () => {
    const drawn = events
      .filter((event) => event.column === 'harvest')
      .map((event) => event.crop);

    for (const crop of ['Garlic', 'Ginger', 'Turmeric']) {
      expect(drawn).not.toContain(crop);
    }

    // The dataset still says how long they need, so nothing is quietly lost.
    expect(
      dataset.tables.fall.crops.find((crop) => crop.slug === 'garlic')!.harvest,
    ).toEqual({ days: 120, basis: 'startSeedsOutdoors', source: 'almanac' });
    expect(
      dataset.tables.spring.crops.find((crop) => crop.slug === 'ginger')!
        .harvest,
    ).toEqual({ days: 240, basis: 'transplantOutdoors', source: 'estimate' });
  });

  it('adds tobacco and cannabis, which the page never prints, picked to the frost', () => {
    // Neither row exists in either table for any location: they come from
    // `tools/planting-calendar/local-crops.mjs` and must say so.
    for (const slug of ['cannabis', 'tobacco']) {
      const crop = dataset.tables.spring.crops.find(
        (row) => row.slug === slug,
      )!;
      expect(crop.origin).toBe('local');
      expect(crop.derivedFrom).toBe('Tomatoes');
      expect(crop.url).toBeNull();
    }
    expect(dataset.stats.local).toEqual({
      crops: 2,
      slugs: ['cannabis', 'tobacco'],
    });

    // Shared start dates are literal: the tomato cells were copied, not re-typed.
    const tomatoes = dataset.tables.spring.crops.find(
      (row) => row.slug === 'tomatoes',
    )!;
    for (const slug of ['cannabis', 'tobacco']) {
      const crop = dataset.tables.spring.crops.find(
        (row) => row.slug === slug,
      )!;
      expect(crop.dates).toEqual(tomatoes.dates);
    }

    // Both are killed by the first frost, so both windows end on it.
    const transplantStart = tomatoes.dates.transplantOutdoors!.start!;
    for (const slug of ['cannabis', 'tobacco']) {
      const harvest = events.find(
        (event) => event.slug === slug && event.column === 'harvest',
      )!;
      expect(harvest.origin).toBe('local');
      expect(harvest.start).toBe(
        addDays(transplantStart, slug === 'tobacco' ? 90 : 120),
      );
      expect(harvest.end).toBe(dataset.season.firstFallFrost);
      expect(harvest.harvest?.until).toBe('firstFallFrost');
      expect(harvest.harvest?.untilLabel).toBe('the first frost');
    }
  });

  it('only the two Kohlrabi fall ranges are inverted, plus the harvest that inherits them', () => {
    const inverted = events.filter((event) => event.inverted);

    expect(
      inverted.map((event) => `${event.crop}/${event.column}`).sort(),
    ).toEqual([
      'Kohlrabi/harvest',
      'Kohlrabi/startSeedsOutdoors',
      'Kohlrabi/transplant',
    ]);
    // `invertedRanges` counts source cells; the harvest window is arithmetic on
    // one of them, so it goes backwards for the same reason they do.
    expect(inverted.filter((event) => event.column !== 'harvest')).toHaveLength(
      dataset.stats.invertedRanges,
    );
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

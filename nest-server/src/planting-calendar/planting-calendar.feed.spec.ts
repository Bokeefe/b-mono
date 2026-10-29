import { buildEvents, drawableEvents } from './planting-calendar.events';
import { loadDataset } from './planting-calendar.dataset';
import { buildFeed, buildPayload } from './planting-calendar.feed';

describe('planting calendar dataset + feed', () => {
  const dataset = loadDataset();
  if (!dataset) throw new Error('committed dataset is missing');

  it('loads the committed Englewood dataset from the package', () => {
    expect(dataset.location.label).toBe('Englewood, CO');
    expect(dataset.season.year).toBe(2026);
    expect(dataset.tables.spring.crops).toHaveLength(73);
    expect(dataset.tables.fall.crops).toHaveLength(22);
  });

  it('serves the SPA the dataset with expanded events', () => {
    const payload = buildPayload(dataset);

    expect(payload.events).toHaveLength(dataset.stats.dateCells + 2);
    expect(payload.events).toEqual(buildEvents(dataset));
    expect(payload.tables.spring.columns.map((column) => column.key)).toEqual([
      'crop',
      'startIndoors',
      'transplantOutdoors',
      'directSow',
      'lastPlanting',
    ]);
  });

  it('names the download after the location and season', () => {
    const feed = buildFeed(dataset);

    expect(feed.filename).toBe('planting-calendar-co-englewood-2026.ics');
    expect(feed.body.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(buildFeed(dataset, { table: 'fall' }).filename).toBe(
      'planting-calendar-co-englewood-2026-fall.ics',
    );
  });

  it('scopes by column so the legend filter reaches the export', () => {
    const columns = ['startIndoors', 'lastSpringFrost'];
    const feed = buildFeed(dataset, { columns });
    const vevents = feed.body.match(/BEGIN:VEVENT/g) ?? [];
    const expected = drawableEvents(
      buildEvents(dataset).filter((event) => columns.includes(event.column)),
    );

    expect(vevents).toHaveLength(expected.length);
    expect(vevents.length).toBeLessThan(
      buildFeed(dataset).body.match(/BEGIN:VEVENT/g)!.length,
    );
    expect(feed.body).not.toContain('Direct sow');
  });

  it('ignores an empty column list (the plain feed)', () => {
    const plain = buildFeed(dataset);
    const empty = buildFeed(dataset, { columns: [] });

    expect(empty.body).toBe(plain.body);
    expect(empty.filename).toBe(plain.filename);
  });

  it('scopes by table', () => {
    const all = buildEvents(dataset);
    const spring = buildEvents(dataset, { table: 'spring' });
    const fall = buildEvents(dataset, { table: 'fall' });

    expect(spring.length + fall.length).toBe(all.length);
    expect(spring.every((event) => event.table !== 'fall')).toBe(true);
    expect(fall.every((event) => event.table !== 'spring')).toBe(true);
  });

  it('re-dates the feed into another year, filename and calendar name included', () => {
    const feed = buildFeed(dataset, { year: 2027 });

    expect(feed.filename).toBe('planting-calendar-co-englewood-2027.ics');
    expect(feed.body).toContain('X-WR-CALNAME:Planting Calendar');
    expect(feed.body).toContain('2027');
    expect(feed.body).toContain('DTSTART;VALUE=DATE:20270508');
    expect(feed.body.match(/BEGIN:VEVENT/g)).toHaveLength(
      buildFeed(dataset).body.match(/BEGIN:VEVENT/g)!.length,
    );
  });

  it('re-dates the payload (season and frost dates) but remembers the source', () => {
    const payload = buildPayload(dataset, { year: 2027 });

    expect(payload.season.year).toBe(2027);
    expect(payload.season.sourceYear).toBe(2026);
    expect(payload.season.lastSpringFrost).toBe('2027-05-08');
    expect(payload.season.firstFallFrost).toBe('2027-10-05');
    expect(
      payload.events.every((event) => event.start.startsWith('2027')),
    ).toBe(true);
  });

  it('defaults to the dataset year when no year is given', () => {
    const payload = buildPayload(dataset);

    expect(payload.season.year).toBe(2026);
    expect(payload.season.sourceYear).toBe(2026);
    expect(payload.events).toEqual(buildEvents(dataset));
    expect(buildFeed(dataset).filename).toBe(
      'planting-calendar-co-englewood-2026.ics',
    );
  });
});

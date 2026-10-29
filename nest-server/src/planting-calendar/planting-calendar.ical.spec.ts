import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { buildEvents, addDays } from './planting-calendar.events';
import {
  buildIcs,
  escapeIcsText,
  foldIcsLine,
  toIcsDate,
  toIcsStamp,
} from './planting-calendar.ical';
import { PlantingDataset, PlantingEvent } from './planting-calendar.types';

const DATASET_FILE = [
  join(__dirname, 'data', 'co-englewood.json'),
  join(process.cwd(), 'src', 'planting-calendar', 'data', 'co-englewood.json'),
].find((candidate) => existsSync(candidate));

const dataset: PlantingDataset = JSON.parse(readFileSync(DATASET_FILE, 'utf8'));

const event = (overrides: Partial<PlantingEvent> = {}): PlantingEvent => ({
  id: 'co-test:2026:spring:tomatoes:transplantOutdoors',
  crop: 'Tomatoes',
  slug: 'tomatoes',
  guideUrl: 'https://example.test/tomatoes',
  table: 'spring',
  column: 'transplantOutdoors',
  columnLabel: 'Transplant Outdoors',
  task: 'Transplant outdoors',
  title: 'Tomatoes — Transplant Outdoors',
  start: '2026-05-22',
  end: '2026-05-29',
  label: 'May 22-29',
  kind: 'window',
  days: null,
  inverted: false,
  hidden: false,
  ...overrides,
});

const lines = (ics: string) => ics.split('\r\n');

describe('ical primitives', () => {
  it('formats dates and stamps', () => {
    expect(toIcsDate('2026-05-22')).toBe('20260522');
    expect(toIcsStamp(new Date('2026-10-29T17:59:31.123Z'))).toBe(
      '20261029T175931Z',
    );
  });

  it('escapes TEXT values per RFC 5545', () => {
    expect(escapeIcsText('Tomatoes, peppers; basil\\ok')).toBe(
      'Tomatoes\\, peppers\\; basil\\\\ok',
    );
    expect(escapeIcsText('line one\nline two')).toBe('line one\\nline two');
  });

  it('folds long lines at 75 octets with a leading space', () => {
    const folded = foldIcsLine(`SUMMARY:${'a'.repeat(200)}`);
    const physical = folded.split('\r\n');

    expect(physical.length).toBeGreaterThan(2);
    for (const line of physical) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    for (const line of physical.slice(1))
      expect(line.startsWith(' ')).toBe(true);
    expect(physical.join('').replaceAll(' ', '')).toBe(
      `SUMMARY:${'a'.repeat(200)}`,
    );
  });

  it('never splits a multi-byte character while folding', () => {
    const line = `SUMMARY:${'é'.repeat(100)}`;
    const physical = foldIcsLine(line).split('\r\n');
    expect(physical.join('').replaceAll(' ', '')).toBe(line);
    for (const chunk of physical) {
      expect(chunk).not.toMatch(/\uFFFD/);
      expect(Buffer.byteLength(chunk, 'utf8')).toBeLessThanOrEqual(75);
    }
  });
});

describe('buildIcs', () => {
  const options = {
    calendarName: 'Planting Calendar — Englewood, CO 2026',
    locationLabel: 'Englewood, CO',
    seasonYear: 2026,
    dtstamp: new Date('2026-10-29T17:59:31Z'),
  };

  it('wraps a single all-day event in a valid VCALENDAR', () => {
    const physical = lines(buildIcs([event()], options));
    const text = physical.join('\r\n');

    expect(physical[0]).toBe('BEGIN:VCALENDAR');
    expect(physical[1]).toBe('VERSION:2.0');
    expect(text).toContain('CALSCALE:GREGORIAN');
    expect(text).toContain(
      'X-WR-CALNAME:Planting Calendar — Englewood\\, CO 2026',
    );
    expect(physical[physical.length - 1]).toBe('');
    expect(text.trim().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('uses exclusive DTEND (last day + 1) and no time zone', () => {
    const body = buildIcs([event()], options);
    expect(body).toContain('DTSTART;VALUE=DATE:20260522');
    expect(body).toContain(
      `DTEND;VALUE=DATE:${toIcsDate(addDays('2026-05-29', 1))}`,
    );
    expect(body).toContain('DTEND;VALUE=DATE:20260530');
    expect(body).not.toMatch(/DTSTART[^:]*T\d{6}/);
    expect(body).not.toContain('TZID');
  });

  it('gives single-day events a one-day span', () => {
    const body = buildIcs(
      [event({ start: '2026-05-08', end: '2026-05-08', kind: 'day' })],
      options,
    );
    expect(body).toContain('DTSTART;VALUE=DATE:20260508');
    expect(body).toContain('DTEND;VALUE=DATE:20260509');
  });

  it('skips backwards source ranges', () => {
    const body = buildIcs(
      [event(), event({ id: 'kohlrabi', inverted: true })],
      options,
    );
    expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(body).not.toContain('UID:planting-kohlrabi');
  });

  it('is byte-identical for the same input and stamp', () => {
    const events = buildEvents(dataset);
    expect(buildIcs(events, options)).toBe(buildIcs(events, options));
  });

  it('encodes every committed window as a well-formed VEVENT', () => {
    const events = buildEvents(dataset);
    const body = buildIcs(events, options);

    // Folded continuation lines must be unfolded before inspecting a block.
    const unfolded = body.replace(/\r\n[ \t]/g, '');
    const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
    const physical = body.split('\r\n');

    expect(
      physical.every((line) => Buffer.byteLength(line, 'utf8') <= 75),
    ).toBe(true);
    expect(blocks).toHaveLength(events.filter((item) => !item.inverted).length);

    for (const block of blocks) {
      expect(block).toMatch(
        /UID:planting-co-englewood[A-Za-z0-9._-]*@antigogglin\.org/,
      );
      expect(block).toMatch(/DTSTAMP:20261029T175931Z/);
      expect(block).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
      expect(block).toMatch(/DTEND;VALUE=DATE:\d{8}/);
      expect(block).toMatch(/SUMMARY:[^\r\n]+/);
      expect(block).toMatch(/END:VEVENT/i);
    }

    const starts = [...unfolded.matchAll(/DTSTART;VALUE=DATE:(\d{8})/g)].map(
      (match) => match[1],
    );
    const ends = [...unfolded.matchAll(/DTEND;VALUE=DATE:(\d{8})/g)].map(
      (match) => match[1],
    );
    expect(starts).toHaveLength(blocks.length);
    starts.forEach((start, index) => {
      expect(ends[index] > start).toBe(true);
    });
  });
});

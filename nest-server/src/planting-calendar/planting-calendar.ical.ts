import { PlantingEvent } from './planting-calendar.types';
import { addDays, isIsoDate } from './planting-calendar.events';

/**
 * Minimal RFC 5545 writer for the planting calendar.
 *
 * Google Calendar, Apple Calendar and Outlook all import a plain VCALENDAR of
 * all-day VEVENTs, so we deliberately emit the boring subset: `VALUE=DATE`
 * boundaries (one whole day per event, no time zone anywhere), `DTEND`
 * exclusive per spec, CRLF line endings and 75-octet folding.
 */

/** `2026-05-22` -> `20260522` */
export const toIcsDate = (iso: string): string => iso.replaceAll('-', '');

/** `Date` -> `20261029T175931Z` */
export const toIcsStamp = (date: Date): string =>
  `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

/** Escape TEXT values: backslash, semicolon, comma, newline (RFC 5545 §3.3.11). */
export const escapeIcsText = (value: string): string =>
  String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n');

/**
 * Fold a content line to 75 octets or fewer. Continuation lines start with a
 * single space, which counts toward their own 75, so they carry 74 octets of
 * content. Iteration is by code point so a multi-byte character is never cut.
 */
export const foldIcsLine = (line: string, limit = 75): string => {
  const chunks: string[] = [];
  let current = '';
  let bytes = 0;

  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
    const available = chunks.length === 0 ? limit : limit - 1;
    if (bytes + size > available && current.length > 0) {
      chunks.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }

  chunks.push(current);
  return chunks.join('\r\n ');
};

export interface IcsCalendarOptions {
  calendarName: string;
  description?: string;
  /** Included in every event's DESCRIPTION ("Englewood, CO"). */
  locationLabel?: string;
  prodId?: string;
  /** Defaults to "now"; the service passes the dataset's fetch time so the
   *  response is byte-identical between requests (and cacheable). */
  dtstamp?: Date;
  /** Local start of the garden year, used only for CATEGORIES text. */
  seasonYear?: number;
}

const eventDescription = (
  event: PlantingEvent,
  options: IcsCalendarOptions,
): string => {
  const lines = [
    `${event.columnLabel}${options.locationLabel ? ` · ${options.locationLabel}` : ''}`,
    `Almanac window: ${event.label}`,
  ];
  if (event.kind === 'frost') {
    lines[0] = `${event.task}${options.locationLabel ? ` · ${options.locationLabel}` : ''}`;
    lines.splice(1, 1, 'Average frost date from the Old Farmer’s Almanac.');
  }
  // A harvest window is arithmetic on a planting date, not a sentence the
  // Almanac printed, so say whose number produced it — and, when the row says so,
  // that picking runs on to the first frost.
  if (event.harvest) {
    const until = event.harvest.untilLabel
      ? `, until ${event.harvest.untilLabel}`
      : '';
    lines[1] = `Days to harvest: ${event.harvest.days} from ${event.harvest.fromLabel}${until} (${
      event.harvest.estimated ? 'seed-packet average' : 'Old Farmer’s Almanac'
    })`;
  }
  // A locally-added row is not on the page at all: the feed says so, or it would
  // be read as the Almanac's advice.
  if (event.origin === 'local') {
    lines.push(
      `Locally added: the windows mirror ${event.derivedFrom ?? 'a page row'}`,
    );
  }
  if (options.seasonYear) lines.push(`Season: ${options.seasonYear}`);
  if (event.guideUrl) lines.push(`Growing guide: ${event.guideUrl}`);
  return lines.join('\n');
};

/** One VEVENT, as physical lines. `inverted` ranges are skipped by `buildIcs`
 *  because DTEND cannot precede DTSTART. */
export const eventToVeventLines = (
  event: PlantingEvent,
  options: IcsCalendarOptions,
): string[] => {
  const endExclusive = addDays(event.end, 1);
  const categories = ['Planting'];
  if (event.table !== 'season') {
    categories.push(event.table === 'spring' ? 'Spring' : 'Fall');
  }
  if (event.kind === 'frost') categories.push('Frost date');
  if (event.harvest) categories.push('Harvest');

  return [
    'BEGIN:VEVENT',
    `UID:planting-${event.id.replace(/[^A-Za-z0-9._-]+/g, '-')}@antigogglin.org`,
    `DTSTAMP:${toIcsStamp(options.dtstamp ?? new Date())}`,
    `DTSTART;VALUE=DATE:${toIcsDate(event.start)}`,
    `DTEND;VALUE=DATE:${toIcsDate(endExclusive)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(eventDescription(event, options))}`,
    `CATEGORIES:${categories.join(',')}`,
    'TRANSP:TRANSPARENT',
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ];
};

export const eventToVevent = (
  event: PlantingEvent,
  options: IcsCalendarOptions,
): string => eventToVeventLines(event, options).join('\r\n');

/** A complete, importable calendar body. */
export const buildIcs = (
  events: PlantingEvent[],
  options: IcsCalendarOptions,
): string => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${options.prodId ?? '-//Antigogglin//Planting Calendar//EN'}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName)}`,
  ];

  if (options.description) {
    lines.push(`X-WR-CALDESC:${escapeIcsText(options.description)}`);
  }

  for (const event of events) {
    if (!isIsoDate(event.start) || !isIsoDate(event.end)) continue;
    if (event.inverted) continue;
    lines.push(...eventToVeventLines(event, options));
  }

  lines.push('END:VCALENDAR');

  return lines.map((line) => foldIcsLine(line)).join('\r\n') + '\r\n';
};

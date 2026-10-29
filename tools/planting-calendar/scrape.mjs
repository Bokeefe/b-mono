/* eslint-env node */
// Scrape The Old Farmer's Almanac planting calendar into plain JSON.
//
//   node tools/planting-calendar/scrape.mjs                          # Englewood, CO
//   node tools/planting-calendar/scrape.mjs --state ME --city Portland
//   node tools/planting-calendar/scrape.mjs --url <calendar-url> --no-cache
//   node tools/planting-calendar/scrape.mjs --out /tmp/cal.json --stdout
//
// The calendar is server-rendered Drupal HTML: two <table id="seed-start-dates-*">
// blocks whose cells carry data-date-start / data-date-end attributes. Each cell
// also carries a second, optional "moon-favourable" span, which is deliberately
// skipped: it is tied to that year's lunar phases and can never be reused, while
// the frost-based windows are month/day ranges that hold in any year (the
// backend re-dates them). No browser and no third-party parser is needed, so
// this runs on node alone (>= 22 for fetch).
//
// Output is written to nest-server/src/planting-calendar/data/<state>-<city>.json
// (the backend ships it to the browser); the raw HTML is cached in out/
// (git-ignored) so re-parsing is free. See ./README.md for the schema.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// The JSON is consumed at runtime by the backend, so it is written *into* the
// nest-server package: `nest-cli.json` copies `src/**/*.json` into `dist`, and
// that dist is what the Docker image ships (the `tools/` tree is not copied).
// `--out` still lets you write anywhere else.
const DATA_DIR = join(
  HERE,
  '..',
  '..',
  'nest-server',
  'src',
  'planting-calendar',
  'data'
);
const ORIGIN = 'https://www.almanac.com';
const TOOL_PATH = '/gardening/planting-calendar';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

// Header label -> stable JSON key. Both tables share three of these labels.
const COLUMN_KEYS = {
  crop: 'crop',
  'start seeds indoors': 'startIndoors',
  'transplant outdoors': 'transplantOutdoors',
  'direct sow': 'directSow',
  'last planting date': 'lastPlanting',
  'start seeds outdoors': 'startSeedsOutdoors',
  transplant: 'transplant',
  'average days to maturity': 'daysToMaturity',
  'frost tolerance': 'frostTolerance',
};

/**
 * Crops left out of the dataset on purpose, keyed by the slug in the crop's
 * guide URL (stable across spelling changes in the printed name).
 *
 * The Almanac's table is a gardening table, not a kitchen one: it mixes
 * vegetables and herbs with ornamentals. A calendar people plan dinner from
 * should not be half-full of a flower nobody eats — and this one is not a small
 * omission, it is the *only* crop with a January window, a 29-day block that
 * filled the whole month view on its own.
 *
 * These are the only rows that are not a straight dump of the source, so every
 * one is also written to `excluded[]` in the JSON, and `--keep <slug>` puts a
 * row back without editing this list (e.g. for a location where it is edible,
 * or when the reason below turns out to be wrong).
 */
export const EXCLUDED_CROPS = new Map([
  [
    'obedient-plant',
    'ornamental (Physostegia virginiana), not edible; its 29-day indoor window was the entire January view',
  ],
]);

/**
 * Split parsed rows into the ones the dataset ships and the ones it leaves out.
 * A faithful parser (`parseRows`) never calls this; it is policy, applied while
 * assembling the document, so `parseRows` keeps returning exactly what the page
 * printed.
 */
export function partitionCrops(crops, keep = new Set()) {
  const shipped = [];
  const excluded = [];

  for (const crop of crops) {
    const reason = crop.slug ? EXCLUDED_CROPS.get(crop.slug) : null;
    if (!reason || keep.has(crop.slug)) shipped.push(crop);
    else excluded.push({ name: crop.name, slug: crop.slug, reason });
  }

  return { crops: shipped, excluded };
}

const log = (...parts) => process.stderr.write('  ' + parts.join(' ') + '\n');

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '\u2013',
  mdash: '\u2014',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  hellip: '\u2026',
  deg: '\u00b0',
};

// --- tiny HTML helpers (the page has no nested tables, so regex is enough) ---

export function decodeEntities(input) {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => {
      const value = ENTITIES[name.toLowerCase()];
      return value === undefined ? match : value;
    });
}

/** Tags out, entities decoded, whitespace collapsed. */
export function plainText(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Value of an attribute in a raw attribute string; quotes are optional. */
function attr(attrs, name) {
  const quoted = attrs.match(new RegExp(`${name}\\s*=\\s*(['"])([\\s\\S]*?)\\1`, 'i'));
  if (quoted) return quoted[2];
  const bare = attrs.match(new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, 'i'));
  return bare ? bare[1] : null;
}

// --- date helpers -----------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');

function isoDate(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function monthIndex(token) {
  if (!token) return -1;
  const key = token.replace(/\./g, '').slice(0, 3).toLowerCase();
  return Object.prototype.hasOwnProperty.call(MONTHS, key) ? MONTHS[key] : -1;
}

/**
 * Turn an Almanac date label into concrete ISO windows.
 *
 *   "Mar 13-27"              -> one window, same month
 *   "Apr 17"                 -> one single-day window
 *   "Aug 17-27, Sep 10-21"   -> two windows (comma separated)
 *   "Dec 20-Jan 10"          -> one window that rolls into the next year
 *
 * Months are only inferred, never invented: a part with no month on the end
 * date stays in the start month, and anything that comes out backwards is
 * flagged `inverted` instead of being silently "fixed". (The Almanac itself
 * publishes a few backwards windows - see README "Known data quirks".)
 */
export function parseWindows(label, year) {
  if (!label) return [];
  return label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(
        /^([A-Za-z]{3,})\.?\s*(\d{1,2})(?:\s*[-\u2013\u2014]\s*(?:([A-Za-z]{3,})\.?\s*)?(\d{1,2}))?$/
      );
      if (!match) return { label: part, error: 'unparsed' };

      const startMonth = monthIndex(match[1]);
      const startDay = Number(match[2]);
      const endMonth = match[3] ? monthIndex(match[3]) : startMonth;
      const endDay = match[4] ? Number(match[4]) : startDay;
      if (startMonth < 0 || endMonth < 0) return { label: part, error: 'unknown-month' };
      if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
        return { label: part, error: 'bad-day' };
      }

      // Only a December -> January window legitimately crosses the year line.
      const endYear = startMonth === 11 && endMonth === 0 ? year + 1 : year;
      const window = {
        label: part,
        start: isoDate(year, startMonth, startDay),
        end: isoDate(endYear, endMonth, endDay),
      };
      if (window.end < window.start) window.inverted = true;
      return window;
    });
}

// --- table parsing ----------------------------------------------------------

function slugKey(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)?/g, (_, next) => (next ? next.toUpperCase() : ''));
}

/** Header cells carry the UI hint in an aria-label after an em dash. */
export function parseHeader(theadHtml) {
  const columns = [];
  const re = /<th\b([^>]*)>([\s\S]*?)<\/th>/gi;
  let match;
  while ((match = re.exec(theadHtml))) {
    const inner = match[2];
    // The "ⓘ" glyph lives in a nested <span class="th-info"> that also holds
    // the hint text, so drop the whole span before reading the label.
    const info = inner.match(/<span\b[^>]*\baria-label="([^"]*)"/i);
    const label = plainText(inner.replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, ' '))
      .replace(/[\u24d8\u24d9]/g, '')
      .trim();
    if (!label) continue;
    const aria = info ? decodeEntities(info[1]) : null;
    // Spring headers read "Label — hint"; fall headers carry the hint only.
    const hint = aria
      ? aria.includes('\u2014')
        ? aria.split('\u2014').slice(1).join('\u2014').trim()
        : aria.trim()
      : null;
    columns.push({
      key: COLUMN_KEYS[label.toLowerCase()] ?? slugKey(label),
      label,
      hint,
    });
  }
  return columns;
}

/**
 * One <td> -> one JSON cell. Three shapes fall out of the markup:
 *   { na: true }                    "N/A" - method not recommended
 *   { label, start, end }           a dated window (ISO taken from data-*)
 *   { label, days? }                plain text ("40", "Frost-hardy")
 * `null` is used for genuinely empty cells (e.g. Garlic's last-planting cell).
 *
 * The `planting-moon` span beside the frost window is ignored on purpose: those
 * windows move with the moon and expire with the year, and only the frost-based
 * month/day ranges are reusable.
 */
export function parseCell(attrs, inner, year) {
  const classes = attr(attrs, 'class') || '';
  if (/(^|\s)na(\s|$)/.test(classes)) return { na: true };

  const raw = plainText(inner);
  if (!raw) return null;

  const start = attr(attrs, 'data-date-start');
  const end = attr(attrs, 'data-date-end');
  const frost = inner.match(/class=(['"])planting-frost\1[^>]*>([\s\S]*?)<\/span>/i);
  const label = frost ? plainText(frost[2]) : raw;

  if (!start && !end) {
    const days = /^\d+$/.test(raw) ? Number(raw) : undefined;
    return days === undefined ? { label: raw } : { label: raw, days };
  }

  const cell = { label, start, end };
  if (start && end && end < start) cell.inverted = true;
  return cell;
}

/** <tbody> -> [{ name, slug, url, hidden, dates }] */
export function parseRows(tbodyHtml, columns, year) {
  const dateColumns = columns.filter((column) => column.key !== 'crop');
  const rows = [];
  const re = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = re.exec(tbodyHtml))) {
    const heading = match[2].match(/<th\b([^>]*)>([\s\S]*?)<\/th>/i);
    if (!heading) continue;

    const link = heading[2].match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
    const name = plainText(link ? link[2] : heading[2]);
    if (!name) continue;
    const href = link ? attr(link[1], 'href') : null;
    const slugMatch = href ? href.match(/\/plant\/([^/?#]+)/) : null;

    const row = {
      name,
      slug: slugMatch ? slugMatch[1] : null,
      url: href ? new URL(href, ORIGIN).href : null,
      hidden: /display\s*:\s*none/i.test(match[1]),
      dates: {},
    };

    const cellRe = /<td\b([^>]*)>([\s\S]*?)<\/td>/gi;
    let index = 0;
    let cell;
    while ((cell = cellRe.exec(match[2]))) {
      const column = dateColumns[index];
      index += 1;
      if (!column) continue;
      row.dates[column.key] = parseCell(cell[1], cell[2], year);
    }

    rows.push(row);
  }
  return rows;
}

export function parseTable(table, year) {
  const head = table.body.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  const body = table.body.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  const caption = table.body.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
  const columns = parseHeader(head ? head[1] : '');

  return {
    id: table.id,
    caption: caption ? plainText(caption[1]) : null,
    columns,
    crops: parseRows(body ? body[1] : '', columns, year),
  };
}

// --- page assembly ----------------------------------------------------------

function findTables(html) {
  const tables = [];
  const re = /<table\b([^>]*)>([\s\S]*?)<\/table>/gi;
  let match;
  while ((match = re.exec(html))) {
    const id = attr(match[1], 'id');
    if (!id || !id.startsWith('seed-start-dates-table')) continue;
    tables.push({ id, body: match[2] });
  }
  return tables;
}

function firstDate(html) {
  const match = html.match(/data-date-start=['"](\d{4})-\d{2}-\d{2}['"]/);
  return match ? Number(match[1]) : null;
}

function parseLocation(html, url) {
  const heading = html.match(/<h1\b[^>]*class="page-title"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = heading ? plainText(heading[1]) : null;
  const fromTitle = title ? title.match(/for\s+(.+?),\s*([A-Z]{2}|[A-Z]{2,3})\s*$/) : null;
  const input = html.match(/<input\b[^>]*name="location"[^>]*value="([^"]*)"/i);
  const path = url ? new URL(url).pathname : null;
  const fromPath = path ? path.match(/planting-calendar\/([^/]+)\/([^/]+)\/?$/) : null;

  const city = (fromTitle && fromTitle[1].trim()) || (fromPath && fromPath[2]) || null;
  const state = (fromTitle && fromTitle[2]) || (fromPath && fromPath[1]) || null;
  return {
    label: input ? decodeEntities(input[1]).trim() : title,
    city: city ? decodeEntities(city).replace(/-/g, ' ') : null,
    state,
    path,
    title,
  };
}

function parseSeason(html, year) {
  const wrapper = html.match(/<div\b[^>]*class="planting-tables-wrapper"([^>]*)>/i);
  const springFrost = wrapper ? attr(wrapper[1], 'data-spring-frost') : null;
  const fallFrost = wrapper ? attr(wrapper[1], 'data-fall-frost') : null;

  const caption = plainText(html);
  const station = caption.match(/at ([^()]+?) climate station/i);
  const elevation = caption.match(/elevation (\d[\d,]*)\s*feet/i);

  return {
    year,
    station: station ? station[1].trim() : null,
    elevationFt: elevation ? Number(elevation[1].replace(/,/g, '')) : null,
    lastSpringFrost: springFrost,
    firstFallFrost: fallFrost,
  };
}

const SEASON_KEYS = [
  { key: 'spring', id: 'seed-start-dates-table' },
  { key: 'fall', id: 'seed-start-dates-table-fall' },
];

/**
 * Whole page -> the JSON document described in ./README.md.
 * `meta.url` is the only input that is not read out of the HTML.
 */
export function parseCalendar(html, meta = {}) {
  const year = firstDate(html) ?? new Date().getUTCFullYear();
  const keep = new Set(meta.keep ?? []);
  const rawTables = findTables(html);
  const warnings = [];
  const tables = {};
  const excluded = [];
  const stats = {
    crops: {},
    dateCells: 0,
    naCells: 0,
    invertedRanges: 0,
    hiddenRows: 0,
  };

  for (const season of SEASON_KEYS) {
    const table = rawTables.find((candidate) => candidate.id === season.id);
    if (!table) {
      warnings.push({ table: season.key, issue: 'table-missing', detail: season.id });
      continue;
    }

    const parsed = parseTable(table, year);
    // Drop the deliberate omissions before counting, so `stats` describes what
    // actually ships rather than what the page printed.
    const kept = partitionCrops(parsed.crops, keep);
    parsed.crops = kept.crops;
    for (const entry of kept.excluded) {
      excluded.push({ table: season.key, ...entry });
    }

    tables[season.key] = parsed;
    stats.crops[season.key] = parsed.crops.length;

    for (const crop of parsed.crops) {
      if (crop.hidden) stats.hiddenRows += 1;
      for (const [columnKey, cell] of Object.entries(crop.dates)) {
        if (!cell) continue;
        const where = { table: season.key, crop: crop.name, column: columnKey };

        if (cell.na) {
          stats.naCells += 1;
          continue;
        }
        if (!cell.start) continue;

        stats.dateCells += 1;
        if (cell.inverted) {
          stats.invertedRanges += 1;
          warnings.push({
            ...where,
            issue: 'inverted-range',
            detail: `${cell.start} -> ${cell.end} (${cell.label}); source publishes it backwards`,
          });
        }

        // The ISO attributes are authoritative; the label is what humans read.
        const [fromLabel] = parseWindows(cell.label, year);
        if (fromLabel && (fromLabel.start !== cell.start || fromLabel.end !== cell.end)) {
          warnings.push({
            ...where,
            issue: 'label-mismatch',
            detail: `${cell.label} parsed as ${fromLabel.start}..${fromLabel.end}, attributes say ${cell.start}..${cell.end}`,
          });
        }
      }
    }
  }

  if (rawTables.length !== SEASON_KEYS.length) {
    warnings.push({
      issue: 'table-count',
      detail: `expected ${SEASON_KEYS.length} planting tables, found ${rawTables.length}`,
    });
  }

  return {
    schemaVersion: 3,
    source: {
      site: "The Old Farmer's Almanac",
      url: meta.url ?? null,
      fetchedAt: meta.fetchedAt ?? new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      scraper: 'tools/planting-calendar/scrape.mjs',
    },
    location: parseLocation(html, meta.url),
    season: parseSeason(html, year),
    tables,
    stats,
    excluded,
    warnings,
  };
}

// --- CLI --------------------------------------------------------------------

const HELP = `
Pull The Old Farmer's Almanac planting calendar into JSON.

  node tools/planting-calendar/scrape.mjs [options]

  --state CO            two-letter state/province (default CO)
  --city Englewood      city name as the Almanac spells it (default Englewood)
  --url <url>           scrape an exact calendar URL (overrides --state/--city)
  --out <file>          JSON destination (default
                        nest-server/src/planting-calendar/data/<state>-<city>.json)
  --keep <slug>         keep a crop that EXCLUDED_CROPS drops (repeatable)
  --no-cache            ignore the cached HTML in out/ and refetch
  --stdout              print the JSON instead of writing a file
  -h, --help            this text
`.trim();

function parseArgs(argv) {
  const options = {
    state: 'CO',
    city: 'Englewood',
    url: null,
    out: null,
    keep: [],
    cache: true,
    stdout: false,
  };
  const need = (index, flag) => {
    const value = argv[index];
    if (value === undefined) throw new Error(`${flag} needs a value`);
    return value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--state') options.state = need(++i, arg).toUpperCase();
    else if (arg === '--city') options.city = need(++i, arg);
    else if (arg === '--url') options.url = need(++i, arg);
    else if (arg === '--out' || arg === '-o') options.out = need(++i, arg);
    else if (arg === '--keep') options.keep.push(need(++i, arg));
    else if (arg === '--no-cache') options.cache = false;
    else if (arg === '--stdout') options.stdout = true;
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write(HELP + '\n');
      process.exit(0);
    } else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function slugFor(state, city) {
  const citySlug = city
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${state.toLowerCase()}-${citySlug}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = options.url ?? `${ORIGIN}${TOOL_PATH}/${options.state}/${encodeURIComponent(options.city)}`;
  const slug = options.url
    ? new URL(options.url).pathname.split('/').filter(Boolean).slice(-1)[0].toLowerCase()
    : slugFor(options.state, options.city);

  const cacheFile = join(HERE, 'out', `${slug}.html`);
  let html;

  if (options.cache && existsSync(cacheFile)) {
    html = readFileSync(cacheFile, 'utf8');
    log('using cached', cacheFile.replace(HERE + '/', ''));
  } else {
    log('fetching', url);
    const response = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    html = await response.text();
    mkdirSync(dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, html, 'utf8');
    log('cached', cacheFile.replace(HERE + '/', ''), `${(html.length / 1024).toFixed(0)}kB`);
  }

  const calendar = parseCalendar(html, { url, keep: options.keep });

  if (calendar.location.city === null && options.url === null) {
    calendar.location.city = options.city;
    calendar.location.state = options.state;
  }

  const json = JSON.stringify(calendar, null, 2) + '\n';
  if (options.stdout) {
    process.stdout.write(json);
  } else {
    const outFile = options.out ? options.out : join(DATA_DIR, `${slug}.json`);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, json, 'utf8');
    log('wrote', outFile);
  }

  const { stats } = calendar;
  log(
    'crops',
    `spring ${stats.crops.spring ?? 0}`,
    `fall ${stats.crops.fall ?? 0}`,
    '| windows',
    stats.dateCells + ' dated,',
    stats.naCells + ' N/A,',
    stats.invertedRanges + ' inverted'
  );
  if (calendar.season.lastSpringFrost) {
    log(
      'season',
      calendar.season.year,
      '| last spring frost',
      calendar.season.lastSpringFrost,
      '| first fall frost',
      calendar.season.firstFallFrost,
      calendar.season.station ? `| ${calendar.season.station}` : ''
    );
  }
  if (calendar.excluded.length) {
    // Loud on purpose: these rows are the only place the JSON is not the page.
    log(
      'excluded',
      calendar.excluded.map((entry) => `${entry.name} (${entry.slug})`).join(', ')
    );
  }
  if (calendar.warnings.length) {
    log('warnings', calendar.warnings.length, '(see warnings[] in the JSON)');
    for (const warning of calendar.warnings.slice(0, 5)) {
      log(' -', warning.issue, warning.crop ? `${warning.crop}/${warning.column}:` : '', warning.detail);
    }
    if (calendar.warnings.length > 5) log(' -', `... ${calendar.warnings.length - 5} more`);
  } else {
    log('warnings 0');
  }
}

const isEntryPoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  main().catch((error) => {
    process.stderr.write(`error: ${error.message}\n`);
    process.exitCode = 1;
  });
}


// Tests for scrape.mjs. No network: the parser is fed a hand-written slice of
// the real Almanac markup, and the committed dataset is checked for shape.
//
//   node --test tools/planting-calendar/scrape.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EXCLUDED_CROPS,
  parseCalendar,
  parseWindows,
  partitionCrops,
  plainText,
} from './scrape.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const FIXTURE = `
<h1 class="page-title">Planting Calendar &amp; Schedule for  Englewood, CO</h1>
<input placeholder="City, State or ZIP/Postal Code" type="text" id="edit-location" name="location" value="Englewood, CO" size="20" />
<div class="planting-tables-wrapper" data-spring-frost="2026-05-08" data-fall-frost="2026-10-05">
<h3 id='spring'>Planting Dates for Spring</h3>
<table id="seed-start-dates-table" class="planting-table" summary="spring">
<caption>On average, your last spring frost occurs on May 8 (at MARSTON FLTR PLT, CO climate station, elevation 5610 feet).</caption>
<thead><tr>
<th>Crop</th>
<th>Start Seeds Indoors <span class="th-info" tabindex="0" aria-label="Start Seeds Indoors &#8212; Begin seeds inside before moving seedlings outdoors.">&#9432;</span></th>
<th>Transplant Outdoors <span class="th-info" tabindex="0" aria-label="Transplant Outdoors &#8212; Move indoor-started seedlings into the garden.">&#9432;</span></th>
<th>Direct Sow <span class="th-info" tabindex="0" aria-label="Direct Sow &#8212; Plant seeds directly in the soil outside.">&#9432;</span></th>
<th>Last Planting Date <span class="th-info" tabindex="0" aria-label="Last Planting Date &#8212; Final safe date to plant.">&#9432;</span></th>
</tr></thead>
<tbody>
<tr class='plantrow'><th><a href="/plant/arugula">Arugula</a></a></th>
<td data-date-start='2026-03-13' data-date-end='2026-03-27'><span class='planting-frost'><img src='/f.png' class='planting_icon' alt='Frost'> Mar 13-27</span><span class='planting-moon'><img src='/m.png' class='planting_icon' alt='Moon'> Mar 18-27</span></td>
<td data-date-start='2026-04-17' data-date-end='2026-05-01'><span class='planting-frost'><img src='/f.png' alt='Frost'> Apr 17-May 1</span><span class='planting-moon'><img src='/m.png' alt='Moon'> Apr 17-May 1</span></td>
<td class='na'>N/A</td>
<td data-date-start='2026-09-07' data-date-end='2026-09-07'><span class='planting-frost'><img src='/f.png' alt='Frost'> Sep 7</span></td>
</tr>
<tr style='display:none;'><th><a href="/plant/garlic">Garlic</a></a></th><td class='na'>N/A</td><td class='na'>N/A</td><td class='na'>N/A</td><td></td></tr>
<tr class='plantrow'><th><a href="/plant/obedient-plant">Obedient Plant</a></th>
<td data-date-start='2026-01-15' data-date-end='2026-02-12'><span class='planting-frost'><img src='/f.png' alt='Frost'> Jan 15-Feb 12</span></td>
<td data-date-start='2026-05-22' data-date-end='2026-06-05'><span class='planting-frost'><img src='/f.png' alt='Frost'> May 22-Jun 5</span></td>
<td class='na'>N/A</td><td></td></tr>
</tbody></table>
<h3 id='fall'>Planting Dates for Fall</h3>
<table id="seed-start-dates-table-fall" class="planting-table" summary="fall">
<caption>On average, your first fall frost occurs on October 5 (at MARSTON FLTR PLT, CO climate station).</caption>
<thead><tr>
<th>Crop</th>
<th>Start Seeds Outdoors <span class="th-info" tabindex="0" aria-label="When to plant seeds directly into the outdoor soil for a fall harvest.">&#9432;</span></th>
<th>Transplant <span class="th-info" tabindex="0" aria-label="When to transplant seedlings outdoors for a fall harvest.">&#9432;</span></th>
<th>Average Days to Maturity <span class="th-info" tabindex="0" aria-label="Typical number of days from planting to harvest.">&#9432;</span></th>
<th>Frost Tolerance <span class="th-info" tabindex="0" aria-label="How well this crop tolerates frost conditions.">&#9432;</span></th>
</tr></thead>
<tbody>
<tr class='plantrow'><th><a href="/plant/arugula">Arugula</a></a></th>
<td data-date-start='2026-08-17' data-date-end='2026-09-21'><span class='planting-frost'><img src='/f.png' alt='Frost'> Aug 17-Sep 21</span><span class='planting-moon'><img src='/m.png' alt='Moon'> Aug 17-27, Sep 10-21</span></td>
<td class='na'>N/A</td><td>40</td><td>Frost-hardy</td></tr>
<tr class='plantrow'><th><a href="/plant/kohlrabi">Kohlrabi</a></a></th>
<td data-date-start='2026-08-10' data-date-end='2026-07-27'><span class='planting-frost'><img src='/f.png' alt='Frost'> Aug 10-Jul 27</span></td>
<td class='na'>N/A</td><td>45</td><td>Frost-tolerant</td></tr>
</tbody></table>
</div>
`;

const calendar = parseCalendar(FIXTURE, {
  url: 'https://www.almanac.com/gardening/planting-calendar/CO/Englewood',
  fetchedAt: '2026-10-29T00:00:00Z',
});

// The reason the exclusion list gives, so a reworded reason is a deliberate test
// change rather than a silent edit of what the JSON claims.
const EXCLUDED_REASON = EXCLUDED_CROPS.get('obedient-plant');

test('plainText strips tags and decodes entities', () => {
  assert.equal(plainText('<b>Cilantro</b> &amp; <i>Coriander</i>'), 'Cilantro & Coriander');
  assert.equal(plainText('a&nbsp;&nbsp;b'), 'a b');
});

test('parseWindows handles ranges, single days, lists and year rollover', () => {
  assert.deepEqual(parseWindows('Mar 13-27', 2026), [
    { label: 'Mar 13-27', start: '2026-03-13', end: '2026-03-27' },
  ]);
  assert.deepEqual(parseWindows('Apr 17', 2026), [
    { label: 'Apr 17', start: '2026-04-17', end: '2026-04-17' },
  ]);
  assert.deepEqual(parseWindows('Aug 17-27, Sep 10-21', 2026), [
    { label: 'Aug 17-27', start: '2026-08-17', end: '2026-08-27' },
    { label: 'Sep 10-21', start: '2026-09-10', end: '2026-09-21' },
  ]);
  assert.deepEqual(parseWindows('Dec 20-Jan 10', 2026), [
    { label: 'Dec 20-Jan 10', start: '2026-12-20', end: '2027-01-10' },
  ]);
});

test('parseWindows flags backwards labels instead of inventing a month', () => {
  const [window] = parseWindows('Aug 10-Jul 27', 2026);
  assert.equal(window.start, '2026-08-10');
  assert.equal(window.end, '2026-07-27');
  assert.equal(window.inverted, true);
});

test('page metadata: location, frost dates, station, elevation, year', () => {
  assert.equal(calendar.location.label, 'Englewood, CO');
  assert.equal(calendar.location.city, 'Englewood');
  assert.equal(calendar.location.state, 'CO');
  assert.equal(calendar.season.year, 2026);
  assert.equal(calendar.season.lastSpringFrost, '2026-05-08');
  assert.equal(calendar.season.firstFallFrost, '2026-10-05');
  assert.equal(calendar.season.station, 'MARSTON FLTR PLT, CO');
  assert.equal(calendar.season.elevationFt, 5610);
});

test('columns get stable keys and their tooltip hints', () => {
  assert.deepEqual(
    calendar.tables.spring.columns.map((column) => column.key),
    ['crop', 'startIndoors', 'transplantOutdoors', 'directSow', 'lastPlanting']
  );
  assert.deepEqual(
    calendar.tables.fall.columns.map((column) => column.key),
    ['crop', 'startSeedsOutdoors', 'transplant', 'daysToMaturity', 'frostTolerance']
  );
  assert.equal(calendar.tables.spring.columns[1].label, 'Start Seeds Indoors');
  assert.equal(
    calendar.tables.spring.columns[1].hint,
    'Begin seeds inside before moving seedlings outdoors.'
  );
  assert.equal(
    calendar.tables.fall.columns[1].hint,
    'When to plant seeds directly into the outdoor soil for a fall harvest.'
  );
});

test('dated cells carry ISO dates and the printed frost label', () => {
  const arugula = calendar.tables.spring.crops[0];
  assert.equal(arugula.name, 'Arugula');
  assert.equal(arugula.slug, 'arugula');
  assert.equal(arugula.url, 'https://www.almanac.com/plant/arugula');

  const indoors = arugula.dates.startIndoors;
  assert.equal(indoors.label, 'Mar 13-27');
  assert.equal(indoors.start, '2026-03-13');
  assert.equal(indoors.end, '2026-03-27');
  // The moon-favourable span sits right next to the frost window and is
  // deliberately not parsed: it expires with the year (see parseCell).
  assert.equal('moon' in indoors, false);

  // single-day windows are legal
  assert.equal(arugula.dates.lastPlanting.start, '2026-09-07');
  assert.equal(arugula.dates.lastPlanting.end, '2026-09-07');
});

test('N/A cells, empty cells and plain-text cells keep their shapes', () => {
  const arugula = calendar.tables.spring.crops[0];
  assert.deepEqual(arugula.dates.directSow, { na: true });

  const garlic = calendar.tables.spring.crops[1];
  assert.equal(garlic.hidden, true);
  assert.equal(garlic.dates.lastPlanting, null);

  const fallArugula = calendar.tables.fall.crops[0];
  assert.deepEqual(fallArugula.dates.daysToMaturity, { label: '40', days: 40 });
  assert.deepEqual(fallArugula.dates.frostTolerance, { label: 'Frost-hardy' });
  // The fixture cell prints two moon windows ("Aug 17-27, Sep 10-21"); the
  // frost window is what survives.
  assert.equal(fallArugula.dates.startSeedsOutdoors.label, 'Aug 17-Sep 21');
  assert.equal('moon' in fallArugula.dates.startSeedsOutdoors, false);
});

test('backwards source ranges are preserved and reported as warnings', () => {
  const kohlrabi = calendar.tables.fall.crops[1];
  assert.equal(kohlrabi.dates.startSeedsOutdoors.inverted, true);
  assert.deepEqual(
    calendar.warnings.map((warning) => warning.issue),
    ['inverted-range']
  );
  assert.equal(calendar.warnings[0].crop, 'Kohlrabi');
});

test('stats count what was parsed', () => {
  assert.deepEqual(calendar.stats, {
    crops: { spring: 2, fall: 2 },
    dateCells: 5,
    naCells: 6,
    invertedRanges: 1,
    hiddenRows: 1,
  });
});

test('non-edible crops are dropped before they reach the tables or the stats', () => {
  // The fixture's spring table prints three rows; Obedient Plant is an
  // ornamental, so it is the one row that never ships.
  assert.deepEqual(
    calendar.tables.spring.crops.map((crop) => crop.name),
    ['Arugula', 'Garlic']
  );
  assert.deepEqual(calendar.excluded, [
    {
      table: 'spring',
      name: 'Obedient Plant',
      slug: 'obedient-plant',
      reason: EXCLUDED_REASON,
    },
  ]);
  // ...and its two dated cells plus its N/A cell are not counted either, which
  // is what keeps `stats.dateCells` in step with the events the API expands.
  assert.equal(calendar.stats.dateCells, 5);
  assert.equal(calendar.stats.naCells, 6);
});

test('--keep puts an excluded crop back without editing the list', () => {
  const kept = parseCalendar(FIXTURE, { keep: ['obedient-plant'] });

  assert.equal(kept.tables.spring.crops.length, 3);
  assert.equal(kept.tables.spring.crops[2].name, 'Obedient Plant');
  assert.deepEqual(kept.excluded, []);
  assert.equal(kept.stats.dateCells, 7);
});

test('partitionCrops only drops known slugs and keeps rows that have none', () => {
  const rows = [
    { name: 'Arugula', slug: 'arugula' },
    { name: 'Obedient Plant', slug: 'obedient-plant' },
    { name: 'Unlinked Row', slug: null },
  ];

  const { crops, excluded } = partitionCrops(rows);
  assert.deepEqual(
    crops.map((crop) => crop.name),
    ['Arugula', 'Unlinked Row']
  );
  assert.deepEqual(
    excluded.map((entry) => entry.name),
    ['Obedient Plant']
  );
});

test('committed Englewood dataset is complete and internally consistent', () => {
  const dataset = JSON.parse(
    readFileSync(
      join(
        HERE,
        '..',
        '..',
        'nest-server',
        'src',
        'planting-calendar',
        'data',
        'co-englewood.json'
      ),
      'utf8'
    )
  );

  assert.equal(dataset.schemaVersion, 3);
  assert.equal(dataset.location.label, 'Englewood, CO');
  assert.ok(dataset.tables.spring.crops.length > 60, 'spring crop count');
  assert.ok(dataset.tables.fall.crops.length > 15, 'fall crop count');
  assert.equal(dataset.stats.dateCells, 233);
  assert.equal(dataset.stats.naCells, 81);

  for (const season of ['spring', 'fall']) {
    for (const crop of dataset.tables[season].crops) {
      assert.ok(crop.name, 'crop has a name');
      for (const [column, cell] of Object.entries(crop.dates)) {
        if (!cell || cell.na || !cell.start) continue;
        const where = `${season}/${crop.name}/${column}`;
        assert.match(cell.start, /^\d{4}-\d{2}-\d{2}$/, where);
        assert.match(cell.end, /^\d{4}-\d{2}-\d{2}$/, where);
      }
    }
  }

  // Deliberate omissions are recorded, and really are absent from the tables —
  // otherwise the app would keep drawing a crop the JSON claims it dropped.
  const shipped = new Set(
    ['spring', 'fall'].flatMap((season) =>
      dataset.tables[season].crops.map((crop) => crop.slug)
    )
  );
  assert.ok(dataset.excluded.length > 0, 'excluded[] explains the dropped rows');
  for (const entry of dataset.excluded) {
    assert.ok(entry.reason, `${entry.name} carries a reason`);
    assert.equal(shipped.has(entry.slug), false, `${entry.name} is not in the tables`);
  }

  // Every warning must point at a real cell, so the app can highlight it.
  for (const warning of dataset.warnings) {
    const crop = dataset.tables[warning.table].crops.find((row) => row.name === warning.crop);
    assert.ok(crop, `${warning.crop} exists in ${warning.table}`);
    assert.ok(crop.dates[warning.column], `${warning.crop}/${warning.column} exists`);
  }
});

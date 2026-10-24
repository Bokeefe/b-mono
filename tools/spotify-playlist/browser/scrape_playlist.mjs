// Scrape a public Spotify playlist with a real (headless) browser.
//
// Used by ../spotify_playlist.py via `--source browser`, and usable standalone:
//   node scrape_playlist.mjs <playlist-url> [--out file.json] [--headful]
//
// Prints the same JSON shape as the Python tool, so it can be piped straight
// into `-f json` consumers. Album names come from the rendered table, so no
// developer API key and no third-party lookups are involved.
//
// Setup (once, inside this folder): npm install && npx playwright install chromium

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--') && !a.endsWith('.json'));
const outIndex = args.indexOf('--out');
const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
const headful = args.includes('--headful');

if (!url) {
  console.error('usage: node scrape_playlist.mjs <playlist-url> [--out file.json]');
  process.exit(2);
}

const log = (...parts) => process.stderr.write('  ' + parts.join(' ') + '\n');

function toDurationMs(text) {
  const match = (text || '').trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, a, b, c] = match;
  return c ? ((+a * 60 + +b) * 60 + +c) * 1000 : (+a * 60 + +b) * 1000;
}

const browser = await chromium.launch({ headless: !headful });
const context = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  locale: 'en-US',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

try {
  log('opening', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

  for (const selector of [
    '#onetrust-accept-btn-handler',
    'button[data-testid="cookie-banner-accept"]',
  ]) {
    const button = page.locator(selector).first();
    if (await button.count().catch(() => 0)) {
      await button.click({ timeout: 2000 }).catch(() => {});
      break;
    }
  }

  const rendered = await page
    .waitForSelector('[data-testid="tracklist-row"]', { timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!rendered) {
    throw new Error(
      'the track list never rendered - the playlist may be private, or Spotify changed its UI'
    );
  }

  const header = await page.evaluate(() => {
    const bodyText = document.body.innerText || '';
    const line = bodyText.match(/([\d,]+)\s+songs?([^\n]*)/i);
    const headings = [...document.querySelectorAll('h1')]
      .map((el) => el.innerText.trim())
      .filter((text) => text && text.toLowerCase() !== 'your library');
    const userLink = [...document.querySelectorAll('a[href^="/user/"]')].find(
      (a) => a.innerText.trim()
    );
    return {
      name: headings[0] || '',
      owner: userLink ? userLink.innerText.trim() : '',
      total: line ? parseInt(line[1].replace(/,/g, ''), 10) : null,
      meta: line ? line[0].trim() : '',
    };
  });

  const extractRows = () =>
    page.evaluate(() => {
      const text = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');
      const tracks = [];
      for (const row of document.querySelectorAll('[data-testid="tracklist-row"]')) {
        const cells = [...row.querySelectorAll('[role="gridcell"]')];
        const indexText = text(cells[0]);
        if (!cells.length || !/^\d+$/.test(indexText)) continue; // "Recommended" rows have no number

        const artists = [...row.querySelectorAll('a[href*="/artist/"]')]
          .map((a) => text(a))
          .filter(Boolean);
        const songLink = row.querySelector('a[href*="/track/"]');
        const albumLink = row.querySelector('a[href*="/album/"]');
        const dateText = cells.length >= 5 ? text(cells[3]) : '';

        tracks.push({
          index: parseInt(indexText, 10),
          song: text(songLink) || (cells[1]?.innerText || '').split('\n')[0].trim(),
          artists,
          album: text(albumLink) || text(cells[2]),
          release_date: '',
          added_at: /\d{4}/.test(dateText) ? dateText : '',
          duration_text: text(cells[cells.length - 1]),
          spotify_id: songLink
            ? (songLink.getAttribute('href') || '').split('/track/')[1]?.split('?')[0] || ''
            : '',
        });
      }
      return tracks;
    });

  // The grid is virtualised: rows are recycled, so collect them while scrolling.
  const collected = new Map();
  const absorb = (batch) => {
    let added = 0;
    for (const track of batch) {
      if (!collected.has(track.index)) {
        collected.set(track.index, track);
        added += 1;
      }
    }
    return added;
  };

  absorb(await extractRows());
  await page.mouse.move(720, 520);

  let stagnant = 0;
  for (let step = 0; step < 400; step++) {
    if (header.total && collected.size >= header.total) break;
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(450);
    const added = absorb(await extractRows());
    if (added === 0) {
      stagnant += 1;
      if (stagnant >= 6) break;
    } else {
      stagnant = 0;
      log('collected', collected.size, header.total ? 'of ' + header.total : 'tracks');
    }
  }

  const ordered = [...collected.values()].sort((a, b) => a.index - b.index);
  const warnings = [];
  if (header.total && ordered.length < header.total) {
    warnings.push(
      `rendered ${ordered.length} of ${header.total} tracks - the page stopped loading rows`
    );
  }
  log('parsed', ordered.length, 'tracks');

  const payload = {
    playlist: {
      name: header.name,
      owner: header.owner,
      id: (url.match(/playlist\/([A-Za-z0-9]{10,})/) || [])[1] || '',
      url,
      source: 'browser',
      track_count: ordered.length,
      total_on_spotify: header.total,
      meta: header.meta,
      fetched_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      warnings,
    },
    tracks: ordered.map((track) => ({
      index: track.index,
      song: track.song,
      album: track.album,
      artists: track.artists,
      artist: track.artists.join(', '),
      duration_ms: toDurationMs(track.duration_text),
      duration: track.duration_text,
      release_date: track.release_date,
      added_at: track.added_at,
      isrc: '',
      kind: 'track',
      spotify_id: track.spotify_id,
      url: track.spotify_id ? `https://open.spotify.com/track/${track.spotify_id}` : '',
    })),
  };

  const json = JSON.stringify(payload, null, 2);
  if (outFile) writeFileSync(outFile, json + '\n', 'utf8');
  else process.stdout.write(json + '\n');
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

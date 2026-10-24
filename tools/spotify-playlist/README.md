# spotify-playlist

Local CLI that turns a public Spotify playlist into a numbered list of
**song / album / artist**. Standard-library Python 3.9+, no `pip install`.

```
$ python3 tools/spotify-playlist/spotify_playlist.py \
      "https://open.spotify.com/playlist/4xcMWLMk7VDLfvxeI4Sg3p"

  #  Song                         Album                        Artist
---  ---------------------------  ---------------------------  ----------------------
  1  Danger                       Reset                        Panda Bear, Sonic Boom
  2  TTYGF                        Ö                            Fcukers
  3  Together                     Days As Echoes               Misha Panfilov
  4  Cupid De Locke - Remastered  Mellon Collie And The Infi  The Smashing Pumpkins
  5  Black Milk                   Mezzanine                    Massive Attack, Elizabeth Fraser
```

## Quick start

```bash
# from the repo root; needs nothing but python3
python3 tools/spotify-playlist/spotify_playlist.py <playlist-url>

# URL, spotify:playlist:<id> URI, or the bare 22-char id all work
python3 tools/spotify-playlist/spotify_playlist.py 4xcMWLMk7VDLfvxeI4Sg3p
```

## Output formats

| `-f` | Result |
|------|--------|
| `table` (default) | aligned numbered columns, truncated to `--max-col` (default 56, `0` = never) |
| `list` | one line per song: `1. Song — Album — Artist` |
| `markdown` | GitHub-flavoured table, ready to paste in a README |
| `csv` / `tsv` | `#,Song,Album,Artist` (+ any extra fields) |
| `json` | machine-readable: playlist metadata + every track (ms duration, ISRC, URL, …) |

`-o FILE` writes to a file instead of stdout; the format is inferred from the
extension (`.md`, `.csv`, `.tsv`, `.json`, `.txt`).

```bash
python3 tools/spotify-playlist/spotify_playlist.py <url> -f list
python3 tools/spotify-playlist/spotify_playlist.py <url> -f markdown -o playlist.md
python3 tools/spotify-playlist/spotify_playlist.py <url> -o playlist.csv
python3 tools/spotify-playlist/spotify_playlist.py <url> -f json -o playlist.json
python3 tools/spotify-playlist/spotify_playlist.py <url> --fields song,artist,album,duration
python3 tools/spotify-playlist/spotify_playlist.py <url> --no-header --max-col 0
```

Fields: `song`, `album`, `artist`, `duration`, `release_date`, `added_at`,
`kind`, `track_id`, `isrc`, `url`.

## Three data sources

**1. Spotify embed page (default, no setup).**
`https://open.spotify.com/embed/playlist/<id>` embeds a `__NEXT_DATA__` JSON
blob with every track's title, artists and duration. Two limits:

- Spotify serves at most **100 entries** per embed — the tool warns when it hits
  that ceiling.
- The embed carries **no album name**, so the album column is filled from the
  public Deezer search API (`--no-enrich` turns that off). Matches are strict:
  normalised title + duration within 4 s + at least one shared artist word.
  Unmatched tracks show `-`. Expect ~80% coverage on well-known catalogues,
  less on bootlegs/obscurities.

**2. Headless browser (`--source browser`, no API key).** A Playwright script
(`browser/scrape_playlist.mjs`) opens the public playlist page, scrolls the
virtualised grid and reads each rendered row, so you get the **whole playlist**
plus **real album names** — and it reports the playlist's true length
(`total_on_spotify`). Verified on the example playlist: the embed source returned
100 tracks, this one returned all **138**, with every album filled.

```bash
cd tools/spotify-playlist/browser
npm install && npx playwright install chromium   # one-time, ~200 MB
cd -
python3 tools/spotify-playlist/spotify_playlist.py <url> --source browser
```

The script also runs standalone (`node browser/scrape_playlist.mjs <url>`), and
`--headful` shows the browser if you want to watch or debug it.

⚠️ Two caveats: it drives Spotify's web player, which their terms don't
sanction (Spotify now blocks the anonymous token endpoint outright with *"Usage
of this endpoint is not permitted under the Spotify Developer Terms"*), so keep
it to your own personal use; and it is UI-dependent — if Spotify changes the
page markup, `--source browser` breaks while the embed/API paths keep working.

**3. Official Web API (recommended for exact data).** Free, 30-second setup:

1. Create an app at <https://developer.spotify.com/dashboard>.
2. Copy the Client ID and Client Secret, then either export them:

   ```bash
   export SPOTIFY_CLIENT_ID=xxxxxxxxxxxxxxxx
   export SPOTIFY_CLIENT_SECRET=yyyyyyyyyyyyyyyy
   ```

   or keep them in a git-ignored file you `source` (never commit them).

With credentials present the tool uses the API automatically — full playlist,
pagination past 100 tracks, real album names, release dates and ISRCs, no Deezer
involvement. Force a source with `--source web` / `--source embed`; it falls back
to the embed page if the API call fails.

## Notes & limits

- **Public playlists only.** Private/deleted ones return a clear error.
- **Unofficial.** The embed page is a public endpoint but not a documented
  contract; if Spotify changes it, the tool tells you to use the official API.
  Prefer the API for anything beyond personal use (it is the sanctioned path and
  keeps you inside Spotify's terms).
- **Rate limits.** Deezer lookups run 5-at-a-time with ~8 req/s pacing, retry on
  429s and on Deezer's HTTP-200 "quota exceeded" replies, then re-try any
  rate-limited tracks once the burst finishes; a 100-track playlist takes ~13 s.
  The Spotify API path is one token request plus one request per 100 tracks.
- Numbers always follow playlist order, so the output is reproducible.

## Tests

```bash
python3 -m unittest discover -s tools/spotify-playlist -p 'test_*.py' -v
```

28 tests, no network: a local `http.server` mocks the Spotify token/metadata/
tracks/embed endpoints (including the 2024 `/items` → `/tracks` deprecation and
an unavailable entry), the Deezer search endpoint, and Deezer's quota error. The
browser source is tested by pointing `BROWSER_SCRIPT` at a fake Node script, so
Playwright itself never runs during tests.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `warning: the embed page stops at 100 tracks` | use `--source browser`, or set `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` |
| lots of `-` in the album column | idem — Deezer does not have those releases |
| `Playwright is not installed for the browser scraper` | `cd tools/spotify-playlist/browser && npm install && npx playwright install chromium` |
| `the track list never rendered` | playlist is private, or Spotify changed the markup (use the API path) |
| browser source renders fewer rows than `total_on_spotify` | slow connection — re-run; the script warns when it happens |
| `HTTP 401 ... credentials rejected` | bad/expired client id or secret |
| `HTTP 403` on the API path | the app is restricted; the tool then falls back to the embed page |
| `could not find the embedded track data` | Spotify changed the embed layout — use the API path |
| `HTTP 404 ... not public` | playlist is private, or the id is wrong |

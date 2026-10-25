# soulseek-dl

Turn the playlist JSON export into actual files, via [Sockseek](https://github.com/fiso64/sockseek).

```
tools/spotify-playlist/out/playlist.json
        │  sync.py
        ▼
tools/spotify-playlist/out/sockseek-tracks.csv   (Artist,Title,Album,Length)
        │  sockseek
        ▼
~/Music/…   search Soulseek, rank candidates, download best match
```

## Why not drive SoulseekQt?

SoulseekQt is a Qt desktop GUI with **no CLI, no local API and no IPC** — the
only ports it opens (`59080/59081` here) are the Soulseek peer listener. It
cannot be scripted. It also cannot be scripted *indirectly*, because Soulseek
allows **one session per account**: a second client logging in as you kicks the
GUI off the network.

So the automation story is a headless Soulseek client:

| Tool | Interface | Notes |
|---|---|---|
| **Sockseek** (formerly `sldl` / `slsk-batchdl`) | CLI + optional daemon | single binary, does search → ranking → download, has its own Spotify/CSV input. **Recommended.** |
| [slskd](https://github.com/slskd/slskd) | REST API + web UI | daemon/container, great if you want an HTTP API and a UI; you'd implement the "pick the best result" logic yourself |
| Sockseek daemon | HTTP + SignalR (experimental) | `sockseek daemon` on `127.0.0.1:5030`, OpenAPI at `/api/openapi.json` |

## Install

```bash
# Sockseek 3.0.6, Apple Silicon (use osx-x64 for Intel)
curl -L -o /tmp/sockseek.tar.gz \
  https://github.com/fiso64/sockseek/releases/download/v3.0.6/sockseek_3.0.6_osx-arm64.tar.gz
mkdir -p ~/bin
tar xzf /tmp/sockseek.tar.gz -C ~/bin

# make it available to every zsh, interactive or not (scripts, this tool)
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshenv
source ~/.zshenv
sockseek --version
```

If `sockseek` still isn't found, skip PATH entirely and pass the path:
`--sockseek ~/bin/sockseek`, or `export SOCKSEEK_BIN=~/bin/sockseek`.

Credentials + output folder go in `~/.config/sockseek/sockseek.conf`:

```ini
username = your-soulseek-username
password = your-soulseek-password
output-dir = ~/Music/playlist-out
# pref-format = flac,mp3      # default prefers mp3; FLAC falls back to mp3
```

> Because of the one-session rule, quit SoulseekQt while a download run is
> going, or register a **second Soulseek account** for Sockseek. `sync.py`
> warns when it sees a GUI client running.

## Use

```bash
# 1. just the CSV — no Soulseek, no binary needed
python3 tools/soulseek-dl/sync.py --csv-only

# 2. what would be searched/downloaded? (sockseek --print jobs, no network)
python3 tools/soulseek-dl/sync.py --dry-run
python3 tools/soulseek-dl/sync.py --dry-run --limit 10

# 3. the real thing
python3 tools/soulseek-dl/sync.py \
    --music-dir ~/Music/playlist-out \
    --pref-format flac,mp3 \
    --name-format '{artist}/{album}/{title}'
```

Flags: `--playlist` (defaults to `tools/spotify-playlist/out/playlist.json`),
`--csv`, `--music-dir`, `--pref-format`, `--name-format`, `--limit`,
`--sockseek`, `--extra "…"` (passed straight through), `-q`.

Re-running is cheap: Sockseek keeps an `_index.csv` beside the output and skips
tracks it already downloaded, on top of `--skip-music-dir` matching files you
already own.

## Formats & bitrate

Two different mechanisms — easy to mix up:

- **`pref-*` flags only *rank***; they never filter. `--pref-format flac` means
  "flac if it exists, otherwise anything".
- **Flags without `pref` are hard filters.** The default accepted set is
  `mp3,flac,ogg,m4a,opus,wav,aac,alac`.

So "prefer 320 kbps mp3, fall back to any mp3, never flac/ogg/…":

```bash
# preset
python3 tools/soulseek-dl/sync.py --mp3-320

# identical, spelled out
python3 tools/soulseek-dl/sync.py --format mp3 --pref-min-bitrate 320
```

Verified live on "Panda Bear, Sonic Boom - Danger":

| Run | Candidates |
|---|---|
| defaults | 17 results: mp3 (245/208 kbps `prf:Satisfied`), plus flac and m4a ranked below (`prf:Format fails`) — still *acceptable* |
| `--format mp3 --pref-min-bitrate 320` | **12 results, all `.mp3`**; four 320 kbps copies ranked first (`prf:Satisfied`), lower-bitrate mp3s kept as fallback (`prf:Bitrate fails`) |

More knobs:

- `--min-bitrate 192` — hard floor. Careful: peers on the standard Soulseek
  client don't broadcast bitrate, and Sockseek still accepts unknown-bitrate
  files unless you also pass `--strict-conditions` (which can exclude most of
  the network).
- `--pref-format flac,mp3` — ranking only, for when you *do* want flac.
- `--format mp3,m4a` — widen the hard filter.
- `--extra "--cond 'br>=320; format=mp3'"` — Sockseek's raw condition syntax.
- `--print results-full` — see every candidate with bitrate and why it ranked
  where it did (`nec:` = required condition, `prf:` = ranking).

## When tracks go missing

Every run leaves `_index.csv` next to the downloads:

| column | meaning |
|---|---|
| `state` | `1` downloaded, `3` already present/skipped, `2` **failed** |
| `failurereason` | `0` none, `4` all downloads failed, `9` no search results |

and the log ends with `[cli] Completed: N succeeded, M failed.`

**Just re-run the same command** — Sockseek skips `state 1/3` and retries
`state 2`, so repeated runs are safe and usually recover a few more each time.

Real result on the 138-track test playlist: first run **124/138**; re-running
with `--search-timeout 15000 --max-retries 5` recovered 6 more → **130/138**.
The default search window is only 5000 ms, which drops slow peers.

Diagnosing what's left:

```bash
# human-readable failures from the index
~/bin/sockseek tools/spotify-playlist/out/sockseek-tracks.csv --print index-failed
```

- **`failed [No search results]`** — three usual causes:
  1. the 5 s search window (`--search-timeout 15000`);
  2. an artist-qualified query Soulseek matches badly — verified example:
     `"Back to School"` alone returned **827** hits while
     `"Deftones - Back to School"` returned **0**;
  3. a title spelled differently than the release (`Sasafrass` vs `Sassafras`,
     or a `(Mini Maggit)` suffix). Search the title alone, or fix the CSV row.
  Also worth trying `--length-tol=-1` (the 3 s required tolerance rejects
  alt-takes/remasters whose length differs).
- **`failed [All downloads failed]`** — files existed, every peer transfer died
  (offline, queue, `Remote connection closed`). Retrying later hits new peers.
- Hand-pick a stubborn track interactively with
  `~/bin/sockseek -i "Artist - Title" --song -t`.

## What I verified locally

- `sockseek --version` → **3.0.6** (osx-arm64 binary from the v3.0.6 release).
- The generated CSV is auto-detected by Sockseek
  (`artist:"Artist", album:"Album", title:"Title", length:"Length"`) and the
  **real 138-track export parsed into 138 jobs** with `--print jobs` — that path
  needs no credentials and makes no network calls.
- **Full download verified** with a live account (`--limit 2`):
  - `[soulseek] Logging in as …` → search → download → `Completed: 2 succeeded, 0 failed`;
  - first peer went stale after 30 s and Sockseek automatically retried a
    different user and succeeded — that retry behaviour is normal;
  - both files `ffprobe` clean: mp3, correct durations (338 s / 151 s), VBR
    ~320–380 kbps, artist/title/album tags intact;
  - `output-dir = ~/Music/playlist-out` **is** tilde-expanded.
- 19 unit tests: `python3 -m unittest discover -s tools/soulseek-dl -p 'test_*.py'`

### Where files land

Sockseek puts downloads in a subfolder named after the input file:

```
~/Music/playlist-out/sockseek-tracks/          <- from sockseek-tracks.csv
├── 07. Danger.mp3
├── Fcukers - Ö - TTYGF.mp3
└── _index.csv                                 <- resume state (state=1 means done)
```

To get an artist/album tree instead, pass
`--name-format '{artist}/{album}/{title}'`.

## Notes

- Sockseek searches Soulseek and downloads from peers — it does **not** touch
  Spotify audio; the export is only metadata.
- Sockseek does not share files. Keep SoulseekQt (or slskd/Nicotine+) running on
  your real account so you keep sharing, and give the downloader its own login.
- "If there is a match" is a ranking decision: Sockseek scores filename,
  artist, album, length (±3 s by default) and bitrate. Expect a handful of
  misses/wrong versions on bootlegs and obscure uploads; `--print results` or
  `-t` (interactive) is the way to review those.

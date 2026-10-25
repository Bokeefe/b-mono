#!/usr/bin/env python3
"""
sync.py - feed a spotify-playlist JSON export to Sockseek (Soulseek downloader).

SoulseekQt itself has no CLI or local API: the only ports it opens are the
Soulseek peer listener, so it cannot be scripted. Sockseek (formerly sldl /
slsk-batchdl) speaks the Soulseek protocol directly, searches for each track,
ranks candidates and downloads the best match. This script is the glue:

    playlist.json  ->  tracks.csv (Artist,Title,Album,Length)  ->  sockseek

Sockseek's own Spotify input now requires a developer app plus Premium, so we
reuse the CSV we already generated instead.

Usage
-----
    # 1. just write the CSV (no Sockseek needed)
    python3 tools/soulseek-dl/sync.py --csv-only

    # 2. see what would be downloaded, without downloading
    python3 tools/soulseek-dl/sync.py --dry-run

    # 3. download, skipping anything already in your library
    python3 tools/soulseek-dl/sync.py --music-dir ~/Music/playlist-out

Setup
-----
Sockseek binary:  https://github.com/fiso64/sockseek/releases
                  (osx-arm64 here), put it on PATH or pass --sockseek.
Credentials:      ~/.config/sockseek/sockseek.conf
                      username = ...
                      password = ...
                      output-dir = ~/Music/playlist-out

Two clients on one Soulseek account fight over the connection, so quit
SoulseekQt for the duration of a run or register a second account.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import shlex
import shutil
import subprocess
import sys
from typing import List, Optional, Sequence

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PLAYLIST = os.path.join(
    SCRIPT_DIR, os.pardir, "spotify-playlist", "out", "playlist.json"
)
CSV_HEADER = ["Artist", "Title", "Album", "Length"]
FALLBACK_BINARIES = ("~/bin/sockseek", "/usr/local/bin/sockseek")


class SyncError(Exception):
    """Fatal, user-facing error."""


# --------------------------------------------------------------------------- #
# playlist.json -> CSV
# --------------------------------------------------------------------------- #


def load_playlist(path: str) -> dict:
    if not os.path.isfile(path):
        raise SyncError(
            "no playlist export at %s\n"
            "  create one with:\n"
            "    python3 tools/spotify-playlist/spotify_playlist.py <url> "
            "--source browser -f json -o tools/spotify-playlist/out/playlist.json"
            % path
        )
    with open(path, encoding="utf-8") as handle:
        try:
            payload = json.load(handle)
        except ValueError as exc:
            raise SyncError("%s is not valid JSON: %s" % (path, exc)) from None
    if not isinstance(payload, dict) or not payload.get("tracks"):
        raise SyncError("%s has no \"tracks\" list" % path)
    return payload


def track_artist(track: dict) -> str:
    artists = [a for a in (track.get("artists") or []) if a]
    if artists:
        return ", ".join(artists)
    return (track.get("artist") or "").strip()


def track_length_seconds(track: dict) -> int:
    duration_ms = track.get("duration_ms")
    if isinstance(duration_ms, (int, float)) and duration_ms > 0:
        return int(round(duration_ms / 1000.0))
    text = (track.get("duration") or "").strip()
    parts = text.split(":")
    if 2 <= len(parts) <= 3 and all(part.isdigit() for part in parts):
        seconds = 0
        for part in parts:
            seconds = seconds * 60 + int(part)
        return seconds
    return 0


def build_rows(payload: dict) -> List[List[str]]:
    """CSV rows (Artist,Title,Album,Length), skipping entries with no title."""
    rows: List[List[str]] = []
    seen = set()
    for track in payload.get("tracks") or []:
        title = (track.get("song") or "").strip()
        if not title:
            continue
        artist = track_artist(track)
        album = (track.get("album") or "").strip()
        key = (artist.lower(), title.lower())
        if key in seen:
            continue
        seen.add(key)
        rows.append([artist, title, album, str(track_length_seconds(track))])
    if not rows:
        raise SyncError("the playlist export contained no usable tracks")
    return rows


def write_csv(rows: Sequence[Sequence[str]], path: str) -> str:
    directory = os.path.dirname(os.path.abspath(path))
    if directory and not os.path.isdir(directory):
        os.makedirs(directory, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(CSV_HEADER)
        writer.writerows(rows)
    return path


# --------------------------------------------------------------------------- #
# Sockseek invocation
# --------------------------------------------------------------------------- #


def _is_executable(path: str) -> bool:
    return bool(path) and os.path.isfile(path) and os.access(path, os.X_OK)


def find_sockseek(explicit: Optional[str]) -> str:
    """Locate the sockseek binary: --sockseek, $SOCKSEEK_BIN, PATH, ~/bin."""
    if explicit:
        if _is_executable(explicit):
            return explicit
        raise SyncError("%s is not an executable file" % explicit)

    from_env = os.environ.get("SOCKSEEK_BIN")
    if from_env:
        if _is_executable(from_env):
            return from_env
        raise SyncError("SOCKSEEK_BIN=%s is not an executable file" % from_env)

    candidates = [shutil.which("sockseek")]
    candidates += [os.path.expanduser(path) for path in FALLBACK_BINARIES]
    for candidate in candidates:
        if _is_executable(candidate):
            return candidate

    raise SyncError(
        "could not find the `sockseek` binary.\n"
        "  install it (single binary, no dependencies):\n"
        "    curl -L -o /tmp/sockseek.tar.gz \\\n"
        "      https://github.com/fiso64/sockseek/releases/download/v3.0.6/"
        "sockseek_3.0.6_osx-arm64.tar.gz\n"
        "    mkdir -p ~/bin\n"
        "    tar xzf /tmp/sockseek.tar.gz -C ~/bin\n"
        "  (~/bin is searched automatically) or pass --sockseek /path/to/sockseek"
    )


def build_command(
    sockseek: str,
    csv_path: str,
    *,
    dry_run: bool = False,
    limit: Optional[int] = None,
    music_dir: Optional[str] = None,
    pref_format: Optional[str] = None,
    formats: Optional[str] = None,
    pref_min_bitrate: Optional[str] = None,
    min_bitrate: Optional[str] = None,
    mp3_320: bool = False,
    search_timeout: Optional[str] = None,
    max_retries: Optional[str] = None,
    length_tol: Optional[str] = None,
    name_format: Optional[str] = None,
    extra: Sequence[str] = (),
) -> List[str]:
    # --mp3-320 is a preset: hard-filter to mp3, rank 320 kbps first, but still
    # accept lower-bitrate mp3. Explicit --format/--pref-min-bitrate win.
    formats = formats or ("mp3" if mp3_320 else None)
    pref_min = pref_min_bitrate or ("320" if mp3_320 else None)

    command = [sockseek, csv_path]
    if dry_run:
        command += ["--print", "jobs"]
    if limit:
        command += ["-n", str(limit)]
    if music_dir:
        command += ["--skip-music-dir", os.path.expanduser(music_dir)]
    if formats:
        command += ["--format", formats]
    if pref_format:
        command += ["--pref-format", pref_format]
    if pref_min:
        command += ["--pref-min-bitrate", str(pref_min)]
    if min_bitrate:
        command += ["--min-bitrate", str(min_bitrate)]
    if search_timeout:
        command += ["--search-timeout", str(search_timeout)]
    if max_retries:
        command += ["--max-retries", str(max_retries)]
    if length_tol is not None and str(length_tol) != "":
        # must use the = form: "--length-tol -1" is parsed as a missing value
        command += ["--length-tol=%s" % length_tol]
    if name_format:
        command += ["--name-format", name_format]
    for chunk in extra:
        # accept both `--extra --flag value` and a single quoted string
        command += shlex.split(chunk) if isinstance(chunk, str) else list(chunk)
    return command


def soulseek_client_running() -> List[str]:
    """Best-effort detection of GUI clients sharing the same Soulseek account."""
    try:
        result = subprocess.run(
            ["pgrep", "-fl", "SoulseekQt|Nicotine|nicotine"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return []
    lines = (result.stdout or b"").decode("utf-8", "replace").splitlines()
    return [line for line in lines if "sync.py" not in line]


def quality_warnings(payload: dict) -> List[str]:
    tracks = payload.get("tracks") or []
    warnings: List[str] = []
    missing_albums = sum(1 for t in tracks if not (t.get("album") or "").strip())
    if missing_albums:
        warnings.append(
            "%d/%d tracks have no album, so search ranking is weaker - regenerate "
            "the export with --source browser or API credentials"
            % (missing_albums, len(tracks))
        )
    source = (payload.get("playlist") or {}).get("source")
    if source and source != "browser" and source != "web-api":
        warnings.append("export source is %r (embed) - expect gaps" % source)
    return warnings


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sync.py",
        description="Download everything in a spotify-playlist JSON export via Sockseek.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python3 tools/soulseek-dl/sync.py --csv-only\n"
            "  python3 tools/soulseek-dl/sync.py --dry-run\n"
            "  python3 tools/soulseek-dl/sync.py --music-dir ~/Music/playlist-out\n\n"
            "sockseek config: ~/.config/sockseek/sockseek.conf "
            "(username, password, output-dir)"
        ),
    )
    parser.add_argument(
        "--playlist",
        default=DEFAULT_PLAYLIST,
        help="playlist JSON export (default: tools/spotify-playlist/out/playlist.json)",
    )
    parser.add_argument(
        "--csv",
        default=None,
        help="where to write the CSV (default: next to the JSON, sockseek-tracks.csv)",
    )
    parser.add_argument(
        "--csv-only",
        action="store_true",
        help="only write the CSV; do not look for or run Sockseek",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the parsed jobs (sockseek --print jobs) instead of downloading",
    )
    parser.add_argument("--limit", type=int, default=None, help="only process N tracks")
    parser.add_argument(
        "--music-dir",
        default=None,
        help="skip tracks already present here (sockseek --skip-music-dir)",
    )
    parser.add_argument(
        "--mp3-320",
        action="store_true",
        help=(
            "shorthand for --format mp3 --pref-min-bitrate 320: mp3 only (no "
            "flac/ogg), 320 kbps ranked first, lower-bitrate mp3 as fallback"
        ),
    )
    parser.add_argument(
        "--format",
        default=None,
        dest="formats",
        help=(
            "required formats, e.g. 'mp3' - anything else is rejected outright "
            "(default set is mp3,flac,ogg,m4a,opus,wav,aac,alac)"
        ),
    )
    parser.add_argument(
        "--pref-min-bitrate",
        default=None,
        help="bitrate to prefer while ranking, in kbps (default 200); lower is still accepted",
    )
    parser.add_argument(
        "--min-bitrate",
        default=None,
        help=(
            "hard minimum bitrate in kbps - note Sockseek still accepts files whose "
            "bitrate the peer does not report"
        ),
    )
    parser.add_argument(
        "--search-timeout",
        default=None,
        metavar="MS",
        help="how long to wait for peer search replies in ms (sockseek default: 5000)",
    )
    parser.add_argument(
        "--max-retries",
        default=None,
        metavar="N",
        help="max download retries per item (sockseek default: 10)",
    )
    parser.add_argument(
        "--length-tol",
        default=None,
        metavar="SEC",
        help=(
            "required track-length tolerance in seconds (sockseek default: 3); "
            "use -1 to disable, e.g. --length-tol=-1"
        ),
    )
    parser.add_argument(
        "--pref-format",
        default=None,
        help="preferred formats for ranking, e.g. flac,mp3 (sockseek --pref-format)",
    )
    parser.add_argument(
        "--name-format",
        default=None,
        help="output path template, e.g. '{artist}/{album}/{title}'",
    )
    parser.add_argument("--sockseek", default=None, help="path to the sockseek binary")
    parser.add_argument(
        "--extra",
        nargs=argparse.REMAINDER,
        help="extra arguments passed straight to sockseek (must be last)",
    )
    parser.add_argument("-q", "--quiet", action="store_true", help="less output")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)

    def log(message: str) -> None:
        if not args.quiet:
            sys.stderr.write("  %s\n" % message)
            sys.stderr.flush()

    try:
        playlist_path = os.path.expanduser(args.playlist)
        payload = load_playlist(playlist_path)
        rows = build_rows(payload)

        csv_path = args.csv or os.path.join(
            os.path.dirname(os.path.abspath(playlist_path)), "sockseek-tracks.csv"
        )
        write_csv(rows, csv_path)
        playlist_name = (payload.get("playlist") or {}).get("name") or "playlist"
        log('"%s": %d tracks -> %s' % (playlist_name, len(rows), csv_path))
        for warning in quality_warnings(payload):
            sys.stderr.write("  warning: %s\n" % warning)

        if args.csv_only:
            return 0

        sockseek = find_sockseek(args.sockseek)

        if not args.dry_run:
            for line in soulseek_client_running():
                parts = line.split(None, 1)
                name = os.path.basename(parts[1]) if len(parts) > 1 else line
                sys.stderr.write(
                    "  warning: another Soulseek client looks open (%s)\n"
                    "           Soulseek allows one session per account - quit it or "
                    "use a second account.\n" % name
                )

        command = build_command(
            sockseek,
            csv_path,
            dry_run=args.dry_run,
            limit=args.limit,
            music_dir=args.music_dir,
            pref_format=args.pref_format,
            formats=args.formats,
            pref_min_bitrate=args.pref_min_bitrate,
            min_bitrate=args.min_bitrate,
            mp3_320=args.mp3_320,
            search_timeout=args.search_timeout,
            max_retries=args.max_retries,
            length_tol=args.length_tol,
            name_format=args.name_format,
            extra=list(args.extra or []),
        )
        log("running: %s" % " ".join(command))
        if args.dry_run:
            log("dry run - nothing will be downloaded")
        completed = subprocess.run(command, check=False)
        return completed.returncode
    except SyncError as exc:
        sys.stderr.write("error: %s\n" % exc)
        return 1
    except KeyboardInterrupt:
        sys.stderr.write("\ninterrupted\n")
        return 130
    except OSError as exc:
        sys.stderr.write("error: could not run sockseek: %s\n" % exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())

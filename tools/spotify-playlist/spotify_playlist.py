#!/usr/bin/env python3
"""
spotify_playlist.py - dump a public Spotify playlist as a numbered list.

Standard library only (Python 3.9+). No pip install required.

Data sources, in order of accuracy
----------------------------------
1. Spotify Web API (official, needs free client credentials)
   Set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET (or pass --client-id /
   --client-secret). Gives the complete track list, real album names and no
   100-track ceiling.
2. Headless browser (--source browser, no API key)
   Drives browser/scrape_playlist.mjs (Playwright) over the public playlist
   page, scrolling the virtualised grid. Full track list + real album names,
   and it also reports the playlist's true length. Needs a one-time
   `npm install && npx playwright install chromium` in browser/.
3. Spotify embed page (no auth, works out of the box)
   https://open.spotify.com/embed/playlist/<id> ships a __NEXT_DATA__ JSON blob
   with up to 100 tracks (title, artists, duration). Spotify does not expose
   album names there, so the album column is filled in from the public Deezer
   search API by default (--no-enrich turns that off).

Examples
--------
    # numbered columns, album filled from Deezer
    python3 spotify_playlist.py "https://open.spotify.com/playlist/4xcMWLMk7VDLfvxeI4Sg3p"

    # full playlist + real albums, no API key (needs the Playwright setup)
    python3 spotify_playlist.py <url> --source browser

    # one line per song: 1. Song - Album - Artist
    python3 spotify_playlist.py 4xcMWLMk7VDLfvxeI4Sg3p -f list

    # markdown table / csv / json files
    python3 spotify_playlist.py <url> -f markdown -o playlist.md
    python3 spotify_playlist.py <url> -f csv -o playlist.csv
    python3 spotify_playlist.py <url> -f json -o playlist.json

    # reorder or add columns
    python3 spotify_playlist.py <url> --fields song,artist,album,duration

    # official API (full list + real albums, no Deezer needed)
    SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy \
        python3 spotify_playlist.py <url>

Exit codes: 0 success, 1 error (bad input, network, playlist not public, ...).
"""

from __future__ import annotations

import argparse
import base64
import csv
import gzip
import io
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import zlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

__version__ = "1.0.0"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# Base URLs (env overrides exist purely so tests can point at a local server).
ACCOUNTS_URL = os.environ.get(
    "SPOTIFY_ACCOUNTS_URL", "https://accounts.spotify.com/api/token"
)
API_BASE = os.environ.get("SPOTIFY_API_BASE", "https://api.spotify.com/v1").rstrip("/")
EMBED_BASE = os.environ.get(
    "SPOTIFY_EMBED_BASE", "https://open.spotify.com/embed"
).rstrip("/")
DEEZER_BASE = os.environ.get("DEEZER_API_BASE", "https://api.deezer.com").rstrip("/")

EMBED_TRACK_CAP = 100       # hard-coded by Spotify's embed endpoint
DEEZER_MATCH_TOLERANCE_MS = 4000
DEEZER_WORKERS = 5          # parallel album lookups (Deezer allows ~10 req/s)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BROWSER_SCRIPT = os.environ.get(
    "SPOTIFY_BROWSER_SCRIPT",
    os.path.join(SCRIPT_DIR, "browser", "scrape_playlist.mjs"),
)
DEFAULT_MAX_COL = 56


class ToolError(Exception):
    """Fatal, user-facing error."""


# --------------------------------------------------------------------------- #
# Model
# --------------------------------------------------------------------------- #


@dataclass
class Track:
    index: int
    song: str
    album: str = ""
    artists: List[str] = field(default_factory=list)
    duration_ms: Optional[int] = None
    track_id: str = ""
    url: str = ""
    release_date: str = ""
    isrc: str = ""
    kind: str = "track"          # track | episode | local
    album_source: str = ""       # web-api | deezer | browser | ""
    added_at: str = ""

    @property
    def artist_display(self) -> str:
        return ", ".join(a for a in self.artists if a)


@dataclass
class Playlist:
    name: str
    owner: str
    playlist_id: str
    url: str
    tracks: List[Track]
    source: str                  # web-api | embed | browser
    total: Optional[int] = None
    warnings: List[str] = field(default_factory=list)


# --------------------------------------------------------------------------- #
# HTTP helpers
# --------------------------------------------------------------------------- #


def _decode_body(raw: bytes, encoding: str) -> bytes:
    encoding = (encoding or "").lower()
    if encoding == "gzip":
        return gzip.decompress(raw)
    if encoding == "deflate":
        try:
            return zlib.decompress(raw)
        except zlib.error:
            return zlib.decompress(raw, -zlib.MAX_WBITS)
    return raw


def _short_url(url: str, limit: int = 90) -> str:
    return url if len(url) <= limit else url[: limit - 3] + "..."


def _short_body(exc: urllib.error.HTTPError, limit: int = 160) -> str:
    try:
        raw = exc.read()
    except Exception:                                     # noqa: BLE001
        return ""
    encoding = exc.headers.get("Content-Encoding", "") if exc.headers else ""
    text = _decode_body(raw, encoding).decode("utf-8", "replace").strip()
    text = " ".join(text.split())
    if text.startswith("{"):
        try:
            payload = json.loads(text)
        except ValueError:
            payload = {}
        error = payload.get("error")
        if isinstance(error, dict):
            return str(error.get("message") or error)[:limit]
        if error:
            return str(error)[:limit]
    return text[:limit]


def http_request(
    url: str,
    *,
    data: Optional[bytes] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: float = 25.0,
    retries: int = 3,
) -> bytes:
    """GET/POST with retries for 429/5xx. Returns the decompressed body."""
    hdrs = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/html;q=0.9, */*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if headers:
        hdrs.update(headers)

    last_error: Optional[BaseException] = None
    for attempt in range(retries + 1):
        request = urllib.request.Request(url, data=data, headers=hdrs)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return _decode_body(
                    response.read(), response.headers.get("Content-Encoding", "")
                )
        except urllib.error.HTTPError as exc:              # noqa: PERF203
            detail = _short_body(exc)
            if exc.code in (429, 500, 502, 503, 504) and attempt < retries:
                wait = 2.0 * (attempt + 1)
                retry_after = (exc.headers.get("Retry-After", "") if exc.headers else "")
                if retry_after.strip().isdigit():
                    wait = max(wait, float(retry_after.strip()))
                time.sleep(wait)
                last_error = exc
                continue
            if exc.code == 404:
                raise ToolError(
                    "HTTP 404 from %s - not found, or the playlist is not public."
                    % _short_url(url)
                ) from None
            if exc.code == 401:
                raise ToolError(
                    "HTTP 401 from %s - credentials rejected. Check "
                    "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET." % _short_url(url)
                ) from None
            raise ToolError(
                "HTTP %s from %s (%s)" % (exc.code, _short_url(url), detail)
            ) from None
        except urllib.error.URLError as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(2.0 * (attempt + 1))
                continue
            raise ToolError(
                "network error reaching %s: %s" % (_short_url(url), exc.reason)
            ) from None
        except OSError as exc:                            # timeouts, resets
            last_error = exc
            if attempt < retries:
                time.sleep(2.0 * (attempt + 1))
                continue

    raise ToolError("request to %s failed: %s" % (_short_url(url), last_error))


def http_json(url: str, **kwargs) -> dict:
    raw = http_request(url, **kwargs)
    try:
        return json.loads(raw.decode("utf-8", "replace"))
    except ValueError:
        raise ToolError(
            "%s did not return JSON - Spotify probably changed their page layout."
            % _short_url(url)
        ) from None


# --------------------------------------------------------------------------- #
# Input parsing
# --------------------------------------------------------------------------- #

_SPOTIFY_KINDS = "playlist|album|track|artist"
_URI_RE = re.compile(r"spotify:(%s):([A-Za-z0-9]{10,})" % _SPOTIFY_KINDS)
_URL_RE = re.compile(
    r"spotify\.com/(?:intl-[A-Za-z\-]+/)?(?:embed/)?(%s)/([A-Za-z0-9]{10,})"
    % _SPOTIFY_KINDS
)
_BARE_ID_RE = re.compile(r"^[A-Za-z0-9]{22}$")


def parse_target(raw: str) -> Tuple[str, str]:
    """Return (kind, id) from a Spotify URL, URI, or bare playlist id."""
    text = (raw or "").strip().strip("<>\"'")
    if not text:
        raise ToolError("empty playlist reference")

    match = _URI_RE.search(text)
    if match:
        return match.group(1), match.group(2)

    match = _URL_RE.search(text)
    if match:
        return match.group(1), match.group(2)

    if _BARE_ID_RE.match(text):
        return "playlist", text

    raise ToolError(
        "could not find a Spotify playlist id in %r\n"
        "  expected something like "
        "https://open.spotify.com/playlist/4xcMWLMk7VDLfvxeI4Sg3p" % raw
    )


def playlist_url(kind: str, spotify_id: str) -> str:
    return "https://open.spotify.com/%s/%s" % (kind, spotify_id)


# --------------------------------------------------------------------------- #
# Source 1: public embed page (no credentials)
# --------------------------------------------------------------------------- #


_NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S
)


def _split_artists(subtitle: str) -> List[str]:
    """Split the embed artist blob ("A, B" with nbsp) without wrecking
    names that legitimately contain a comma ("Tyler, The Creator")."""
    cleaned = (subtitle or "").replace("\u00a0", " ").replace("\u200b", "").strip()
    if not cleaned:
        return []
    if "," not in cleaned:
        return [cleaned]
    parts = [p.strip() for p in cleaned.split(",") if p.strip()]
    # "Tyler, The Creator" style: a trailing fragment that starts with a
    # joining word is part of the previous name, not a separate artist.
    joining = ("the ", "and ", "& ", "of ", "a ", "de ", "da ", "los ", "la ")
    merged: List[str] = []
    for part in parts:
        if merged and part.lower().startswith(joining):
            merged[-1] = merged[-1] + ", " + part
        else:
            merged.append(part)
    return merged


def fetch_embed(kind: str, spotify_id: str, log) -> Playlist:
    """Read the JSON blob Spotify embeds into open.spotify.com/embed/..."""
    url = "%s/%s/%s" % (EMBED_BASE, kind, spotify_id)
    log("fetching %s" % url)

    raw = http_request(
        url,
        headers={"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
    )
    html = raw.decode("utf-8", "replace")

    match = _NEXT_DATA_RE.search(html)
    if not match:
        page_props = re.search(r'<meta property="og:title" content="([^"]*)"', html)
        if page_props and "page not found" in page_props.group(1).lower():
            raise ToolError(
                "Spotify returned its 404 page for %s/%s - the playlist may be "
                "private or deleted." % (kind, spotify_id)
            )
        raise ToolError(
            "could not find the embedded track data in %s.\n"
            "  Spotify probably changed the embed page layout - use the official "
            "API instead (see README)." % url
        )

    try:
        next_data = json.loads(match.group(1))
    except ValueError:
        raise ToolError("the embedded JSON on %s could not be parsed." % url) from None

    page_props = (next_data.get("props") or {}).get("pageProps") or {}
    if page_props.get("status") == 404 or "state" not in page_props:
        raise ToolError(
            "Spotify has no public embed data for %s/%s (private, deleted, or "
            "region-locked playlist)." % (kind, spotify_id)
        )

    entity = (
        ((page_props.get("state") or {}).get("data") or {}).get("entity") or {}
    )
    track_list = entity.get("trackList") or []
    if not track_list:
        raise ToolError(
            "the embed page for %s/%s listed no tracks (empty, private, or "
            "region-locked playlist)." % (kind, spotify_id)
        )

    album_name = (entity.get("name") or "") if kind == "album" else ""
    tracks: List[Track] = []
    for position, item in enumerate(track_list, start=1):
        uri = item.get("uri") or ""
        track_id = uri.rsplit(":", 1)[-1] if uri.startswith("spotify:track:") else ""
        entity_kind = "track" if not item.get("entityType") else str(item["entityType"])
        tracks.append(
            Track(
                index=position,
                song=(item.get("title") or item.get("name") or "").strip(),
                album=album_name,
                artists=_split_artists(item.get("subtitle") or ""),
                duration_ms=item.get("duration"),
                track_id=track_id,
                url="https://open.spotify.com/track/%s" % track_id if track_id else "",
                kind="episode" if entity_kind == "episode" else "track",
                album_source="web-api" if album_name else "",
            )
        )

    playlist = Playlist(
        name=entity.get("title") or entity.get("name") or "(unknown)",
        owner=entity.get("subtitle") or "",
        playlist_id=spotify_id,
        url=playlist_url(kind, spotify_id),
        tracks=tracks,
        source="embed",
    )
    if len(track_list) >= EMBED_TRACK_CAP:
        playlist.warnings.append(
            "the embed page stops at %d tracks - this playlist may be longer. "
            "Set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET for the full list."
            % EMBED_TRACK_CAP
        )
    return playlist


# --------------------------------------------------------------------------- #
# Source 2: official Spotify Web API (client credentials)
# --------------------------------------------------------------------------- #

_WEB_TRACK_FIELDS = (
    "items(is_local,track(id,name,type,uri,duration_ms,is_playable,"
    "artists(name),album(name,release_date),show(name),"
    "external_urls(spotify),external_ids(isrc))),next,total,offset"
)


def web_api_token(client_id: str, client_secret: str, log) -> str:
    log("requesting a Spotify API token (client credentials)")
    payload = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode()
    credentials = base64.b64encode(
        ("%s:%s" % (client_id, client_secret)).encode()
    ).decode()
    raw = http_request(
        ACCOUNTS_URL,
        data=payload,
        headers={
            "Authorization": "Basic %s" % credentials,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        token = json.loads(raw.decode("utf-8", "replace")).get("access_token")
    except ValueError:
        token = None
    if not token:
        raise ToolError(
            "Spotify did not return an access token - check SPOTIFY_CLIENT_ID and "
            "SPOTIFY_CLIENT_SECRET."
        )
    return token


def _web_track_from_item(item: dict, index: int) -> Optional[Track]:
    track = item.get("track") or {}
    if not track:
        return None
    is_local = bool(item.get("is_local")) or bool(track.get("is_local"))
    track_type = (track.get("type") or "track").lower()
    album = track.get("album") or {}
    show = track.get("show") or {}
    artists = [a.get("name") for a in (track.get("artists") or []) if a.get("name")]
    if not artists and show.get("name"):
        artists = [show["name"]]

    track_id = track.get("id") or ""
    url = (track.get("external_urls") or {}).get("spotify") or ""
    if not url and track_id:
        url_kind = "episode" if track_type == "episode" else "track"
        url = "https://open.spotify.com/%s/%s" % (url_kind, track_id)

    album_name = album.get("name") or show.get("name") or ""
    return Track(
        index=index,
        song=(track.get("name") or "").strip(),
        album=album_name,
        artists=artists,
        duration_ms=track.get("duration_ms"),
        track_id=track_id,
        url=url,
        release_date=album.get("release_date") or "",
        isrc=(track.get("external_ids") or {}).get("isrc") or "",
        kind="local" if is_local else ("episode" if track_type == "episode" else "track"),
        album_source="web-api" if album_name else "",
    )


def fetch_web_api(kind: str, spotify_id: str, client_id: str, client_secret: str, log) -> Playlist:
    if kind != "playlist":
        raise ToolError("the official API path only supports playlists (got %r)" % kind)

    token = web_api_token(client_id, client_secret, log)
    auth = {"Authorization": "Bearer %s" % token}

    meta_url = "%s/playlists/%s?%s" % (
        API_BASE,
        spotify_id,
        urllib.parse.urlencode(
            {"fields": "name,owner(display_name),tracks(total),snapshot_id"}
        ),
    )
    log("fetching playlist metadata")
    meta = http_json(meta_url, headers=auth)
    total = ((meta.get("tracks") or {}).get("total")) or None

    # /items replaced /tracks for new apps (Nov 2024); try the modern name first.
    endpoint = "%s/playlists/%s/items" % (API_BASE, spotify_id)
    switched = False
    tracks: List[Track] = []
    offset = 0
    seen = 0

    while True:
        page_url = "%s?%s" % (
            endpoint,
            urllib.parse.urlencode(
                {"limit": 100, "offset": offset, "fields": _WEB_TRACK_FIELDS}
            ),
        )
        try:
            page = http_json(page_url, headers=auth)
        except ToolError:
            if not switched:
                switched = True
                endpoint = "%s/playlists/%s/tracks" % (API_BASE, spotify_id)
                log("retrying with the legacy /tracks endpoint")
                continue
            raise

        items = page.get("items") or []
        if not items:
            break

        for item in items:
            seen += 1
            track = _web_track_from_item(item, len(tracks) + 1)
            if track is not None:
                tracks.append(track)

        offset += len(items)
        if total is not None and offset >= total:
            break
        if page.get("next") is None and len(items) < 100:
            break
        if offset >= 20000:                      # Spotify's own hard cap on playlists
            break

    playlist = Playlist(
        name=meta.get("name") or "(unknown)",
        owner=(meta.get("owner") or {}).get("display_name") or "",
        playlist_id=spotify_id,
        url=playlist_url("playlist", spotify_id),
        tracks=tracks,
        source="web-api",
        total=total,
    )
    missing = seen - len(tracks)
    if missing > 0:
        playlist.warnings.append(
            "%d playlist entr%s had no track data (local files or removed "
            "episodes) and were skipped." % (missing, "y" if missing == 1 else "ies")
        )
    return playlist


# --------------------------------------------------------------------------- #
# Source 3: headless browser (no API key, full list + real album names)
# --------------------------------------------------------------------------- #


def fetch_browser(kind: str, spotify_id: str, log) -> Playlist:
    """Drive browser/scrape_playlist.mjs and turn its JSON into a Playlist."""
    if kind != "playlist":
        raise ToolError("--source browser only supports playlists (got %r)" % kind)

    script = BROWSER_SCRIPT
    if not os.path.isfile(script):
        raise ToolError("browser scraper not found at %s" % script)

    node = shutil.which("node")
    if not node:
        raise ToolError(
            "--source browser needs Node.js 18+ on PATH (the scraper is a "
            "Playwright script)."
        )

    script_dir = os.path.dirname(script)
    if not os.path.isdir(os.path.join(script_dir, "node_modules", "playwright")):
        raise ToolError(
            "Playwright is not installed for the browser scraper. Run:\n"
            "  cd %s && npm install && npx playwright install chromium" % script_dir
        )

    url = playlist_url(kind, spotify_id)
    log("driving a headless browser at %s" % url)
    try:
        completed = subprocess.run(
            [node, script, url],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=900,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise ToolError("the browser scraper timed out after 15 minutes") from None
    except OSError as exc:
        raise ToolError("could not start node: %s" % exc) from None

    for line in (completed.stderr or b"").decode("utf-8", "replace").splitlines():
        if line.strip():
            log(line.strip())

    if completed.returncode != 0:
        raise ToolError(
            "the browser scraper failed (exit %d) - see its output above"
            % completed.returncode
        )

    try:
        payload = json.loads((completed.stdout or b"").decode("utf-8", "replace"))
    except ValueError:
        raise ToolError("the browser scraper did not return JSON") from None

    meta = payload.get("playlist") or {}
    tracks: List[Track] = []
    for position, item in enumerate(payload.get("tracks") or [], start=1):
        album = (item.get("album") or "").strip()
        tracks.append(
            Track(
                index=int(item.get("index") or position),
                song=(item.get("song") or "").strip(),
                album=album,
                artists=[a for a in (item.get("artists") or []) if a],
                duration_ms=item.get("duration_ms"),
                track_id=item.get("spotify_id") or "",
                url=item.get("url") or "",
                release_date=item.get("release_date") or "",
                isrc=item.get("isrc") or "",
                kind=item.get("kind") or "track",
                album_source="browser" if album else "",
                added_at=item.get("added_at") or "",
            )
        )

    if not tracks:
        raise ToolError("the browser scraper returned no tracks")

    return Playlist(
        name=meta.get("name") or "(unknown)",
        owner=meta.get("owner") or "",
        playlist_id=spotify_id,
        url=url,
        tracks=tracks,
        source="browser",
        total=meta.get("total_on_spotify"),
        warnings=list(meta.get("warnings") or []),
    )


# --------------------------------------------------------------------------- #
# Album fill-in for the no-credentials path (public Deezer search)
# --------------------------------------------------------------------------- #

_DEEZER_MIN_INTERVAL = 0.12      # polite delay between searches
_FEATURE_NOISE_RE = re.compile(r"\b(feat|ft|featuring|with)\b.*$", re.I)


def normalize_for_match(text: str) -> str:
    """Lowercase, accent-folded, punctuation-free form used for matching."""
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[\(\[\{].*?[\)\]\}]", " ", text)     # (Remastered 2011) etc.
    text = re.sub(r"\s-\s.*$", " ", text)               # Song - Radio Edit
    text = _FEATURE_NOISE_RE.sub(" ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def _artist_tokens(artists: Sequence[str]) -> set:
    tokens = set()
    for artist in artists:
        for token in normalize_for_match(artist).split():
            if len(token) > 2:
                tokens.add(token)
    return tokens


def _deezer_search(query: str, limit: int = 8) -> List[dict]:
    """Deezer search with quota-aware retries (quota errors arrive as HTTP 200)."""
    url = "%s/search?%s" % (
        DEEZER_BASE,
        urllib.parse.urlencode({"q": query, "limit": limit}),
    )
    for attempt in range(3):
        payload = http_json(url, retries=2)
        error = payload.get("error")
        if not error:
            return payload.get("data") or []
        message = error.get("message") if isinstance(error, dict) else str(error)
        if attempt == 2:
            raise ToolError("Deezer refused the lookup (%s)" % message)
        time.sleep(2.0 * (attempt + 1))
    return []


def _deezer_lookup(track: Track) -> Optional[str]:
    """Best-effort album title for one track; None when nothing matches."""
    parts = [track.song]
    if track.artists:
        parts.append(track.artists[0])
    query = " ".join(part for part in parts if part)
    if not query:
        return None
    candidates = _deezer_search(query)

    wanted_title = normalize_for_match(track.song)
    wanted_tokens = _artist_tokens(track.artists)

    fallback: Optional[str] = None
    for candidate in candidates:
        title = normalize_for_match(candidate.get("title") or candidate.get("title_short") or "")
        if not title or not wanted_title:
            continue
        if title != wanted_title and wanted_title not in title and title not in wanted_title:
            continue

        candidate_seconds = candidate.get("duration")
        if track.duration_ms and isinstance(candidate_seconds, int):
            if abs(candidate_seconds * 1000 - track.duration_ms) > DEEZER_MATCH_TOLERANCE_MS:
                continue

        candidate_tokens = _artist_tokens([(candidate.get("artist") or {}).get("name") or ""])
        artist_overlap = bool(wanted_tokens & candidate_tokens)
        album_title = ((candidate.get("album") or {}).get("title") or "").strip()
        if not album_title:
            continue

        if title == wanted_title and artist_overlap:
            return album_title
        if fallback is None and artist_overlap:
            fallback = album_title
    return fallback


class _Pacer:
    """Thread-safe minimum spacing between request starts."""

    def __init__(self, min_interval: float):
        self._lock = threading.Lock()
        self._min_interval = min_interval
        self._next_allowed = 0.0

    def wait(self, min_interval: Optional[float] = None) -> None:
        interval = self._min_interval if min_interval is None else min_interval
        with self._lock:
            now = time.monotonic()
            delay = max(0.0, self._next_allowed - now)
            self._next_allowed = max(now, self._next_allowed) + interval
        if delay > 0:
            time.sleep(delay)


def enrich_albums(tracks: Sequence[Track], log, progress) -> Tuple[int, int]:
    """Fill empty album fields from Deezer. Returns (filled, failed) per track."""
    pending = [track for track in tracks if not track.album]
    if not pending:
        return 0, 0

    groups: Dict[Tuple[str, str], List[Track]] = {}
    for track in pending:
        groups.setdefault((track.song, track.artist_display), []).append(track)

    pacer = _Pacer(_DEEZER_MIN_INTERVAL)
    total = len(groups)

    def look_up(key: Tuple[str, str]) -> Tuple[Tuple[str, str], Optional[str], Optional[str]]:
        try:
            pacer.wait()
            return key, _deezer_lookup(groups[key][0]), None
        except ToolError as exc:                      # noqa: BLE001
            return key, None, str(exc)

    found: Dict[Tuple[str, str], Optional[str]] = {}
    errored: List[Tuple[str, str]] = []
    completed = 0

    with ThreadPoolExecutor(max_workers=DEEZER_WORKERS) as pool:
        futures = [pool.submit(look_up, key) for key in groups]
        for future in as_completed(futures):
            key, album, failure = future.result()
            found[key] = album
            completed += 1
            if failure:
                errored.append(key)
            progress(completed, total, groups[key][0])

    # One sequential retry pass for lookups that were rate-limited.
    if errored:
        log("retrying %d rate-limited album lookup(s)" % len(errored))
    for key in errored:
        pacer.wait(1.0)
        try:
            found[key] = _deezer_lookup(groups[key][0])
        except ToolError as exc:
            log("album lookup gave up: %s" % exc)
            break

    filled = 0
    failed = 0
    for key, group in groups.items():
        album = found.get(key)
        for track in group:
            if album:
                track.album = album
                track.album_source = "deezer"
                filled += 1
            else:
                failed += 1
    return filled, failed


# --------------------------------------------------------------------------- #
# Output rendering
# --------------------------------------------------------------------------- #

FIELD_LABELS = {
    "song": "Song",
    "album": "Album",
    "artist": "Artist",
    "duration": "Length",
    "release_date": "Released",
    "added_at": "Added",
    "kind": "Kind",
    "track_id": "Spotify ID",
    "isrc": "ISRC",
    "url": "URL",
}
DEFAULT_FIELDS = ["song", "album", "artist"]
EMPTY_CELL = "-"


def format_duration(duration_ms: Optional[int]) -> str:
    if not duration_ms or duration_ms < 0:
        return ""
    total_seconds = int(round(duration_ms / 1000.0))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours:
        return "%d:%02d:%02d" % (hours, minutes, seconds)
    return "%d:%02d" % (minutes, seconds)


def field_value(track: Track, field_name: str) -> str:
    if field_name == "song":
        return track.song
    if field_name == "album":
        return track.album
    if field_name == "artist":
        return track.artist_display
    if field_name == "duration":
        return format_duration(track.duration_ms)
    if field_name == "release_date":
        return track.release_date
    if field_name == "added_at":
        return track.added_at
    if field_name == "kind":
        return track.kind
    if field_name == "track_id":
        return track.track_id
    if field_name == "isrc":
        return track.isrc
    if field_name == "url":
        return track.url
    raise ToolError("unknown field %r" % field_name)


def build_rows(
    tracks: Sequence[Track], fields: Sequence[str], empty: str = EMPTY_CELL
) -> List[List[str]]:
    return [
        [field_value(track, name) or empty for name in fields] for track in tracks
    ]


def display_width(text: str) -> int:
    width = 0
    for char in text:
        if unicodedata.combining(char):
            continue
        width += 2 if unicodedata.east_asian_width(char) in ("W", "F") else 1
    return width


def pad(text: str, width: int, align: str = "left") -> str:
    gap = width - display_width(text)
    if gap <= 0:
        return text
    return (" " * gap + text) if align == "right" else (text + " " * gap)


def truncate(text: str, max_col: int) -> str:
    if max_col <= 0 or display_width(text) <= max_col:
        return text
    out = []
    used = 0
    for char in text:
        char_width = 2 if unicodedata.east_asian_width(char) in ("W", "F") else 1
        if used + char_width > max_col - 1:
            break
        out.append(char)
        used += char_width
    return "".join(out) + "\u2026"


def render_table(
    tracks: Sequence[Track],
    fields: Sequence[str],
    *,
    header: bool = True,
    max_col: int = DEFAULT_MAX_COL,
) -> str:
    rows = build_rows(tracks, fields)
    labels = [FIELD_LABELS.get(name, name.title()) for name in fields]
    number_width = max(len("#"), len(str(len(tracks))) if tracks else 1)

    widths = []
    for position in range(len(fields)):
        candidates = [display_width(labels[position])]
        candidates.extend(display_width(row[position]) for row in rows)
        width = max(candidates)
        widths.append(min(width, max_col) if max_col > 0 else width)

    lines: List[str] = []
    if header:
        cells = [pad(labels[i], widths[i]) for i in range(len(fields))]
        lines.append(pad("#", number_width, "right") + "  " + "  ".join(cells))
        lines.append(
            pad("-" * number_width, number_width, "right")
            + "  "
            + "  ".join("-" * max(width, 3) for width in widths)
        )
    for track, row in zip(tracks, rows):
        cells = [pad(truncate(row[i], max_col), widths[i]) for i in range(len(fields))]
        lines.append(
            pad(str(track.index), number_width, "right")
            + "  "
            + "  ".join(cells).rstrip()
        )
    return "\n".join(lines)


def render_list(tracks: Sequence[Track], fields: Sequence[str]) -> str:
    rows = build_rows(tracks, fields)
    return "\n".join(
        "%d. %s" % (track.index, " \u2014 ".join(row))
        for track, row in zip(tracks, rows)
    )


def render_markdown(
    tracks: Sequence[Track], fields: Sequence[str], header: bool = True
) -> str:
    rows = build_rows(tracks, fields)
    labels = [FIELD_LABELS.get(name, name.title()) for name in fields]
    lines: List[str] = []
    if header:
        lines.append("| # | " + " | ".join(labels) + " |")
        lines.append("|---:|" + "|".join(["---"] * len(fields)) + "|")
    for track, row in zip(tracks, rows):
        cells = [value.replace("\\", "\\\\").replace("|", "\\|") for value in row]
        lines.append("| %d | %s |" % (track.index, " | ".join(cells)))
    return "\n".join(lines)


def render_delimited(
    tracks: Sequence[Track], fields: Sequence[str], *, delimiter: str, header: bool = True
) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=delimiter, lineterminator="\n")
    if header:
        writer.writerow(["#"] + [FIELD_LABELS.get(name, name.title()) for name in fields])
    for track, row in zip(tracks, build_rows(tracks, fields, empty="")):
        writer.writerow([track.index] + row)
    return buffer.getvalue().rstrip("\n")


def render_json(playlist: Playlist, fields: Sequence[str]) -> str:
    payload = {
        "playlist": {
            "name": playlist.name,
            "owner": playlist.owner,
            "id": playlist.playlist_id,
            "url": playlist.url,
            "source": playlist.source,
            "track_count": len(playlist.tracks),
            "total_on_spotify": playlist.total,
            "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "warnings": playlist.warnings,
        },
        "tracks": [
            {
                "index": track.index,
                "song": track.song,
                "album": track.album,
                "artists": track.artists,
                "artist": track.artist_display,
                "duration_ms": track.duration_ms,
                "duration": format_duration(track.duration_ms),
                "release_date": track.release_date,
                "added_at": track.added_at,
                "isrc": track.isrc,
                "kind": track.kind,
                "spotify_id": track.track_id,
                "url": track.url,
            }
            for track in playlist.tracks
        ],
    }
    if list(fields) != DEFAULT_FIELDS:
        payload["playlist"]["fields"] = list(fields)
    return json.dumps(payload, indent=2, ensure_ascii=False)


def render(
    playlist: Playlist,
    render_format: str,
    fields: Sequence[str],
    *,
    header: bool = True,
    max_col: int = DEFAULT_MAX_COL,
) -> str:
    if render_format == "json":
        return render_json(playlist, fields) + "\n"
    if render_format == "table":
        return render_table(playlist.tracks, fields, header=header, max_col=max_col) + "\n"
    if render_format == "list":
        return render_list(playlist.tracks, fields) + "\n"
    if render_format == "markdown":
        return render_markdown(playlist.tracks, fields, header=header) + "\n"
    if render_format == "csv":
        return render_delimited(playlist.tracks, fields, delimiter=",", header=header) + "\n"
    if render_format == "tsv":
        return render_delimited(playlist.tracks, fields, delimiter="\t", header=header) + "\n"
    raise ToolError("unknown format %r" % render_format)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

_EXTENSION_FORMATS = {
    ".md": "markdown",
    ".markdown": "markdown",
    ".csv": "csv",
    ".tsv": "tsv",
    ".json": "json",
    ".txt": "list",
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="spotify_playlist.py",
        description=(
            "Scrape a public Spotify playlist into a numbered list "
            "(song / album / artist by default)."
        ),
        epilog=(
            "no setup:  python3 spotify_playlist.py "
            "https://open.spotify.com/playlist/<id>\n"
            "full list + real albums: set SPOTIFY_CLIENT_ID and "
            "SPOTIFY_CLIENT_SECRET\n"
            "  (free app at https://developer.spotify.com/dashboard)\n\n"
            "fields: %s" % ", ".join(FIELD_LABELS)
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "target",
        help=(
            "playlist URL (open.spotify.com/playlist/<id>), "
            "spotify:playlist:<id> URI, or bare id"
        ),
    )
    parser.add_argument(
        "-f",
        "--format",
        dest="render_format",
        choices=["table", "list", "markdown", "csv", "tsv", "json"],
        default=None,
        help="output format (default: table, or inferred from the -o extension)",
    )
    parser.add_argument(
        "-o",
        "--output",
        metavar="FILE",
        default="-",
        help="write to FILE instead of stdout ('-' means stdout)",
    )
    parser.add_argument(
        "--fields",
        default=",".join(DEFAULT_FIELDS),
        help="comma-separated columns in order (default: song,album,artist)",
    )
    parser.add_argument(
        "--source",
        choices=["auto", "web", "embed", "browser"],
        default="auto",
        help=(
            "auto (API when credentials exist, else embed), web, embed, or "
            "browser (Playwright; full list + real albums, no API key)"
        ),
    )
    parser.add_argument("--client-id", default=os.environ.get("SPOTIFY_CLIENT_ID", ""))
    parser.add_argument(
        "--client-secret", default=os.environ.get("SPOTIFY_CLIENT_SECRET", "")
    )
    parser.add_argument(
        "--no-enrich",
        dest="enrich",
        action="store_false",
        help="do not look up missing album names on Deezer (embed source only)",
    )
    parser.add_argument(
        "--no-header",
        dest="header",
        action="store_false",
        help="omit the header row (table / markdown / csv / tsv)",
    )
    parser.add_argument(
        "--max-col",
        type=int,
        default=DEFAULT_MAX_COL,
        metavar="N",
        help="truncate table cells wider than N characters (0 = never; default %d)"
        % DEFAULT_MAX_COL,
    )
    parser.add_argument("-q", "--quiet", action="store_true", help="no progress output")
    parser.add_argument("--version", action="version", version=__version__)
    parser.set_defaults(enrich=True, header=True)
    return parser


def parse_fields(raw: str) -> List[str]:
    fields = [chunk.strip().lower() for chunk in (raw or "").split(",") if chunk.strip()]
    if not fields:
        raise ToolError("--fields is empty; pick from %s" % ", ".join(FIELD_LABELS))
    unknown = [name for name in fields if name not in FIELD_LABELS]
    if unknown:
        raise ToolError(
            "unknown field(s): %s\n  valid fields: %s"
            % (", ".join(unknown), ", ".join(FIELD_LABELS))
        )
    deduped: List[str] = []
    for name in fields:
        if name not in deduped:
            deduped.append(name)
    return deduped


def resolve_format(requested: Optional[str], output_path: str) -> str:
    if requested:
        return requested
    if output_path and output_path != "-":
        extension = os.path.splitext(output_path)[1].lower()
        if extension in _EXTENSION_FORMATS:
            return _EXTENSION_FORMATS[extension]
    return "table"


def make_logger(quiet: bool):
    def log(message: str) -> None:
        if not quiet:
            sys.stderr.write("  %s\n" % message)
            sys.stderr.flush()

    return log


def make_progress(enabled: bool):
    def progress(done: int, total: int, track: Track) -> None:
        if not enabled:
            return
        sys.stderr.write(
            "\r  album lookup %d/%d  %s" % (done, total, track.song[:40].ljust(40))
        )
        if done >= total:
            sys.stderr.write("\n")
        sys.stderr.flush()

    return progress


def load_playlist(target: str, args, log) -> Playlist:
    kind, spotify_id = parse_target(target)
    client_id = (args.client_id or "").strip()
    client_secret = (args.client_secret or "").strip()
    has_credentials = bool(client_id and client_secret)

    if args.source == "browser":
        return fetch_browser(kind, spotify_id, log)

    use_web = args.source == "web" or (args.source == "auto" and has_credentials)
    if use_web:
        if not has_credentials:
            raise ToolError(
                "--source web needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET "
                "(or --client-id / --client-secret)."
            )
        try:
            return fetch_web_api(kind, spotify_id, client_id, client_secret, log)
        except ToolError as exc:
            if args.source == "web":
                raise
            log("official API failed (%s) - falling back to the embed page" % exc)

    playlist = fetch_embed(kind, spotify_id, log)
    if args.enrich and any(not track.album for track in playlist.tracks):
        progress = make_progress(not args.quiet and sys.stderr.isatty())
        filled, failed = enrich_albums(playlist.tracks, log, progress)
        if filled:
            log(
                "album names resolved via Deezer: %d/%d"
                % (filled, len(playlist.tracks))
            )
        if failed:
            playlist.warnings.append(
                "%d track(s) have no album name; run with Spotify API credentials "
                "for exact album data." % failed
            )
    return playlist


def write_output(text: str, output_path: str) -> None:
    if output_path in ("", "-"):
        sys.stdout.write(text)
        sys.stdout.flush()
        return
    directory = os.path.dirname(os.path.abspath(output_path))
    if directory and not os.path.isdir(directory):
        os.makedirs(directory, exist_ok=True)
    with open(output_path, "w", encoding="utf-8", newline="") as handle:
        handle.write(text)


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    log = make_logger(args.quiet)

    try:
        fields = parse_fields(args.fields)
        render_format = resolve_format(args.render_format, args.output)
        playlist = load_playlist(args.target, args, log)
        if not playlist.tracks:
            raise ToolError("the playlist came back with no tracks")

        text = render(
            playlist,
            render_format,
            fields,
            header=args.header,
            max_col=max(0, args.max_col),
        )
        write_output(text, args.output)
    except ToolError as exc:
        sys.stderr.write("error: %s\n" % exc)
        return 1
    except KeyboardInterrupt:
        sys.stderr.write("\ninterrupted\n")
        return 130
    except BrokenPipeError:
        return 0

    if not args.quiet:
        summary = '"%s"' % playlist.name
        if playlist.owner:
            summary += " by %s" % playlist.owner
        summary += " - %d track%s" % (
            len(playlist.tracks),
            "" if len(playlist.tracks) == 1 else "s",
        )
        summary += " (source: %s" % playlist.source
        if playlist.total:
            summary += ", %d on Spotify" % playlist.total
        summary += ")"
        if args.output not in ("", "-"):
            summary += " -> %s" % args.output
        log(summary)
        for warning in playlist.warnings:
            sys.stderr.write("  warning: %s\n" % warning)
    return 0


if __name__ == "__main__":
    sys.exit(main())

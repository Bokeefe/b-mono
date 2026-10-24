#!/usr/bin/env python3
"""Tests for spotify_playlist.py (stdlib unittest, no network).

Run with:
    python3 -m unittest discover -s tools/spotify-playlist -p 'test_*.py' -v
"""

import contextlib
import io
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spotify_playlist as sp  # noqa: E402

PLAYLIST_ID = "4xcMWLMk7VDLfvxeI4Sg3p"
API_TOTAL = 130


def _track_item(index):
    return {
        "is_local": False,
        "track": {
            "id": "trk%019d" % index,
            "name": "Song %d" % index,
            "type": "track",
            "duration_ms": 180000 + index,
            "artists": [{"name": "Artist %d" % index}],
            "album": {"name": "Album %d" % index, "release_date": "2020-01-01"},
            "external_urls": {"spotify": "https://open.spotify.com/track/trk%d" % index},
            "external_ids": {"isrc": "ISRC%06d" % index},
        },
    }


def _episode_item(index):
    return {
        "is_local": False,
        "track": {
            "id": "epi%019d" % index,
            "name": "Episode %d" % index,
            "type": "episode",
            "duration_ms": 600000,
            "show": {"name": "Show %d" % index},
            "external_urls": {"spotify": "https://open.spotify.com/episode/epi%d" % index},
        },
    }


def _build_api_page(offset, limit):
    entries = []
    for index in range(offset, min(offset + limit, API_TOTAL)):
        if index == 5:                       # a removed / unavailable entry
            entries.append({"is_local": False, "track": None})
        elif index == 7:
            entries.append(_episode_item(index))
        else:
            entries.append(_track_item(index))
    return entries


def _embed_html(entity):
    next_data = {"props": {"pageProps": {"state": {"data": {"entity": entity}}}}}
    return (
        "<html><body><script id=\"__NEXT_DATA__\" type=\"application/json\">"
        + json.dumps(next_data)
        + "</script></body></html>"
    )


EMBED_ENTITY = {
    "type": "playlist",
    "name": "Mock Playlist",
    "title": "Mock Playlist",
    "subtitle": "mock-owner",
    "trackList": [
        {
            "uri": "spotify:track:1phpRa6e8DyPaaLk7vFtRf",
            "title": "Song 1",
            "subtitle": "Artist 1,\u00a0Guest Two",
            "duration": 180000,
            "entityType": "track",
        },
        {
            "uri": "spotify:track:2phpRa6e8DyPaaLk7vFtRf",
            "title": "Song 2",
            "subtitle": "Artist 2",
            "duration": 181000,
            "entityType": "track",
        },
    ],
}

DEEZER_CANNED = [
    # right title, right artist, WRONG length -> must be rejected
    {"title": "Song 2", "duration": 300, "artist": {"name": "Artist 2"},
     "album": {"title": "Wrong Album"}},
]

FAKE_BROWSER_SCRIPT = """
const payload = {
  playlist: {
    name: "Mock Playlist",
    owner: "mock-owner",
    id: "4xcMWLMk7VDLfvxeI4Sg3p",
    url: "https://open.spotify.com/playlist/4xcMWLMk7VDLfvxeI4Sg3p",
    source: "browser",
    track_count: 2,
    total_on_spotify: 138,
    meta: "138 songs",
    fetched_at: "2026-10-24T00:00:00Z",
    warnings: ["rendered 2 of 138 tracks - the page stopped loading rows"],
  },
  tracks: [
    {
      index: 1, song: "Danger", album: "Reset",
      artists: ["Panda Bear", "Sonic Boom"], artist: "Panda Bear, Sonic Boom",
      duration_ms: 338000, duration: "5:38", release_date: "", added_at: "May 14, 2026",
      isrc: "", kind: "track", spotify_id: "1phpRa6e8DyPaaLk7vFtRf",
      url: "https://open.spotify.com/track/1phpRa6e8DyPaaLk7vFtRf",
    },
    {
      index: 2, song: "TTYGF", album: "",
      artists: ["Fcukers"], artist: "Fcukers",
      duration_ms: 151000, duration: "2:31", release_date: "", added_at: "",
      isrc: "", kind: "track", spotify_id: "2phpRa6e8DyPaaLk7vFtRf",
      url: "https://open.spotify.com/track/2phpRa6e8DyPaaLk7vFtRf",
    },
  ],
};
process.stdout.write(JSON.stringify(payload, null, 2) + "\\n");
"""

FAILING_BROWSER_SCRIPT = """
process.stderr.write("  error: the track list never rendered\\n");
process.exit(1);
"""

class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):        # silence request logging
        pass

    def _send(self, status, body, content_type="application/json"):
        raw = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):                   # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        self.rfile.read(length)
        if self.path.startswith("/token"):
            self._send(200, json.dumps({"access_token": "fake-token", "expires_in": 3600}))
        else:
            self._send(404, json.dumps({"error": {"message": "no such route"}}))

    def do_GET(self):                    # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/v1/playlists/%s" % PLAYLIST_ID:
            self._send(200, json.dumps({
                "name": "Mock Playlist",
                "owner": {"display_name": "mock-owner"},
                "tracks": {"total": API_TOTAL},
                "snapshot_id": "abc",
            }))
            return

        if path == "/v1/playlists/%s/items" % PLAYLIST_ID:
            # Simulate the Nov-2024 deprecation so the /tracks fallback is used.
            self._send(403, json.dumps({
                "error": {"status": 403, "message": "Forbidden"}}))
            return

        if path == "/v1/playlists/%s/tracks" % PLAYLIST_ID:
            offset = int(query.get("offset", ["0"])[0])
            limit = int(query.get("limit", ["100"])[0])
            entries = _build_api_page(offset, limit)
            next_url = None
            if offset + limit < API_TOTAL:
                next_url = "http://localhost/next?offset=%d" % (offset + limit)
            self._send(200, json.dumps({
                "items": entries,
                "total": API_TOTAL,
                "next": next_url,
                "offset": offset,
            }))
            return

        if path == "/embed/playlist/%s" % PLAYLIST_ID:
            self._send(200, _embed_html(EMBED_ENTITY), "text/html")
            return

        if path == "/embed/playlist/privateprivateprivate1":
            self._send(200, "<html><head><meta property=\"og:title\" "
                            "content=\"Page not found\"></head></html>", "text/html")
            return

        if path == "/search":
            wanted = (query.get("q") or [""])[0]
            if "Quota Probe" in wanted:
                self._send(200, json.dumps({
                    "error": {"type": "Exception",
                              "message": "Quota limit exceeded", "code": 4}}))
                return
            data = []
            if "Song 1" in wanted:
                data.append({"title": "Song 1", "duration": 180,
                             "artist": {"name": "Artist 1"},
                             "album": {"title": "Real Album 1"}})
                data.append({"title": "Song 1", "duration": 180,
                             "artist": {"name": "Someone Else"},
                             "album": {"title": "Someone Else Album"}})
            if "Song 2" in wanted:
                data.extend(DEEZER_CANNED)
            self._send(200, json.dumps({"data": data}))
            return

        self._send(404, json.dumps({"error": {"message": "unknown path %s" % path}}))


def _quiet(*_args, **_kwargs):
    pass


class MockServerCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), _Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        base = "http://127.0.0.1:%d" % cls.server.server_port
        cls.base = base
        cls._saved = {
            name: getattr(sp, name)
            for name in ("ACCOUNTS_URL", "API_BASE", "EMBED_BASE", "DEEZER_BASE",
                         "_DEEZER_MIN_INTERVAL")
        }
        sp.ACCOUNTS_URL = base + "/token"
        sp.API_BASE = base + "/v1"
        sp.EMBED_BASE = base + "/embed"
        sp.DEEZER_BASE = base
        sp._DEEZER_MIN_INTERVAL = 0.0

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        for name, value in cls._saved.items():
            setattr(sp, name, value)


class ParsingTests(unittest.TestCase):
    def test_url_with_query_string(self):
        self.assertEqual(
            sp.parse_target(
                "https://open.spotify.com/playlist/%s?si=595262ec25794040" % PLAYLIST_ID
            ),
            ("playlist", PLAYLIST_ID),
        )

    def test_intl_and_embed_urls(self):
        self.assertEqual(
            sp.parse_target("https://open.spotify.com/intl-de/playlist/%s" % PLAYLIST_ID),
            ("playlist", PLAYLIST_ID),
        )
        self.assertEqual(
            sp.parse_target("https://open.spotify.com/embed/playlist/%s" % PLAYLIST_ID),
            ("playlist", PLAYLIST_ID),
        )

    def test_uri_and_bare_id(self):
        self.assertEqual(
            sp.parse_target("spotify:playlist:%s" % PLAYLIST_ID), ("playlist", PLAYLIST_ID)
        )
        self.assertEqual(sp.parse_target(PLAYLIST_ID), ("playlist", PLAYLIST_ID))

    def test_rejects_garbage(self):
        with self.assertRaises(sp.ToolError):
            sp.parse_target("https://example.com/nope")

    def test_split_artists_keeps_compound_names(self):
        self.assertEqual(
            sp._split_artists("Panda Bear,\u00a0Sonic Boom"),
            ["Panda Bear", "Sonic Boom"],
        )
        self.assertEqual(sp._split_artists("Tyler, The Creator"), ["Tyler, The Creator"])
        self.assertEqual(sp._split_artists(""), [])


class WebApiTests(MockServerCase):
    def test_paginates_and_falls_back_to_tracks(self):
        playlist = sp.fetch_web_api(
            "playlist", PLAYLIST_ID, "client", "secret", _quiet
        )
        self.assertEqual(playlist.name, "Mock Playlist")
        self.assertEqual(playlist.owner, "mock-owner")
        self.assertEqual(playlist.source, "web-api")
        self.assertEqual(playlist.total, API_TOTAL)
        # 130 entries, one of them unavailable -> 129 tracks
        self.assertEqual(len(playlist.tracks), 129)
        self.assertEqual([t.index for t in playlist.tracks], list(range(1, 130)))
        self.assertEqual(playlist.tracks[0].song, "Song 0")
        self.assertEqual(playlist.tracks[0].album, "Album 0")
        self.assertEqual(playlist.tracks[0].isrc, "ISRC000000")
        self.assertIn("trk", playlist.tracks[0].url)

        episode = next(t for t in playlist.tracks if t.song == "Episode 7")
        self.assertEqual(episode.kind, "episode")
        self.assertEqual(episode.album, "Show 7")
        self.assertEqual(episode.artists, ["Show 7"])

        self.assertEqual(playlist.tracks[-1].song, "Song 129")
        self.assertTrue(any("skipped" in w for w in playlist.warnings))

    def test_requires_credentials(self):
        args = sp.build_parser().parse_args([PLAYLIST_ID, "--source", "web"])
        with self.assertRaises(sp.ToolError):
            sp.load_playlist(PLAYLIST_ID, args, _quiet)


class DeezerTests(MockServerCase):
    def test_quota_error_is_surfaced(self):
        track = sp.Track(index=1, song="Quota Probe", artists=["Nobody"])
        with mock.patch("time.sleep", return_value=None):
            with self.assertRaises(sp.ToolError):
                sp._deezer_lookup(track)


class EmbedTests(MockServerCase):
    def test_reads_next_data(self):
        playlist = sp.fetch_embed("playlist", PLAYLIST_ID, _quiet)
        self.assertEqual(playlist.name, "Mock Playlist")
        self.assertEqual(playlist.owner, "mock-owner")
        self.assertEqual(playlist.source, "embed")
        self.assertEqual(len(playlist.tracks), 2)
        first = playlist.tracks[0]
        self.assertEqual(first.song, "Song 1")
        self.assertEqual(first.artists, ["Artist 1", "Guest Two"])
        self.assertEqual(first.duration_ms, 180000)
        self.assertEqual(first.track_id, "1phpRa6e8DyPaaLk7vFtRf")
        self.assertEqual(first.album, "")
        self.assertEqual(playlist.warnings, [])

    def test_missing_playlist(self):
        with self.assertRaises(sp.ToolError):
            sp.fetch_embed("playlist", "privateprivateprivate1", _quiet)


class EnrichTests(MockServerCase):
    def test_strict_matching(self):
        tracks = [
            sp.Track(index=1, song="Song 1", artists=["Artist 1"], duration_ms=180000),
            sp.Track(index=2, song="Song 2", artists=["Artist 2"], duration_ms=181000),
        ]
        filled, failed = sp.enrich_albums(tracks, _quiet, _quiet)
        self.assertEqual((filled, failed), (1, 1))
        self.assertEqual(tracks[0].album, "Real Album 1")
        self.assertEqual(tracks[0].album_source, "deezer")
        # the only Song 2 candidate is 300s long -> rejected
        self.assertEqual(tracks[1].album, "")


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.playlist = sp.Playlist(
            name="Mock Playlist",
            owner="mock-owner",
            playlist_id=PLAYLIST_ID,
            url="https://open.spotify.com/playlist/%s" % PLAYLIST_ID,
            source="web-api",
            tracks=[
                sp.Track(index=1, song="Song 1", album="Album 1",
                         artists=["Artist 1", "Guest"], duration_ms=338173,
                         track_id="abc", url="https://open.spotify.com/track/abc"),
                sp.Track(index=2, song="Song, Two", album="", artists=["Artist 2"],
                         duration_ms=60000),
            ],
        )

    def test_format_duration(self):
        self.assertEqual(sp.format_duration(338173), "5:38")
        self.assertEqual(sp.format_duration(60000), "1:00")
        self.assertEqual(sp.format_duration(3600000), "1:00:00")
        self.assertEqual(sp.format_duration(None), "")

    def test_table_is_numbered(self):
        text = sp.render(self.playlist, "table", sp.DEFAULT_FIELDS)
        lines = text.rstrip("\n").split("\n")
        self.assertIn("Song", lines[0])
        self.assertIn("Album", lines[0])
        self.assertIn("Artist", lines[0])
        self.assertTrue(lines[2].strip().startswith("1"))
        self.assertIn("Song 1", lines[2])
        self.assertIn("Album 1", lines[2])
        self.assertIn("Artist 1, Guest", lines[2])

    def test_list_format(self):
        text = sp.render(self.playlist, "list", sp.DEFAULT_FIELDS)
        self.assertEqual(
            text.splitlines()[0], "1. Song 1 \u2014 Album 1 \u2014 Artist 1, Guest"
        )
        self.assertEqual(text.splitlines()[1], "2. Song, Two \u2014 - \u2014 Artist 2")

    def test_markdown_format(self):
        text = sp.render(self.playlist, "markdown", sp.DEFAULT_FIELDS)
        self.assertIn("| # | Song | Album | Artist |", text)
        self.assertIn("| 1 | Song 1 | Album 1 | Artist 1, Guest |", text)

    def test_csv_quotes_commas(self):
        text = sp.render(self.playlist, "csv", sp.DEFAULT_FIELDS)
        lines = text.splitlines()
        self.assertEqual(lines[0], "#,Song,Album,Artist")
        self.assertIn('"Song, Two"', lines[2])

    def test_json_shape(self):
        payload = json.loads(sp.render(self.playlist, "json", sp.DEFAULT_FIELDS))
        self.assertEqual(payload["playlist"]["name"], "Mock Playlist")
        self.assertEqual(payload["playlist"]["track_count"], 2)
        self.assertEqual(payload["tracks"][0]["duration"], "5:38")
        self.assertEqual(payload["tracks"][0]["artists"], ["Artist 1", "Guest"])

    def test_field_validation(self):
        self.assertEqual(sp.parse_fields("song,artist,song"), ["song", "artist"])
        with self.assertRaises(sp.ToolError):
            sp.parse_fields("song,bpm")

    def test_format_inferred_from_extension(self):
        self.assertEqual(sp.resolve_format(None, "out.md"), "markdown")
        self.assertEqual(sp.resolve_format(None, "out.csv"), "csv")
        self.assertEqual(sp.resolve_format(None, "-"), "table")
        self.assertEqual(sp.resolve_format("json", "out.csv"), "json")


@unittest.skipUnless(shutil.which("node"), "node is required for the browser source")
class BrowserTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="spotify-playlist-browser-")
        self.addCleanup(shutil.rmtree, self.dir, True)
        os.makedirs(os.path.join(self.dir, "node_modules", "playwright"))
        self.script = os.path.join(self.dir, "scrape_playlist.mjs")
        self.write_script(FAKE_BROWSER_SCRIPT)
        self.saved_script = sp.BROWSER_SCRIPT
        sp.BROWSER_SCRIPT = self.script
        self.addCleanup(self.restore)

    def restore(self):
        sp.BROWSER_SCRIPT = self.saved_script

    def write_script(self, source):
        with open(self.script, "w", encoding="utf-8") as handle:
            handle.write(source)

    def test_parses_scraper_payload(self):
        playlist = sp.fetch_browser("playlist", PLAYLIST_ID, _quiet)
        self.assertEqual(playlist.source, "browser")
        self.assertEqual(playlist.total, 138)
        self.assertEqual(len(playlist.tracks), 2)
        self.assertEqual(playlist.tracks[0].album, "Reset")
        self.assertEqual(playlist.tracks[0].added_at, "May 14, 2026")
        self.assertEqual(playlist.tracks[0].duration_ms, 338000)
        self.assertEqual(playlist.tracks[1].album, "")
        self.assertTrue(playlist.warnings)

    def test_missing_playwright_explains_setup(self):
        shutil.rmtree(os.path.join(self.dir, "node_modules"))
        with self.assertRaises(sp.ToolError) as caught:
            sp.fetch_browser("playlist", PLAYLIST_ID, _quiet)
        self.assertIn("npm install", str(caught.exception))

    def test_scraper_failure_is_reported(self):
        self.write_script(FAILING_BROWSER_SCRIPT)
        with self.assertRaises(sp.ToolError):
            sp.fetch_browser("playlist", PLAYLIST_ID, _quiet)

    def test_cli_browser_source(self):
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(io.StringIO()):
            code = sp.main(["-q", "--source", "browser", "-f", "json", PLAYLIST_ID])
        self.assertEqual(code, 0)
        payload = json.loads(buffer.getvalue())
        self.assertEqual(payload["playlist"]["source"], "browser")
        self.assertEqual(payload["tracks"][0]["album"], "Reset")
        self.assertEqual(payload["tracks"][0]["added_at"], "May 14, 2026")


class CliTests(MockServerCase):
    def test_end_to_end_embed_with_enrichment(self):
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(io.StringIO()):
            code = sp.main(["-q", "-f", "json", "--source", "embed",
                            "https://open.spotify.com/playlist/%s?si=x" % PLAYLIST_ID])
        self.assertEqual(code, 0)
        payload = json.loads(buffer.getvalue())
        self.assertEqual(payload["playlist"]["source"], "embed")
        self.assertEqual(payload["playlist"]["track_count"], 2)
        self.assertEqual(payload["tracks"][0]["album"], "Real Album 1")
        self.assertEqual(payload["tracks"][1]["album"], "")

    def test_end_to_end_web_api(self):
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(io.StringIO()):
            code = sp.main(["-q", "--source", "web", "--client-id", "id",
                            "--client-secret", "secret", "-f", "json", PLAYLIST_ID])
        self.assertEqual(code, 0)
        payload = json.loads(buffer.getvalue())
        self.assertEqual(payload["playlist"]["source"], "web-api")
        self.assertEqual(payload["playlist"]["track_count"], 129)

    def test_writes_file_and_infers_format(self):
        path = os.path.join(self._tmpdir(), "playlist.csv")
        with contextlib.redirect_stdout(io.StringIO()), \
                contextlib.redirect_stderr(io.StringIO()):
            code = sp.main(["-q", PLAYLIST_ID, "-o", path, "--no-enrich"])
        self.assertEqual(code, 0)
        with open(path, encoding="utf-8") as handle:
            content = handle.read()
        self.assertTrue(content.startswith("#,Song,Album,Artist"))

    def test_bad_target_returns_one(self):
        stderr = io.StringIO()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(stderr):
            code = sp.main(["-q", "not-a-playlist"])
        self.assertEqual(code, 1)
        self.assertIn("could not find a Spotify playlist id", stderr.getvalue())

    def test_web_source_without_credentials_explains(self):
        stderr = io.StringIO()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(stderr):
            code = sp.main(["-q", PLAYLIST_ID, "--source", "web"])
        self.assertEqual(code, 1)
        self.assertIn("SPOTIFY_CLIENT_ID", stderr.getvalue())

    def _tmpdir(self):
        import tempfile

        directory = tempfile.mkdtemp(prefix="spotify-playlist-test-")
        self.addCleanup(lambda: __import__("shutil").rmtree(directory, ignore_errors=True))
        return directory


if __name__ == "__main__":
    unittest.main(verbosity=2)

#!/usr/bin/env python3
"""Tests for sync.py (stdlib unittest, no network, no Sockseek needed).

Run with:
    python3 -m unittest discover -s tools/soulseek-dl -p 'test_*.py' -v
"""

import contextlib
import io
import json
import os
import stat
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sync  # noqa: E402

PAYLOAD = {
    "playlist": {"name": "Mock Playlist", "source": "browser"},
    "tracks": [
        {
            "index": 1,
            "song": "Danger",
            "album": "Reset",
            "artists": ["Panda Bear", "Sonic Boom"],
            "artist": "Panda Bear, Sonic Boom",
            "duration_ms": 338173,
            "duration": "5:38",
        },
        {
            "index": 2,
            "song": "TTYGF",
            "album": "",
            "artists": ["Fcukers"],
            "artist": "Fcukers",
            "duration_ms": None,
            "duration": "2:31",
        },
        {"index": 3, "song": "", "album": "Ignored", "artists": ["Nobody"]},
        {
            "index": 4,
            "song": "danger",
            "album": "Reset",
            "artists": ["panda bear", "sonic boom"],
            "duration_ms": 338000,
            "duration": "5:38",
        },
    ],
}


class BuildRowsTests(unittest.TestCase):
    def test_skips_blank_titles_and_duplicates(self):
        rows = sync.build_rows(PAYLOAD)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0], ["Panda Bear, Sonic Boom", "Danger", "Reset", "338"])

    def test_length_falls_back_to_duration_text(self):
        rows = sync.build_rows(PAYLOAD)
        self.assertEqual(rows[1][3], "151")

    def test_length_parsing(self):
        self.assertEqual(sync.track_length_seconds({"duration": "5:38"}), 338)
        self.assertEqual(sync.track_length_seconds({"duration": "1:02:03"}), 3723)
        self.assertEqual(sync.track_length_seconds({"duration": "0:07"}), 7)
        self.assertEqual(sync.track_length_seconds({}), 0)
        self.assertEqual(sync.track_length_seconds({"duration_ms": 1000}), 1)

    def test_artist_falls_back_to_artist_field(self):
        self.assertEqual(sync.track_artist({"artist": "Solo"}), "Solo")
        self.assertEqual(sync.track_artist({"artists": ["A", "B"]}), "A, B")

    def test_empty_payload_raises(self):
        with self.assertRaises(sync.SyncError):
            sync.build_rows({"tracks": [{"song": "  "}]})


class CsvTests(unittest.TestCase):
    def test_header_and_quoting(self):
        directory = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(directory, True))
        path = sync.write_csv(sync.build_rows(PAYLOAD), os.path.join(directory, "t.csv"))
        with open(path, encoding="utf-8") as handle:
            lines = handle.read().splitlines()
        self.assertEqual(lines[0], "Artist,Title,Album,Length")
        self.assertEqual(lines[1], '"Panda Bear, Sonic Boom",Danger,Reset,338')
        self.assertEqual(lines[2], "Fcukers,TTYGF,,151")

    def test_creates_missing_directories(self):
        directory = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(directory, True))
        nested = os.path.join(directory, "a", "b", "t.csv")
        sync.write_csv([["A", "T", "Al", "1"]], nested)
        self.assertTrue(os.path.isfile(nested))


class LoadPlaylistTests(unittest.TestCase):
    def test_missing_file_hints_at_the_exporter(self):
        with self.assertRaises(sync.SyncError) as caught:
            sync.load_playlist("/nope/missing.json")
        self.assertIn("spotify_playlist.py", str(caught.exception))

    def test_invalid_json(self):
        directory = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(directory, True))
        path = os.path.join(directory, "bad.json")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write("{not json")
        with self.assertRaises(sync.SyncError):
            sync.load_playlist(path)

    def test_no_tracks_key(self):
        directory = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(directory, True))
        path = os.path.join(directory, "empty.json")
        with open(path, "w", encoding="utf-8") as handle:
            json.dump({"playlist": {}}, handle)
        with self.assertRaises(sync.SyncError):
            sync.load_playlist(path)


class CommandTests(unittest.TestCase):
    def test_plain(self):
        self.assertEqual(
            sync.build_command("/bin/sockseek", "t.csv"), ["/bin/sockseek", "t.csv"]
        )

    def test_all_options(self):
        command = sync.build_command(
            "ss",
            "t.csv",
            dry_run=True,
            limit=5,
            music_dir="~/Music",
            pref_format="flac,mp3",
            name_format="{artist}/{title}",
            extra=["--verbose"],
        )
        self.assertEqual(
            command,
            [
                "ss",
                "t.csv",
                "--print",
                "jobs",
                "-n",
                "5",
                "--skip-music-dir",
                os.path.expanduser("~/Music"),
                "--pref-format",
                "flac,mp3",
                "--name-format",
                "{artist}/{title}",
                "--verbose",
            ],
        )

    def test_mp3_320_preset(self):
        command = sync.build_command("ss", "t.csv", mp3_320=True)
        self.assertEqual(
            command, ["ss", "t.csv", "--format", "mp3", "--pref-min-bitrate", "320"]
        )

    def test_explicit_format_overrides_preset(self):
        command = sync.build_command(
            "ss", "t.csv", mp3_320=True, formats="mp3,m4a", pref_min_bitrate="256"
        )
        self.assertEqual(
            command,
            ["ss", "t.csv", "--format", "mp3,m4a", "--pref-min-bitrate", "256"],
        )

    def test_min_bitrate_and_pref_format(self):
        command = sync.build_command(
            "ss", "t.csv", formats="mp3", pref_format="mp3", min_bitrate="192"
        )
        self.assertEqual(
            command,
            [
                "ss",
                "t.csv",
                "--format",
                "mp3",
                "--pref-format",
                "mp3",
                "--min-bitrate",
                "192",
            ],
        )

    def test_tuning_flags(self):
        command = sync.build_command(
            "ss", "t.csv", search_timeout="15000", max_retries="5", length_tol="-1"
        )
        self.assertEqual(
            command,
            [
                "ss",
                "t.csv",
                "--search-timeout",
                "15000",
                "--max-retries",
                "5",
                "--length-tol=-1",
            ],
        )

    def test_extra_string_is_split(self):
        command = sync.build_command(
            "ss", "t.csv", extra=["--search-timeout 15000 --max-retries 5"]
        )
        self.assertEqual(
            command,
            ["ss", "t.csv", "--search-timeout", "15000", "--max-retries", "5"],
        )

    def test_find_sockseek_prefers_env(self):
        directory = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(directory, True))
        fake = os.path.join(directory, "sockseek")
        with open(fake, "w", encoding="utf-8") as handle:
            handle.write("#!/bin/sh\nexit 0\n")
        os.chmod(fake, os.stat(fake).st_mode | stat.S_IEXEC)
        old = os.environ.get("SOCKSEEK_BIN")
        os.environ["SOCKSEEK_BIN"] = fake
        try:
            self.assertEqual(sync.find_sockseek(None), fake)
        finally:
            if old is None:
                os.environ.pop("SOCKSEEK_BIN", None)
            else:
                os.environ["SOCKSEEK_BIN"] = old

    def test_find_sockseek_missing(self):
        old_env = os.environ.pop("SOCKSEEK_BIN", None)
        old_fallbacks = sync.FALLBACK_BINARIES
        sync.FALLBACK_BINARIES = ()
        try:
            with mock.patch("shutil.which", return_value=None):
                with self.assertRaises(sync.SyncError) as caught:
                    sync.find_sockseek(None)
            self.assertIn("github.com/fiso64/sockseek", str(caught.exception))
        finally:
            sync.FALLBACK_BINARIES = old_fallbacks
            if old_env is not None:
                os.environ["SOCKSEEK_BIN"] = old_env

    def test_find_sockseek_falls_back_to_bin_dir(self):
        directory = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(directory, True))
        fake = os.path.join(directory, "sockseek")
        with open(fake, "w", encoding="utf-8") as handle:
            handle.write("#!/bin/sh\nexit 0\n")
        os.chmod(fake, os.stat(fake).st_mode | stat.S_IEXEC)
        old_env = os.environ.pop("SOCKSEEK_BIN", None)
        old_fallbacks = sync.FALLBACK_BINARIES
        sync.FALLBACK_BINARIES = (fake,)
        try:
            with mock.patch("shutil.which", return_value=None):
                self.assertEqual(sync.find_sockseek(None), fake)
        finally:
            sync.FALLBACK_BINARIES = old_fallbacks
            if old_env is not None:
                os.environ["SOCKSEEK_BIN"] = old_env

    def test_quality_warnings_for_embed_export(self):
        payload = {
            "playlist": {"source": "embed"},
            "tracks": [{"song": "A"}, {"song": "B", "album": "Album"}],
        }
        warnings = sync.quality_warnings(payload)
        self.assertEqual(len(warnings), 2)


class MainTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(self.dir, True))
        self.playlist = os.path.join(self.dir, "playlist.json")
        with open(self.playlist, "w", encoding="utf-8") as handle:
            json.dump(PAYLOAD, handle)
        self.fake = os.path.join(self.dir, "sockseek")
        self.args_file = self.fake + ".args"
        with open(self.fake, "w", encoding="utf-8") as handle:
            handle.write('#!/bin/sh\nprintf "%%s\\n" "$@" > "%s"\nexit 0\n' % self.args_file)
        os.chmod(self.fake, os.stat(self.fake).st_mode | stat.S_IEXEC)

    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = sync.main(list(argv))
        return code, out.getvalue(), err.getvalue()

    def test_csv_only_needs_no_binary(self):
        code, _, err = self.run_cli("--playlist", self.playlist, "--csv-only")
        self.assertEqual(code, 0)
        csv_path = os.path.join(self.dir, "sockseek-tracks.csv")
        self.assertTrue(os.path.isfile(csv_path))
        self.assertIn("2 tracks", err)
        self.assertFalse(os.path.exists(self.args_file))

    def test_dry_run_invokes_binary_with_print_jobs(self):
        code, _, err = self.run_cli(
            "--playlist", self.playlist, "--sockseek", self.fake, "--dry-run", "--limit", "7"
        )
        self.assertEqual(code, 0)
        with open(self.args_file, encoding="utf-8") as handle:
            passed = handle.read().splitlines()
        self.assertEqual(passed[0], os.path.join(self.dir, "sockseek-tracks.csv"))
        self.assertIn("--print", passed)
        self.assertIn("jobs", passed)
        self.assertIn("-n", passed)
        self.assertEqual(passed[-1], "7")
        self.assertIn("dry run", err)

    def test_missing_playlist_returns_one(self):
        code, _, err = self.run_cli("--playlist", os.path.join(self.dir, "nope.json"))
        self.assertEqual(code, 1)
        self.assertIn("spotify_playlist.py", err)


if __name__ == "__main__":
    unittest.main(verbosity=2)

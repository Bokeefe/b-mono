import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Back.scss";
import {
  faBackwardStep,
  faForwardStep,
  faPause,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { baseUrl } from "../../environment";
import { apiService } from "../../services/api.service";
import ClaimjumpersTitle from "../../components/ClaimjumpersTitle/ClaimjumpersTitle.component";

/**
 * The album's track list exactly as it is printed on the back cover.
 *
 * The displayed titles are curated, so they do *not* match the mp3 filenames on
 * disk (`03 Sad World (The Millenium cover).mp3` is credited here as
 * "Sad World* / feat Gwendolyn Stanley"). The list is therefore paired
 * *positionally* with the sorted filenames from `GET /api/claimjumpers`: entry
 * `i` here plays file `i`. Adding, renumbering or reordering tracks on disk
 * means editing this array with them.
 */
interface AlbumTrack {
  title: string;
  subnote?: string;
}

const TRACKLIST: AlbumTrack[] = [
  { title: "Tide's Comin' In" },
  { title: "Untangle" },
  { title: "Sad World*", subnote: "feat Gwendolyn Stanley" },
  { title: "Sun's Rays" },
  { title: "Red Lady*" },
  { title: "Scatteredgood" },
  { title: "On the Horizon*" },
  { title: "The Colors that Make the World" },
];

/**
 * The Claimjumpers back cover: the album's painted back, and the site's playable
 * track list.
 *
 * Nothing links here from `/claimjumpers` (there is no Home button and no anchor
 * on the front cover), so the page is only reachable by typing
 * `/claimjumpers-back`. Its entry in `src/seo/routes.ts` is marked `noindex`,
 * which also keeps it out of the generated `sitemap.xml`.
 *
 * The back-cover artwork (`assets/back_w_border.webp`) is the page background,
 * see `Back.scss`. The painted border has a blank cream panel in the middle of
 * it, and `.claimjumpers-back-panel` is positioned over exactly that panel, so
 * copy and controls put here stay inside it at any viewport size.
 *
 * Playback mirrors `Claimjumpers.component.tsx`: the mp3s are listed by
 * `GET /api/claimjumpers` and streamed from the static `/audio/claimjumpers/`
 * mount. `isPlaying` is driven by the `<audio>` element's own events (not a
 * click-local flag), so it stays correct when autoplay is rejected, when a
 * track ends, and when playback is toggled elsewhere.
 */
const Back = () => {
  const [allAlbumFiles, setAllAlbumFiles] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Set by a track change: start playing once the new source has loaded.
  const autoPlayRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    apiService
      .getClaimjumperTracks()
      .then((files) => {
        if (!cancelled) setAllAlbumFiles(files);
      })
      .catch(() => {
        if (!cancelled) setAllAlbumFiles([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentFile = allAlbumFiles[currentIndex];
  const currentFileUrl = currentFile
    ? `${baseUrl}/audio/claimjumpers/${encodeURIComponent(currentFile)}`
    : "";
  const hasTracks = allAlbumFiles.length > 0;

  // `useCallback` so the "URL changed" effect below can list it as a
  // dependency without re-running (and re-`load()`ing) on every render.
  const play = useCallback(() => {
    audioRef.current?.play().catch((err: DOMException) => {
      if (err.name !== "AbortError") {
        console.log("Playback error:", err);
      }
    });
  }, []);

  // Load the new source whenever the track changes, then start it if the change
  // came from a user gesture. Calling play() here (rather than after a timeout)
  // keeps the gesture alive for mobile autoplay rules.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentFileUrl) return;

    audio.load();
    if (autoPlayRef.current) {
      autoPlayRef.current = false;
      play();
    }
  }, [currentFileUrl, play]);

  const playPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentFileUrl) return;

    if (audio.paused) {
      play();
    } else {
      audio.pause();
    }
  };

  const selectTrack = (index: number) => {
    const count = allAlbumFiles.length;
    if (count === 0) return;

    const nextIndex = ((index % count) + count) % count;
    autoPlayRef.current = true;

    if (nextIndex === currentIndex) {
      // Same track: the URL effect will not fire, so (re)start it directly.
      autoPlayRef.current = false;
      play();
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const nextTrack = () => selectTrack(currentIndex + 1);
  const prevTrack = () => selectTrack(currentIndex - 1);

  return (
    <div className="claimjumpers-back">
      <div className="claimjumpers-back-stage">
        <div className="claimjumpers-back-panel">
          <div className="controls-container">
            <button
              type="button"
              onClick={prevTrack}
              aria-label="Previous track"
              disabled={!hasTracks}
            >
              <FontAwesomeIcon icon={faBackwardStep} />
            </button>
            <button
              type="button"
              onClick={playPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              disabled={!hasTracks}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>
            <button
              type="button"
              onClick={nextTrack}
              aria-label="Next track"
              disabled={!hasTracks}
            >
              <FontAwesomeIcon icon={faForwardStep} />
            </button>
          </div>
          <ClaimjumpersTitle />
          <ol>
            {TRACKLIST.map((track, index) => {
              const isLoaded = index < allAlbumFiles.length;
              const isCurrent = isLoaded && index === currentIndex;

              return (
                <li key={track.title}>
                  <button
                    type="button"
                    className={
                      isCurrent ? "back-track is-current" : "back-track"
                    }
                    onClick={() => selectTrack(index)}
                    disabled={!isLoaded}
                    aria-current={isCurrent ? "true" : undefined}
                  >
                    {track.title}
                    {track.subnote && (
                      <>
                        {" \u00a0"}
                        <br />
                        <span className="subnote">{track.subnote}</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="fine-text">
            *covers originally by The Millenium, Phil Cordell, The Syndicats
          </div>

          {/* Hidden player: drives the controls above, renders no UI of its own
              (see `.claimjumpers-back audio` in Back.scss). The `<source>` is
              only rendered once there is a URL: an empty `src` would make the
              browser fetch the document itself as media. */}
          <audio
            ref={audioRef}
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={nextTrack}
          >
            {currentFileUrl && (
              <source src={currentFileUrl} type="audio/mpeg" />
            )}
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </div>
  );
};

export default Back;

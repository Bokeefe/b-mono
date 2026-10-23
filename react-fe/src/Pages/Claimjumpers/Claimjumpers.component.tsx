import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBackwardStep,
  faForwardStep,
  faPause,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { baseUrl } from "../../environment.ts";
import { apiService } from "../../services/api.service";
import "./Claimjumpers.scss";

const Claimjumpers: React.FC = () => {
  const [allAlbumFiles, setAllAlbumFiles] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentFileUrl, setCurrentFileUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    apiService
      .getClaimjumperTracks()
      .then(setAllAlbumFiles)
      .catch(() => setAllAlbumFiles([]));
  }, []);

  // Initialize the first track URL on mount
  useEffect(() => {
    if (allAlbumFiles.length > 0) {
      setCurrentIndex(0);
      setCurrentFileUrl(
        `${baseUrl}/audio/claimjumpers/${encodeURIComponent(allAlbumFiles[0])}`,
      );
    }
  }, [allAlbumFiles]);

  // Load the new source whenever currentFileUrl changes
  useEffect(() => {
    if (audioRef.current && currentFileUrl) {
      audioRef.current.load();
    }
  }, [currentFileUrl]);

  const play = () => {
    audioRef.current?.play().catch((err) => {
      if (err.name !== "AbortError") {
        console.log("Playback error:", err);
      }
    });
  };

  const pause = () => {
    audioRef.current?.pause();
  };

  const playPause = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        play();
      } else {
        pause();
      }
    }
  };

  const selectTrackByIndex = (index: number, autoPlay: boolean = true) => {
    const file = allAlbumFiles[index];
    if (!file) return;

    setCurrentIndex(index);
    setCurrentFileUrl(`${baseUrl}/audio/claimjumpers/${encodeURIComponent(file)}`);

    if (autoPlay) {
      setTimeout(play, 100);
    }
  };

  const nextTrack = () => {
    if (allAlbumFiles.length === 0) return;
    selectTrackByIndex((currentIndex + 1) % allAlbumFiles.length, true);
  };

  const prevTrack = () => {
    if (allAlbumFiles.length === 0) return;
    selectTrackByIndex(
      (currentIndex - 1 + allAlbumFiles.length) % allAlbumFiles.length,
      true,
    );
  };

  return (
    <div className="page-container">
      <div className="claimjumpers-container">
        <div>Claimjumpers - demo</div>
        <div className="controls-container">
          <button onClick={prevTrack} aria-label="Previous track">
            <FontAwesomeIcon icon={faBackwardStep} />
          </button>
          <button
            onClick={playPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>
          <button onClick={nextTrack} aria-label="Next track">
            <FontAwesomeIcon icon={faForwardStep} />
          </button>
        </div>
        <div>
          <audio
            ref={audioRef}
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={nextTrack}
          >
            <source src={currentFileUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
        <div>
          <ol>
            {allAlbumFiles.map((file, index) => {
              const isCurrentTrack = index === currentIndex;
              return (
                <li
                  key={index}
                  onClick={() => selectTrackByIndex(index, true)}
                  className={isCurrentTrack ? "active-track" : ""}
                  style={{ cursor: "pointer", margin: "4px 0" }}
                >
                  {file.slice(3).replace(".mp3", "")}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Claimjumpers;

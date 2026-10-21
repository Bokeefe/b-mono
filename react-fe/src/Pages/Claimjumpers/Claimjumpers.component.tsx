import React, { useState, useEffect, useRef } from "react";
import "./Claimjumpers.scss";

const Claimjumpers: React.FC = () => {
  const [allAlbumFiles] = useState<string[]>([
    "01 Tides Comin In.mp3",
    "02 Untangle.mp3",
    "03 Sad World (The Millenium cover).mp3",
    "04 Sun's Rays.mp3",
    "05 Red Lady (Phil Cordell cover).mp3",
    "06 Scatteredgood.mp3",
    "07 On the Horizon (Syndicats cover).mp3",
    "08 The Colors That Make the World.mp3",
  ]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentFileUrl, setCurrentFileUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize the first track URL on mount (without auto-playing)
  useEffect(() => {
    if (allAlbumFiles.length > 0) {
      setCurrentIndex(0);
      const firstTrackUrl = `/audio/claimjumpers/${encodeURIComponent(allAlbumFiles[0])}`;
      setCurrentFileUrl(firstTrackUrl);
    }
  }, [allAlbumFiles]);

  // Load the new source whenever currentFileUrl changes
  useEffect(() => {
    if (audioRef.current && currentFileUrl) {
      audioRef.current.load();
    }
  }, [currentFileUrl]);

  const play = () => {
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Ignore AbortError, which is normal if the user interrupts playback/switching
          if (err.name !== "AbortError") {
            console.log("Playback error:", err);
          }
        });
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
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
    setCurrentIndex(index);
    const trackUrl = `/audio/claimjumpers/${encodeURIComponent(allAlbumFiles[index])}`;
    setCurrentFileUrl(trackUrl);

    // If selected via list/next/prev, we can play after a brief moment or let the user control it
    if (autoPlay) {
      // Use a short timeout or rely on user interaction to prevent fetch abort races
      setTimeout(() => {
        play();
      }, 100);
    }
  };

  const nextTrack = () => {
    if (allAlbumFiles.length === 0) return;
    const nextIdx = (currentIndex + 1) % allAlbumFiles.length;
    selectTrackByIndex(nextIdx, true);
  };

  const prevTrack = () => {
    if (allAlbumFiles.length === 0) return;
    const prevIdx =
      (currentIndex - 1 + allAlbumFiles.length) % allAlbumFiles.length;
    selectTrackByIndex(prevIdx, true);
  };

  return (
    <div className="page-container">
      <div className="claimjumpers-container">
        <div>Claimjumpers - demo</div>
        <div className="controls-container">
          <button onClick={prevTrack}>⏮️</button>
          <button onClick={playPause}>⏯️</button>
          <button onClick={nextTrack}>⏭️</button>
        </div>
        <div>
          <audio ref={audioRef} controls onEnded={nextTrack}>
            <source src={currentFileUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
        <div>
          <ol>
            {allAlbumFiles.map((file, index) => {
              const isPlaying = index === currentIndex;
              return (
                <li
                  key={index}
                  onClick={() => selectTrackByIndex(index, true)}
                  className={isPlaying ? "active-track" : ""}
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

import React, { useEffect, useState } from "react";
import "./TextCorpseHelp.scss";

// localStorage flag so the "how to play" pop-up only auto-opens on a first visit
const HELP_STORAGE_KEY = "text-corpse-help-seen";
const MAX_CHARS = 170;

/**
 * A round "?" button that opens a pop-up explaining how Text Corpse is played.
 * Shared by the lobby (landing page) and the room view.
 */
const TextCorpseHelp: React.FC = () => {
  const [showHelp, setShowHelp] = useState<boolean>(() => {
    try {
      // Auto-open on the first ever visit; afterwards only via the "?" button
      return localStorage.getItem(HELP_STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const closeHelp = () => {
    setShowHelp(false);
    try {
      localStorage.setItem(HELP_STORAGE_KEY, "true");
    } catch {
      // localStorage unavailable - ignore
    }
  };

  // Allow closing the pop-up with the Escape key
  useEffect(() => {
    if (!showHelp) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowHelp(false);
        try {
          localStorage.setItem(HELP_STORAGE_KEY, "true");
        } catch {
          // localStorage unavailable - ignore
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHelp]);

  return (
    <>
      <button
        type="button"
        className="help-button"
        onClick={() => setShowHelp(true)}
        aria-label="How to play Text Corpse"
        title="How to play"
      >
        ?
      </button>

      {showHelp && (
        <div
          className="text-corpse-help-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="text-corpse-help-title"
          onClick={closeHelp}
        >
          <div
            className="text-corpse-help-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="help-close"
              onClick={closeHelp}
              aria-label="Close"
            >
              ×
            </button>
            <h2 id="text-corpse-help-title">How to play Text Corpse</h2>
            <p>
              Text Corpse is a collaborative writing game — an "exquisite corpse"
              for words. Everyone adds to the same running text, but you only
              ever see the very end of it.
            </p>
            <figure className="text-corpse-help-figure">
              <img
                src="/ex-corpse.png"
                alt="An exquisite corpse drawing: the head and wings of a seagull attached to the legs of a horse, drawn in three horizontal sections"
                className="text-corpse-help-image"
              />
              <figcaption>
                A classic "exquisite corpse" drawing — the surrealist parlor
                game this is based on.
              </figcaption>
            </figure>
            <ul>
              <li>
                Add a sentence or two (up to {MAX_CHARS} characters) and hit
                Submit. It's appended to the shared corpse for everyone in the
                room, in real time.
              </li>
              <li>
                Because you only see the last line or so, you're adding blind —
                that's the fun part.
              </li>
              <li>You can write at any time, even while the corpse is locked.</li>
              <li>
                When the group is ready, click <strong>Unlock</strong> and enter
                the room's password to reveal the full text and read the whole
                thing together.
              </li>
              <li>
                Create a new corpse (optionally with a password to unlock it
                later) or join an existing public one from the list.
              </li>
            </ul>
            <button
              type="button"
              className="help-done-button"
              onClick={closeHelp}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TextCorpseHelp;

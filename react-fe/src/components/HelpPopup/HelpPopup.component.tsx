import React, { useCallback, useEffect, useId, useState } from "react";
import "./HelpPopup.scss";

interface HelpPopupProps {
  /** Heading shown at the top of the pop-up. */
  title: string;
  /** Body of the pop-up. */
  children: React.ReactNode;
  /** Accessible label for the round "?" button. */
  buttonLabel: string;
  /** Tooltip for the round "?" button. */
  buttonTitle?: string;
  /**
   * localStorage key used to auto-open the pop-up on the first visit only.
   * Omit it to make the pop-up open solely when the "?" button is clicked.
   */
  autoOpenStorageKey?: string;
  /** Label for the dismiss button at the bottom of the pop-up. */
  doneLabel?: string;
}

/**
 * A round "?" button that opens a pop-up with some explanatory content.
 * Reusable shell so every page explains itself the same way.
 */
const HelpPopup: React.FC<HelpPopupProps> = ({
  title,
  children,
  buttonLabel,
  buttonTitle,
  autoOpenStorageKey,
  doneLabel = "Got it",
}) => {
  const titleId = useId();

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (!autoOpenStorageKey) return false;
    try {
      // Auto-open on the first ever visit; afterwards only via the "?" button
      return localStorage.getItem(autoOpenStorageKey) !== "true";
    } catch {
      return true;
    }
  });

  const closeHelp = useCallback(() => {
    setIsOpen(false);
    if (!autoOpenStorageKey) return;
    try {
      localStorage.setItem(autoOpenStorageKey, "true");
    } catch {
      // localStorage unavailable - ignore
    }
  }, [autoOpenStorageKey]);

  // Allow closing the pop-up with the Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeHelp();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeHelp]);

  return (
    <>
      <button
        type="button"
        className="help-button"
        onClick={() => setIsOpen(true)}
        aria-label={buttonLabel}
        title={buttonTitle}
      >
        ?
      </button>

      {isOpen && (
        <div
          className="help-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={closeHelp}
        >
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="help-close"
              onClick={closeHelp}
              aria-label="Close"
            >
              ×
            </button>
            <h2 id={titleId}>{title}</h2>
            {children}
            <button
              type="button"
              className="help-done-button"
              onClick={closeHelp}
            >
              {doneLabel}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpPopup;

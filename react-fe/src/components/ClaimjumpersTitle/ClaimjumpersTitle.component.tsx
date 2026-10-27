import type { ReactNode } from "react";

import "./ClaimjumpersTitle.scss";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface ClaimjumpersTitleProps {
  /** Words to paint. Defaults to the band name. */
  children?: ReactNode;
  /** Heading element to render. Defaults to `h1`. */
  as?: HeadingLevel;
  /**
   * Paint the first glyph as the red illuminated versal (the `C` of
   * "Claimjumpers"). On by default; turn it off when the copy does not start
   * with the mark's initial — see the note in `ClaimjumpersTitle.scss`.
   */
  versal?: boolean;
  /** Extra classes for the page's own layout (spacing, margins, …). */
  className?: string;
}

/**
 * The Claimjumpers masthead: Underdove blackletter with the artwork's red as an
 * illuminated initial.
 *
 * All of the type styling lives in `ClaimjumpersTitle.scss`; a page only picks
 * the heading level and, if its layout needs it, the size/leading through the
 * `--claimjumpers-title-size` / `--claimjumpers-title-leading` custom
 * properties. A plain class (not an element selector) so nothing leaks onto the
 * other pages' headings, and `as` so the outline stays correct wherever the
 * mark is used: `<ClaimjumpersTitle />` on the covers,
 * `<ClaimjumpersTitle as="h2" versal={false}>The Claimjumpers</ClaimjumpersTitle>`
 * on `/music`.
 */
const ClaimjumpersTitle = ({
  children = "Claimjumpers",
  as: Heading = "h1",
  versal = true,
  className,
}: ClaimjumpersTitleProps) => {
  return (
    <Heading
      className={[
        "claimjumpers-title",
        versal && "claimjumpers-title--versal",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Heading>
  );
};

export default ClaimjumpersTitle;

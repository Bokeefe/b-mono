import { Link } from "react-router-dom";

import "./Home.scss";

/**
 * The home page is the site's crawl entry point, so the navigation is real
 * `<Link>`s (not `<button>`s + `navigate()`): search engines only follow `href`s,
 * and the styling comes from the same `.mobile-btn` classes as before.
 *
 * The heading + one-line description are `.sr-only` (see `App.scss`): they are
 * in the DOM, in the prerendered HTML and in the accessibility tree, so crawlers
 * get a real `h1` and screen readers get a description of the site, but they are
 * clipped to 1px instead of painted — the landing page stays just the buttons.
 */
interface HomeLink {
  route: string;
  label: string;
  /**
   * A third line of text ("denver / planting / calendar") needs a smaller step
   * to stay inside the 64px square — see `.is-small` in `Home.scss`.
   */
  small?: boolean;
}

const links: HomeLink[] = [
  { route: "music", label: "music" },
  { route: "slomo", label: "slomo\nworld" },
  { route: "lunch", label: "lunch\napp" },
  { route: "text-corpse", label: "text\ncorpse" },
  { route: "planting-calendar", label: "denver\nplanting\ncalendar", small: true },
  { route: "resume", label: "résumé" },
  { route: "about", label: "about" },
];

const Home = () => {
  return (
    <div className="home">
      <div className="sr-only">
        <h1>Antigogglin</h1>
        <p>
          Projects, music and experiments by Brendan O&rsquo;Keefe — a
          collaborative exquisite corpse drawing app, a slow-motion playlist
          generator, a lunch-picking app, and a couple of decades of bands.
        </p>
      </div>
      <div className="button-container">
        {links.map((link) => (
          <Link
            key={link.route}
            to={`/${link.route}`}
            className={`mobile-btn animate-in${link.small ? " is-small" : ""}`}
          >
            <span className="mobile-btn-content">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;

import { Link } from "react-router-dom";

import "./Home.scss";

/**
 * The home page is the site's crawl entry point, so the navigation is real
 * `<Link>`s (not `<button>`s + `navigate()`): search engines only follow `href`s,
 * and the styling comes from the same `.mobile-btn` classes as before.
 */
const links = [
  { route: "music", label: "music projects" },
  { route: "slomo", label: "slomo\nworld" },
  { route: "lunch", label: "lunch\napp" },
  { route: "text-corpse", label: "text\ncorpse" },
  { route: "resume", label: "résumé" },
  { route: "about", label: "About" },
];

const Home = () => {
  return (
    <div className="home">
      <div className="home-intro">
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
            className="mobile-btn animate-in"
          >
            <span className="mobile-btn-content">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;

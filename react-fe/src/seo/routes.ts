/**
 * Single source of truth for the site's crawlable surface.
 *
 * Consumed by:
 *  - `SeoManager` (browser: keeps <head> correct as the user navigates)
 *  - `entry-server.tsx` + `scripts/prerender.mjs` (build: emits real
 *    `dist/<route>/index.html` files and `dist/sitemap.xml`)
 *
 * Adding a route? Add it here *and* in `App.tsx`. `scripts/prerender.mjs`
 * fails the build if the two lists drift.
 */

export interface RouteSeo {
  /** Absolute path, no trailing slash (except the root). */
  path: string;
  title: string;
  description: string;
  /** `prerender` renders the route to HTML at build time; `shell` emits the
   *  SPA shell with route-specific metadata (used for socket-driven pages). */
  render: "prerender" | "shell";
  /** Reachable by URL but never crawled: the route is served with a `noindex`
   *  robots tag and left out of `sitemap.xml` (scratch pages, previews). */
  noindex?: boolean;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
}

export const SITE = {
  url: "https://antigogglin.org",
  name: "Antigogglin",
  author: "Brendan O'Keefe",
  locale: "en_US",
  twitterCard: "summary_large_image",
  /** 1200x630, generated into `public/og-image.jpg`. */
  ogImage: "/og-image.jpg",
  ogImageAlt:
    "A woven grey pattern with a lavender-to-brown gradient, the Antigogglin.org background texture",
} as const;

export const ROUTES: RouteSeo[] = [
  {
    path: "/",
    title: "Antigogglin — Brendan O'Keefe's projects, music and experiments",
    description:
      "Brendan O'Keefe's personal site: a collaborative exquisite-corpse drawing app, a slowdown playlist generator, a lunch-ordering app, and the music of The Claimjumpers, Ginseng and Cuticle.",
    render: "prerender",
    changefreq: "monthly",
    priority: "1.0",
  },
  {
    path: "/about",
    title: "About Brendan O'Keefe — Antigogglin",
    description:
      "Software developer in the Pacific Northwest who likes shortening the barriers to talking to each other. Guitar, hiking, fermenting, and a solar-powered dev setup.",
    render: "prerender",
    changefreq: "yearly",
    priority: "0.8",
  },
  {
    path: "/resume",
    title: "Brendan O'Keefe — Résumé",
    description:
      "Résumé of Brendan O'Keefe: full-stack software developer working in TypeScript, Node, React and NestJS, with a focus on approachable, uncomplicated systems.",
    render: "prerender",
    changefreq: "monthly",
    priority: "0.9",
  },
  {
    path: "/music",
    title: "Music — The Claimjumpers, Ginseng, Cuticle",
    description:
      "Records and playlists by Brendan O'Keefe: The Claimjumpers, Ginseng (2011-2013) and Cuticle (2009-2015), plus a long-running Spotify playlist.",
    render: "prerender",
    changefreq: "yearly",
    priority: "0.7",
  },
  {
    path: "/claimjumpers",
    title: "The Claimjumpers — album player",
    description:
      "Stream The Claimjumpers album straight from the browser, with the front and back cover art.",
    render: "prerender",
    changefreq: "yearly",
    priority: "0.6",
  },
  {
    path: "/claimjumpers-back",
    title: "Claimjumpers — back cover (scratch)",
    description:
      "Scratch page for the Claimjumpers back cover. Unlinked and not indexed.",
    render: "shell",
    noindex: true,
  },
  {
    path: "/planting-calendar",
    title: "Denver Planting Calendar — start seeds, transplant, direct sow",
    description:
      "A month, week and day view of when to start seeds indoors, transplant, direct sow and make the last planting date for the Denver area (Englewood, Colorado) — colour-coded by chore, with one-tap export to Google Calendar.",
    render: "shell",
    changefreq: "weekly",
    priority: "0.7",
  },
  {
    path: "/recipes",
    title: "Recipes from the garden — cook what you already have",
    description:
      "Tick off what is in the house and see which recipes you can cook right now, plus the ones that are one ingredient short. The garden list comes from the Denver planting calendar.",
    render: "shell",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/slomo",
    title: "Slo Mo World — chopped and screwed playlist generator",
    description:
      "Generate randomized slow-motion playlists from a library of genres, inspired by the chopped, the screwed and the great DJ Screw.",
    render: "shell",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/lunch",
    title: "Lunch App — pick a place together",
    description:
      "A tiny realtime app for deciding where to eat: create a room, share the code, and everyone votes on lunch.",
    render: "shell",
    changefreq: "yearly",
    priority: "0.5",
  },
  {
    path: "/text-corpse",
    title: "Text Corpse — collaborative exquisite corpse drawing",
    description:
      "Draw an exquisite corpse with friends in realtime: each person folds the paper over before passing it on, then the finished creature is revealed.",
    render: "shell",
    changefreq: "monthly",
    priority: "0.7",
  },
];

/**
 * Routes that exist but must never be indexed: user-generated room codes are
 * an infinite URL space, so crawling them only burns crawl budget.
 *
 * Declared as paths (not regexes) so `scripts/prerender.mjs` can diff them
 * against the `<Route path>` list in `App.tsx`.
 */
export const DYNAMIC_ROUTES = ["/room/:roomId", "/text-corpse/:roomId"];

const toRegExp = (pattern: string) =>
  new RegExp(
    `^${pattern
      .split("/")
      .map((segment) => (segment.startsWith(":") ? "[^/]+" : segment))
      .join("/")}$`,
  );

const NOINDEX_PATTERNS: RegExp[] = DYNAMIC_ROUTES.map(toRegExp);

const NOT_FOUND_SEO: RouteSeo = {
  path: "/404",
  title: "Page not found — Antigogglin",
  description: "That page does not exist. Head back to the home page.",
  render: "shell",
};

const normalize = (pathname: string) => {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
};

/** Resolve the metadata for a pathname, for both the browser and the build. */
export function resolveSeo(pathname: string): RouteSeo & { noindex: boolean } {
  const path = normalize(pathname);

  if (NOINDEX_PATTERNS.some((pattern) => pattern.test(path))) {
    return {
      ...NOT_FOUND_SEO,
      path,
      title: "Live room — Antigogglin",
      description:
        "A live collaborative room. Rooms are temporary and are not indexed.",
      noindex: true,
    };
  }

  const match = ROUTES.find((route) => route.path === path);
  return {
    ...(match ?? NOT_FOUND_SEO),
    noindex: !match || match.noindex === true,
  };
}

/** Absolute URL for a route path (canonical tags, sitemap, og:url). */
export const absoluteUrl = (path: string) =>
  `${SITE.url}${path === "/" ? "/" : path}`;

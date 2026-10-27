#!/usr/bin/env node
/**
 * Build-time prerenderer + sitemap generator.
 *
 * Run by `npm run build` after the client build:
 *   1. bundles `src/entry-server.tsx` with `vite build --ssr`
 *   2. renders every route in `src/seo/routes.ts` to HTML
 *   3. writes `dist/<route>/index.html` (real files, so unknown URLs can 404
 *      instead of returning a 200 shell) with per-route <head> metadata
 *   4. writes `dist/sitemap.xml` and `dist/404.html`
 *
 * Routes marked `render: "shell"` get the SPA shell plus their own metadata —
 * used for pages that talk to socket.io or the audio APIs at module scope.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const ssrDir = path.join(root, "dist-ssr");

const SEO_BLOCK =
  /<meta name="seo:start"[^>]*>[\s\S]*?<meta name="seo:end"[^>]*>/;
const ROOT_CONTAINER = '<div id="root"></div>';

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const headTags = (seo, site, absoluteUrl) => {
  const url = absoluteUrl(seo.path);
  const image = absoluteUrl(site.ogImage);
  const robots = seo.noindex ? "noindex, nofollow" : "index, follow";

  return `<title>${esc(seo.title)}</title>
    <meta name="description" content="${esc(seo.description)}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(site.name)}" />
    <meta property="og:locale" content="${esc(site.locale)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(seo.title)}" />
    <meta property="og:description" content="${esc(seo.description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(site.ogImageAlt)}" />
    <meta name="twitter:card" content="${esc(site.twitterCard)}" />
    <meta name="twitter:title" content="${esc(seo.title)}" />
    <meta name="twitter:description" content="${esc(seo.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />`;
};

/** Fail fast if `App.tsx` and `seo/routes.ts` disagree. */
const assertRoutesInSync = async (routes, dynamicRoutes) => {
  const appSource = await readFile(path.join(root, "src/App.tsx"), "utf8");
  // Ignore routes that are commented out (e.g. the disabled `/backup` route).
  const activeSource = appSource.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  const appPaths = [...activeSource.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((routePath) => routePath !== "*");

  const declared = new Set([...routes.map((r) => r.path), ...dynamicRoutes]);
  const missing = appPaths.filter((routePath) => !declared.has(routePath));
  const unrendered = [...declared].filter((routePath) => !appPaths.includes(routePath));

  if (missing.length || unrendered.length) {
    throw new Error(
      [
        "Route definitions are out of sync between src/App.tsx and src/seo/routes.ts:",
        missing.length ? `  in App.tsx only: ${missing.join(", ")}` : "",
        unrendered.length ? `  in routes.ts only: ${unrendered.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
};


const sitemap = (routes, absoluteUrl, today) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map((route) =>
      [
        "  <url>",
        `    <loc>${esc(absoluteUrl(route.path))}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        route.changefreq ? `    <changefreq>${route.changefreq}</changefreq>` : "",
        route.priority ? `    <priority>${route.priority}</priority>` : "",
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "</urlset>",
    "",
  ].join("\n");

async function main() {
  console.log("[prerender] bundling SSR entry …");
  await build({
    root,
    logLevel: "warn",
    build: {
      ssr: "src/entry-server.tsx",
      outDir: "dist-ssr",
      emptyOutDir: true,
      rollupOptions: {
        output: { entryFileNames: "entry-server.mjs", format: "es" },
      },
    },
    // Bundle dependencies instead of externalizing them: MUI's ESM build uses
    // directory imports (`@mui/material/utils`) that Node's ESM resolver
    // rejects, so the graph has to be flattened by Rollup.
    ssr: { noExternal: true },
  });

  const entry = await import(
    pathToFileURL(path.join(ssrDir, "entry-server.mjs")).href
  );
  const { ROUTES, SITE, DYNAMIC_ROUTES, render, absoluteUrl } = entry;

  await assertRoutesInSync(ROUTES, DYNAMIC_ROUTES);

  // Read the client-built shell first: "/" overwrites dist/index.html.
  const template = await readFile(path.join(dist, "index.html"), "utf8");
  if (!SEO_BLOCK.test(template)) {
    throw new Error(
      "dist/index.html has no <!-- SEO:START --> / <!-- SEO:END --> markers; check react-fe/index.html",
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const results = [];

  for (const route of ROUTES) {
    // `noindex` routes still get their own `dist/<route>/index.html` (the URL
    // has to resolve instead of 404ing) but are tagged noindex and skipped in
    // the sitemap below.
    const seo = { ...route, noindex: route.noindex === true };
    let html = template.replace(SEO_BLOCK, headTags(seo, SITE, absoluteUrl));
    let mode = "shell";

    if (route.render === "prerender") {
      try {
        const rendered = render(route.path);
        html = html
          .replace(ROOT_CONTAINER, `<div id="root">${rendered.html}</div>`)
          .replace("</head>", `${rendered.styles}\n  </head>`);
        mode = "prerendered";
      } catch (error) {
        throw new Error(
          `Failed to prerender ${route.path}: ${error.message}\n` +
            'Set `render: "shell"` for that route in src/seo/routes.ts if it cannot run without a browser.',
          { cause: error },
        );
      }
    }

    const outFile =
      route.path === "/"
        ? path.join(dist, "index.html")
        : path.join(dist, route.path, "index.html");
    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, html, "utf8");
    results.push({ path: route.path, mode });
  }

  // A real 404 document, served by Express/nginx for unknown URLs.
  const notFound = {
    path: "/404",
    title: "Page not found — Antigogglin",
    description: "That page does not exist. Head back to the home page.",
    noindex: true,
  };
  await writeFile(
    path.join(dist, "404.html"),
    template.replace(SEO_BLOCK, headTags(notFound, SITE, absoluteUrl)),
    "utf8",
  );

  await writeFile(
    path.join(dist, "sitemap.xml"),
    sitemap(
      ROUTES.filter((route) => !route.noindex),
      absoluteUrl,
      today,
    ),
    "utf8",
  );

  await rm(ssrDir, { recursive: true, force: true });

  for (const result of results) {
    console.log(`[prerender] ${result.path.padEnd(16)} ${result.mode}`);
  }
  console.log(
    `[prerender] wrote dist/sitemap.xml, dist/404.html (lastmod ${today})`,
  );
}

main().catch((error) => {
  console.error("[prerender]", error.message ?? error);
  process.exit(1);
});

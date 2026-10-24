/**
 * Build-time render entry.
 *
 * `npm run build` runs the normal client build first, then
 * `scripts/prerender.mjs` bundles this file (`vite build --ssr`) and calls
 * `render()` once per route so `dist/<route>/index.html` contains real markup
 * plus per-route metadata. Socket-driven pages fall back to a metadata-only
 * shell (see `render: "shell"` in `seo/routes.ts`).
 */
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import createEmotionServer from "@emotion/server/create-instance";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";

import { AppRoutes } from "./App";
import {
  DYNAMIC_ROUTES,
  ROUTES,
  SITE,
  absoluteUrl,
  resolveSeo,
} from "./seo/routes";

export { DYNAMIC_ROUTES, ROUTES, SITE, absoluteUrl, resolveSeo };

export interface RenderResult {
  html: string;
  /** Emotion (MUI) critical CSS for the rendered markup, as <style> tags. */
  styles: string;
}

export function render(url: string): RenderResult {
  const cache = createCache({ key: "mui", prepend: true });
  const { extractCriticalToChunks, constructStyleTagsFromChunks } =
    createEmotionServer(cache);

  const html = renderToString(
    <CacheProvider value={cache}>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </CacheProvider>,
  );

  const styles = constructStyleTagsFromChunks(extractCriticalToChunks(html));

  return { html, styles };
}

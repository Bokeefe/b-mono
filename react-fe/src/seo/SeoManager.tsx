import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE, absoluteUrl, resolveSeo } from "./routes";

/**
 * Keeps <head> in sync with the current route.
 *
 * The build-time defaults in `index.html` (and the prerendered
 * `dist/<route>/index.html` files) cover crawlers and social bots; this only
 * has to keep things right for client-side navigations, so titles in history,
 * bookmarks and JS-capable crawlers stay unique per route.
 */

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setLink = (rel: string, href: string) => {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
};

const SeoManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveSeo(pathname);
    const url = absoluteUrl(seo.path);

    document.title = seo.title;
    setMeta("name", "description", seo.description);
    setMeta("name", "robots", seo.noindex ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE.name);
    setMeta("property", "og:locale", SITE.locale);
    setMeta("property", "og:image", absoluteUrl(SITE.ogImage));
    setMeta("property", "og:image:alt", SITE.ogImageAlt);
    setMeta("name", "twitter:card", SITE.twitterCard);
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", absoluteUrl(SITE.ogImage));
    setLink("canonical", url);
  }, [pathname]);

  return null;
};

export default SeoManager;

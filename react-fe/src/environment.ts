/* eslint-disable @typescript-eslint/no-explicit-any */
interface Environment {
  api: {
    url: string;
    port?: number;
  };
}

const development: Environment = {
  api: {
    url: "http://10.210.155.132", // Use computer's IP for phone testing
    port: 4171,
  },
};

const production: Environment = {
  // `window` is unavailable during the build-time prerender, so guard it: this
  // module is evaluated by both the browser bundle and the SSR entry.
  api: {
    url: typeof window === "undefined" ? "" : window.location.origin,
  },
};

export const env: Environment =
  typeof import.meta !== "undefined" &&
  (import.meta as any).env?.MODE === "production"
    ? production
    : development;

export const baseUrl = `${env.api.url}${env.api.port ? `:${env.api.port}` : ""}`;

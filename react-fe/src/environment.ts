/* eslint-disable @typescript-eslint/no-explicit-any */
interface Environment {
  api: {
    url: string;
    port?: number;
  };
}

const development: Environment = {
  api: {
    url: "http://localhost",
    port: 4171,
  },
};

const production: Environment = {
  api: {
    url: window.location.origin,
  },
};

export const env: Environment =
  typeof import.meta !== "undefined" &&
  (import.meta as any).env?.MODE === "production"
    ? production
    : development;

export const baseUrl = `${env.api.url}${env.api.port ? `:${env.api.port}` : ""}`;

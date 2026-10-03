# Dev & Deploy

## Local development

Prereqs: Node.js (repo devs on 20/24; Docker pins 20), npm.

```bash
# install root + nest-server + react-fe
npm run install:all
# build shared types (needed before frontend type-checks)
cd models && npm run build && cd ..

# both services
npm run dev              # concurrently: backend (:4171) + frontend (:5173)
# or individually
npm run dev:backend      # cd nest-server && npm run start:dev  (watch)
npm run dev:frontend     # cd react-fe && npm run dev           (Vite)
npm run build            # builds backend then frontend
npm run start            # run backend production build
npm run docker:test      # docker build + run locally on 4171 & 80
```

### Ports & URLs
| Service | Port | URL |
|---------|------|-----|
| Backend | 4171 | http://localhost:4171 |
| API base (dev) | 4171 | http://localhost:4171/api |
| Health | 4171 | http://localhost:4171/api/health |
| Frontend (Vite) | 5173 | http://localhost:5173 |

### Tests
- Backend: `cd nest-server && npm test` (jest; `.spec.ts` under `src/`, plus
  `test/` e2e via `npm run test:e2e`).
- Frontend: `cd react-fe && npm test` (jest; jsdom).

## Environment config

`react-fe/src/environment.ts` chooses dev vs prod by `import.meta.env.MODE`:
- **dev**: `api.url = "http://10.210.155.132"`, `port = 4171` (a hardcoded LAN IP
  for phone testing — **change to `http://localhost` for your machine**).
- **prod**: `api.url = window.location.origin` (same origin; nginx proxies).
- Exported `baseUrl` = `url(:port)` and is used by all services and sockets.

Backend env vars:
- `NODE_ENV=production` — switches `TextCorpseService` to the persistent data dir
  and (via Nest) production behavior.
- `TEXT_CORPSE_DATA_DIR` — override the text-corpse data directory.
- `UNIVERSAL_CELL_UNLOCK` — password required by `GET /backup`.

## Docker

The **root `Dockerfile`** is the one used for deployment (multi-stage):
1. build stage `node:20`: builds `models` → `nest-server` → `react-fe`.
2. prod stage `node:20-alpine`: installs **nginx + certbot**, copies the backend
   `dist` + prod deps, copies the frontend `dist`, writes an nginx config that
   serves the SPA and proxies `/api/` and `/socket.io` to `localhost:4171`,
   and runs `startup.sh`.

`startup.sh` (copied into image, overridable at runtime): creates
`/usr/src/app/data`, starts `node dist/main.js` in the background, waits ~3s,
then runs `certbot` if certs are missing, then `nginx -g "daemon off;"`.

> `react-fe/Dockerfile` and `nest-server/Dockerfile` also exist but are
> **standalone/legacy** (simple `serve` / `node dist/main.js` images). The
> root Dockerfile is authoritative for CI/CD.

## CI/CD (GitHub Actions)

- **`ci.yml`** ("CI Pipeline"): on push to `main`, `feature/new`, `feature/fix`
  → `docker login`, `docker build -t <DOCKER_USERNAME>/b-mono-image:latest .`,
  `docker push`.
- **`cd.yml`** ("CD Pipeline"): triggers on completion of "CI Pipeline", when
  branch is `main`/`develop`/`feature/*` → SSH to the droplet and:
  prune Docker, pull `b-mono-image:latest`, remove old container, recreate it
  with the production `docker run` (ports 80/443/4171, env `DOMAIN`, volume
  mounts for SSL certs, nginx config override, startup override, and
  `/root/text-corpse-data:/usr/src/app/data`).

Required GitHub secrets: `SSH_PRIVATE_KEY`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`.

## Production infrastructure (see `DEPLOYMENT.local.md`, not git-tracked)

- DigitalOcean droplet `b-mono-new` (137.184.190.9), Ubuntu, 512MB.
- Domain `antigogglin.org` (DNS on DigitalOcean, behind **Cloudflare**).
- Docker Hub image `bokeefe96/b-mono-image:latest`.
- TLS certs at `/etc/ssl/antigogglin/{public,private}.pem` (Let's Encrypt).
- Persistent text-corpse data on host at `/root/text-corpse-data`.

Manual redeploy on the droplet:
```bash
docker pull bokeefe96/b-mono-image:latest
docker rm -f b-mono || true
mkdir -p /root/text-corpse-data
docker run -d --name b-mono --restart unless-stopped \
  -e DOMAIN=antigogglin.org -p 80:80 -p 443:443 -p 4171:4171 \
  -v /etc/ssl/antigogglin:/etc/ssl/antigogglin:ro \
  -v /root/b-mono-default.conf:/etc/nginx/http.d/default.conf:ro \
  -v /root/startup-no-certbot.sh:/usr/src/app/startup.sh:ro \
  -v /root/text-corpse-data:/usr/src/app/data \
  bokeefe96/b-mono-image:latest
```

Deployment troubleshooting history: `PIPELINE_ISSUES.md` (append-only).

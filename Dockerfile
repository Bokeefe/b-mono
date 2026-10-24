# Stage 1: Build
FROM node:26.12.1 AS build

# Build Models first
WORKDIR /usr/src/app/models
COPY ./models ./
RUN npm install -g typescript
RUN npm install
RUN npm run build

# Build Backend
WORKDIR /usr/src/app/nest-server
COPY ./nest-server/package*.json ./
RUN npm install
COPY ./nest-server ./
RUN npm run build

# Build Frontend
WORKDIR /usr/src/app/react-fe
COPY ./react-fe/package*.json ./
RUN npm install
COPY ./react-fe ./
RUN npm run build

# Stage 2: Production
FROM node:26.12.1-alpine

# Install nginx and certbot
RUN apk add --no-cache nginx certbot

WORKDIR /usr/src/app

# Create persistent data directory (outside git-tracked files)
# This directory will persist across deployments when using Docker volumes
RUN mkdir -p /usr/src/app/data && chmod 755 /usr/src/app/data

# Copy backend build and dependencies
COPY --from=build /usr/src/app/nest-server/dist ./nest-server/dist
COPY --from=build /usr/src/app/nest-server/package*.json ./nest-server/
RUN cd nest-server && npm ci --omit=dev

# Copy runtime static assets (claimjumpers mp3s served from /audio/...)
COPY --from=build /usr/src/app/nest-server/public ./nest-server/public

# Copy frontend build
COPY --from=build /usr/src/app/react-fe/dist ./react-fe/dist

# Create the nginx config: TLS, canonical-host redirect, compression, caching,
# prerendered HTML + real 404s, and the API/socket proxies.
RUN cat > /etc/nginx/http.d/default.conf <<'NGINX'
map $http_upgrade $connection_upgrade {
    default upgrade;
    "" close;
}

# Plain HTTP only exists to redirect. (Certificates are issued by
# startup.sh with `certbot --standalone` before nginx starts.)
server {
    listen 80;
    server_name antigogglin.org www.antigogglin.org;
    return 301 https://antigogglin.org$request_uri;
}

# One canonical host: www splits ranking signals and breaks canonical URLs.
server {
    listen 443 ssl;
    server_name www.antigogglin.org;
    ssl_certificate /etc/ssl/antigogglin/public.pem;
    ssl_certificate_key /etc/ssl/antigogglin/private.pem;
    return 301 https://antigogglin.org$request_uri;
}

server {
    listen 443 ssl;
    server_name antigogglin.org;

    ssl_certificate /etc/ssl/antigogglin/public.pem;
    ssl_certificate_key /etc/ssl/antigogglin/private.pem;

    root /usr/src/app/react-fe/dist;
    index index.html;

    # Core Web Vitals: the JS bundle compresses roughly 4x.
    gzip on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_vary on;
    gzip_types text/plain text/css text/xml application/javascript
               application/json application/xml image/svg+xml;

    # Vite emits content-hashed filenames here: cache them forever.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Live rooms are user-generated and endless: serve the SPA shell, never index.
    location ~ ^/(room|text-corpse)/[^/]+/?$ {
        add_header X-Robots-Tag "noindex, nofollow" always;
        try_files /index.html =404;
    }

    # Prerendered routes exist as dist/<route>/index.html; unknown URLs are real
    # 404s instead of a 200 shell (which search engines treat as soft 404s).
    location / {
        try_files $uri $uri/index.html $uri.html =404;
    }

    location = /404.html {
        internal;
    }

    error_page 404 /404.html;

    location /api/ {
        proxy_pass http://localhost:4171;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://localhost:4171;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINX

# Copy startup script
COPY startup.sh .
RUN chmod +x startup.sh

# Expose ports
EXPOSE 80 443 4171

# Use the startup script
CMD ["./startup.sh"]

# faux push
# Stage 1: Build
FROM node:20 AS build

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
FROM node:20-alpine

# Install nginx and certbot
RUN apk add --no-cache nginx certbot

WORKDIR /usr/src/app

# Create persistent data directory (outside git-tracked files)
# This directory will persist across deployments when using Docker volumes
RUN mkdir -p /usr/src/app/data && chmod 755 /usr/src/app/data

# Copy backend build and dependencies
COPY --from=build /usr/src/app/nest-server/dist ./nest-server/dist
COPY --from=build /usr/src/app/nest-server/package*.json ./nest-server/
RUN cd nest-server && npm install --production

# Copy frontend build
COPY --from=build /usr/src/app/react-fe/dist ./react-fe/dist

# Create nginx config with map for WebSocket connections
RUN echo 'map $http_upgrade $connection_upgrade { \
    default upgrade; \
    "" close; \
} \
server { \
    listen 80; \
    server_name antigogglin.org www.antigogglin.org; \
    location / { \
        root /usr/src/app/react-fe/dist; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://localhost:4171; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location /socket.io { \
        proxy_pass http://localhost:4171; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection $connection_upgrade; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_set_header X-Forwarded-Host $host; \
        proxy_buffering off; \
        proxy_read_timeout 86400; \
        proxy_send_timeout 86400; \
    } \
} \
server { \
    listen 443 ssl; \
    server_name antigogglin.org www.antigogglin.org; \
    ssl_certificate /etc/ssl/antigogglin/public.pem; \
    ssl_certificate_key /etc/ssl/antigogglin/private.pem; \
    location / { \
        root /usr/src/app/react-fe/dist; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://localhost:4171; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location /socket.io { \
        proxy_pass http://localhost:4171; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection $connection_upgrade; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_set_header X-Forwarded-Host $host; \
        proxy_buffering off; \
        proxy_read_timeout 86400; \
        proxy_send_timeout 86400; \
    } \
}' > /etc/nginx/http.d/default.conf

# Copy startup script
COPY startup.sh .
RUN chmod +x startup.sh

# Expose ports
EXPOSE 80 443 4171

# Use the startup script
CMD ["./startup.sh"]

# faux push
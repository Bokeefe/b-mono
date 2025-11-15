# Stage 1: Build
FROM node:20 as build

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

# Copy backend build and dependencies
COPY --from=build /usr/src/app/nest-server/dist ./nest-server/dist
COPY --from=build /usr/src/app/nest-server/package*.json ./nest-server/
RUN cd nest-server && npm install --production

# Copy frontend build
COPY --from=build /usr/src/app/react-fe/dist ./react-fe/dist

# Create nginx config
RUN echo 'server { \
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
    location /socket.io/ { \
        proxy_pass http://localhost:4171; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
} \
server { \
    listen 443 ssl; \
    server_name antigogglin.org www.antigogglin.org; \
    ssl_certificate /etc/antigogglin/antigogglin.org/fullchain.pem; \
    ssl_certificate_key /etc/antigogglin/antigogglin.org/privkey.pem; \
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
    location /socket.io/ { \
        proxy_pass http://localhost:4171; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
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
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

# Ensure nginx http.d directory exists. Nginx config will be generated at container start
RUN mkdir -p /etc/nginx/http.d

# Copy startup script
COPY startup.sh .
RUN chmod +x startup.sh

# Expose ports
EXPOSE 80 443 4171

# Use the startup script
CMD ["./startup.sh"]

# faux push
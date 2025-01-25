# Stage 1: Build
FROM node:20 as build

# Add MySQL client (using apt for Debian)
RUN apt-get update && apt-get install -y default-mysql-client netcat-openbsd && rm -rf /var/lib/apt/lists/*

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

WORKDIR /usr/src/app

# Copy backend build, dependencies, and migrations
COPY --from=build /usr/src/app/nest-server/dist ./nest-server/dist
COPY --from=build /usr/src/app/nest-server/package*.json ./nest-server/
COPY --from=build /usr/src/app/nest-server/src/migrations ./nest-server/src/migrations
COPY --from=build /usr/src/app/nest-server/src/data-source.ts ./nest-server/src/
RUN cd nest-server && npm install --production

# Copy frontend build
COPY --from=build /usr/src/app/react-fe/dist ./react-fe/dist

# Install serve and netcat
RUN apk add --no-cache mysql-client netcat-openbsd

# Install TypeScript and ts-node for migrations
RUN cd nest-server && npm install typescript ts-node @types/node

# Install serve
RUN npm install -g serve

# Copy startup script
COPY startup.sh .
RUN chmod +x startup.sh

# Environment variables
ENV DB_HOST=${DB_HOST}
ENV DB_PORT=${DB_PORT}
ENV DB_USERNAME=${DB_USERNAME}
ENV DB_PASSWORD=${DB_PASSWORD}
ENV DB_DATABASE=${DB_DATABASE}

# Expose ports
EXPOSE 80 4171

# Use the startup script
CMD ["./startup.sh"]
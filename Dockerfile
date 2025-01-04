# Stage 1: Build the application using Node.js base image
FROM node:alpine as build

# Set the working directory for the backend
WORKDIR /usr/src/app/nest-server

# Copy and install backend dependencies
COPY ./nest-server/package*.json ./
RUN npm install

# Copy the rest of the backend application files
COPY ./nest-server ./

# Build the NestJS application
RUN npm run build

# Set the working directory for the frontend
WORKDIR /usr/src/app/react-fe

# Install frontend dependencies
COPY ./react-fe/package*.json ./
RUN npm install

# Copy the rest of the frontend application files
COPY ./react-fe ./

# Build the React app
RUN npm run build

# Stage 2: Production stage
FROM node:alpine

# Copy built backend
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/nest-server/dist ./dist
COPY --from=build /usr/src/app/nest-server/package*.json ./
COPY --from=build /usr/src/app/react-fe/dist ./public

RUN npm ci --only=production

EXPOSE 4171  

CMD ["serve", "-s", "dist", "-l", "4171"]
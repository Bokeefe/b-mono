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

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the built artifacts from the build stage
COPY --from=build /usr/src/app/react-fe/dist /usr/share/nginx/html/

# Expose the port Nginx will run on
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
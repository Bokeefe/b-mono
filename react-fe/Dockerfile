# react-fe/Dockerfile
FROM node:20 as build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY ./react-fe/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY ./react-fe ./

# Build the React application
RUN npm run build

RUN ls -l /usr/src/app/react-fe/dist

# Start a production server to serve the React app
FROM nginx:alpine

# Copy build files from the previous stage
COPY --from=build /usr/src/app/react-fe/dist /usr/share/nginx/html

# Expose the port the app runs on
EXPOSE 80

# Start Nginx Service
CMD ["nginx", "-g", "daemon off;"]

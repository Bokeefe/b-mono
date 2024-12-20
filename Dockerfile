# Use the Node.js base image
FROM node:20.16.0

# Set the working directory for the backend first
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

# Move back to the main application working directory
WORKDIR /usr/src/app

RUN mkdir -p ./nest-server/public

# Optional: move frontend build artifacts to the backend's public directory
RUN cp -r ./react-fe/dist/* ./nest-server/public/

# Expose the port the NestJS server will run on
EXPOSE 3000

# Command to start the application
CMD ["node", "nest-server/dist/main.js"]
# 
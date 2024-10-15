# Start from the node base image
FROM node:20.11.0

# Set the working directory
WORKDIR /usr/src/app

# Copy dependencies files first to leverage Docker cache effectively
COPY ./nest-server/package*.json ./

# Install dependencies (as before)
RUN npm install --production  # or just 'npm install' if you need dev dependencies too

# Copy the rest of the application files
COPY ./nest-server ./

# Build the NestJS application (if needed)
RUN npm run build  # Make sure you have a build script defined in your package.json

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["node", "dist/main.js"]

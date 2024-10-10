# nest-server/Dockerfile
FROM node:20.11.0

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY ./nest-server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application files
COPY ./nest-server ./

# Build the NestJS application (if needed)
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["node", "dist/main.js"]

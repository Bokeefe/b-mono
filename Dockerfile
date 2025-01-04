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

# Install serve globally
RUN npm install -g serve

# Expose port 80
EXPOSE 80

# Start serve on port 80
CMD ["serve", "-s", "dist", "-l", "80"]
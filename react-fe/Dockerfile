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

# Install serve for static file serving
RUN npm install -g serve

COPY --from=build /usr/src/app/react-fe/dist ./react-fe/dist
COPY --from=build /usr/src/app/nest-server/dist ./nest-server/dist

# Expose the port the app runs on
EXPOSE 80
EXPOSE 4171

# Start serve with the build directory
CMD ["serve", "-s", "dist", "-l", "80"]
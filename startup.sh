#!/bin/sh

# Start the backend
cd /usr/src/app/nest-server && node dist/main.js &

# Start nginx in foreground (Docker needs a foreground process)
nginx -g "daemon off;"
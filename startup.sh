#!/bin/sh

# Start the backend
cd /usr/src/app/nest-server && node dist/main.js &

# Start nginx
nginx -g "daemon off;" &
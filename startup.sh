#!/bin/sh

# Start the backend
cd /usr/src/app/nest-server && node dist/main.js &

# Obtain SSL certificate if not already present
if [ ! -f /etc/letsencrypt/live/bverse.world/fullchain.pem ]; then
    echo "Obtaining SSL certificate..."
    certbot certonly --standalone -d bverse.world -d www.bverse.world --non-interactive --agree-tos --email admin@bverse.world
fi

# Start nginx in foreground (Docker needs a foreground process)
nginx -g "daemon off;"
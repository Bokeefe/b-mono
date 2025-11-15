#!/bin/sh

# Start the backend
cd /usr/src/app/nest-server && node dist/main.js &

# Obtain SSL certificate if not already present
if [ ! -f /etc/ssl/antigogglin/public.pem ]; then
    echo "Obtaining SSL certificate..."
    certbot certonly --standalone -d antigogglin.org -d www.antigogglin.org --non-interactive --agree-tos --email admin@antigogglin.org
fi

# Start nginx in foreground (Docker needs a foreground process)
nginx -g "daemon off;"
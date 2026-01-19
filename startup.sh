#!/bin/sh

# Create persistent data directory if it doesn't exist
mkdir -p /usr/src/app/data
chmod 755 /usr/src/app/data

# Start the backend
cd /usr/src/app/nest-server && node dist/main.js &
BACKEND_PID=$!

# Wait a moment for backend to start
echo "Waiting for backend to start..."
sleep 3

# Check if backend process is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ERROR: Backend process died!"
    exit 1
fi

echo "Backend started (PID: $BACKEND_PID)"

# Obtain SSL certificate if not already present
if [ ! -f /etc/ssl/antigogglin/public.pem ]; then
    echo "Obtaining SSL certificate..."
    certbot certonly --standalone -d antigogglin.org -d www.antigogglin.org --non-interactive --agree-tos --email admin@antigogglin.org
fi

# Start nginx in foreground (Docker needs a foreground process)
nginx -g "daemon off;"
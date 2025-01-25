#!/bin/sh
cd /usr/src/app/nest-server && node dist/main.js &
cd /usr/src/app && serve -s react-fe/dist -l 80

echo "Waiting for MySQL..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 1
done
echo "MySQL is up"

# Start the backend
cd nest-server && node dist/main.js &

# Start the frontend
serve -s react-fe/dist -l 80
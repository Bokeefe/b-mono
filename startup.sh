#!/bin/sh
cd /usr/src/app/nest-server && node dist/main.js &
cd /usr/src/app && serve -s react-fe/dist -l 80
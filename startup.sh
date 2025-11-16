#!/bin/sh
set -e

# Configuration via environment variables
# DOMAIN: primary domain (default: antigogglin.org)
# CERT_DIR: directory inside container where certs live (default: /etc/ssl/antigogglin)
# SKIP_CERTBOT: if "true" (default) the script will NOT attempt to run certbot

DOMAIN=${DOMAIN:-antigogglin.org}
CERT_DIR=${CERT_DIR:-/etc/ssl/antigogglin}
SKIP_CERTBOT=${SKIP_CERTBOT:-true}

# Start the backend
cd /usr/src/app/nest-server && node dist/main.js &

# Generate nginx config using runtime envs so container is flexible.
# Create a base HTTP server block first; append HTTPS block only if certs exist.
cat > /etc/nginx/http.d/default.conf <<NGINX_CONF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location / {
        root /usr/src/app/react-fe/dist;
        try_files \$uri \$uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:4171;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /socket.io/ {
        proxy_pass http://localhost:4171;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_CONF

# Helper to append HTTPS server block
append_https_block() {
  cat >> /etc/nginx/http.d/default.conf <<'HTTPS_BLOCK'
server {
    listen 443 ssl;
    server_name ${DOMAIN} www.${DOMAIN};
    ssl_certificate ${CERT_DIR}/public.pem;
    ssl_certificate_key ${CERT_DIR}/private.pem;
    location / {
        root /usr/src/app/react-fe/dist;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:4171;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /socket.io/ {
        proxy_pass http://localhost:4171;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
HTTPS_BLOCK
}

# Decide whether to configure HTTPS
if [ -f "${CERT_DIR}/public.pem" ] && [ -f "${CERT_DIR}/private.pem" ]; then
  echo "Using existing certs in ${CERT_DIR}; configuring HTTPS"
  append_https_block
else
  if [ "${SKIP_CERTBOT}" = "false" ] || [ "${SKIP_CERTBOT}" = "0" ]; then
    echo "Certs missing in ${CERT_DIR}; attempting certbot (SKIP_CERTBOT=${SKIP_CERTBOT})"
    certbot certonly --standalone -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos --email admin@${DOMAIN} || true
    if [ -f "${CERT_DIR}/public.pem" ] && [ -f "${CERT_DIR}/private.pem" ]; then
      echo "Certbot obtained certs; configuring HTTPS"
      append_https_block
    else
      echo "Certbot did not produce certs; continuing with HTTP only"
    fi
  else
    echo "Certs missing in ${CERT_DIR} and SKIP_CERTBOT=${SKIP_CERTBOT}; continuing with HTTP only"
  fi
fi

# If certs are missing and SKIP_CERTBOT is false, attempt to obtain certs
if [ ! -f "${CERT_DIR}/public.pem" ] || [ ! -f "${CERT_DIR}/private.pem" ]; then
    if [ "${SKIP_CERTBOT}" = "false" ] || [ "${SKIP_CERTBOT}" = "0" ]; then
        echo "Certs missing in ${CERT_DIR}; attempting certbot (SKIP_CERTBOT=${SKIP_CERTBOT})"
        certbot certonly --standalone -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos --email admin@${DOMAIN} || true
    else
        echo "Certs missing in ${CERT_DIR} and SKIP_CERTBOT=${SKIP_CERTBOT}; not attempting certbot"
    fi
else
    echo "Using existing certs in ${CERT_DIR}"
fi

# Start nginx in foreground (Docker needs a foreground process)
nginx -g "daemon off;"
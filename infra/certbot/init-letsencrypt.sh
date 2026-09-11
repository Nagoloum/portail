#!/usr/bin/env bash
# Bootstraps the first Let's Encrypt certificate for the edge nginx.
# Run once, from repo root, on the real server (never in local install.sh).
#
# Usage: infra/certbot/init-letsencrypt.sh
# Reads DOMAIN, CERTBOT_EMAIL, LETSENCRYPT_STAGING from .env.
#
# Why this dance: nginx refuses to start a `listen 443 ssl` server block
# with no certificate files on disk yet, and certbot's webroot challenge
# needs nginx already serving :80 to answer it. So: start with a
# throwaway self-signed cert just so nginx boots, request the real one
# through the now-running nginx, then reload nginx onto it.
set -euo pipefail
cd "$(dirname "$0")/../.."

set -a; source .env; set +a
: "${DOMAIN:?DOMAIN must be set in .env}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL must be set in .env}"

COMPOSE="docker compose --env-file .env -f infra/docker-compose.yml -f infra/docker-compose.edge.yml"
STAGING_FLAG=""
if [ "${LETSENCRYPT_STAGING:-true}" = "true" ]; then
  STAGING_FLAG="--staging"
  echo "==> Using Let's Encrypt STAGING (set LETSENCRYPT_STAGING=false in .env once this works end-to-end)"
fi

echo "==> Creating a throwaway self-signed certificate so nginx can boot..."
docker volume create portail_certbot_conf >/dev/null
docker volume create portail_certbot_www >/dev/null
docker run --rm -v portail_certbot_conf:/etc/letsencrypt -e DOMAIN="$DOMAIN" alpine:3.20 sh -c '
  set -e
  apk add --no-cache openssl >/dev/null
  mkdir -p "/etc/letsencrypt/live/$DOMAIN"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
    -out "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=$DOMAIN"
'

echo "==> Starting edge + frontend..."
$COMPOSE up -d frontend edge

# nginx has the dummy files open already, so removing them now is safe - and
# necessary: certbot refuses to overwrite an existing live/ directory it did
# not create, and would silently write the real cert to live/$DOMAIN-0001,
# leaving nginx pinned to the self-signed one.
echo "==> Removing the throwaway certificate before requesting the real one..."
docker run --rm -v portail_certbot_conf:/etc/letsencrypt -e DOMAIN="$DOMAIN" alpine:3.20 \
  sh -c 'rm -rf "/etc/letsencrypt/live/$DOMAIN" "/etc/letsencrypt/archive/$DOMAIN" "/etc/letsencrypt/renewal/$DOMAIN.conf"'

echo "==> Requesting the real certificate from Let's Encrypt..."
$COMPOSE run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  $STAGING_FLAG \
  --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email \
  --force-renewal \
  -d "$DOMAIN"

echo "==> Reloading edge nginx onto the real certificate..."
$COMPOSE exec edge nginx -s reload

echo "==> Starting the certbot renewal loop..."
$COMPOSE up -d certbot

echo "Done. https://${DOMAIN} should now serve a $( [ -n "$STAGING_FLAG" ] && echo staging || echo production ) certificate."

#!/usr/bin/env bash
# Materialises infra/nginx/prometheus.htpasswd, the credential file the edge
# nginx uses to protect /prometheus/ (Prometheus has no authentication of
# its own - see README "Observabilite").
#
# The credentials themselves live in .env, next to every other secret:
#   PROMETHEUS_BASIC_AUTH_USER / PROMETHEUS_BASIC_AUTH_PASSWORD
# This script only turns them into the bcrypt file nginx can read, because
# auth_basic_user_file takes a path and not an environment variable - the
# one reason Prometheus needs a step that Grafana (GF_SECURITY_ADMIN_*)
# does not.
#
# Usage, from the exo2-portail-depot/ directory:
#   infra/nginx/generate-prometheus-htpasswd.sh            # from .env
#   infra/nginx/generate-prometheus-htpasswd.sh --force    # rotate: overwrite
#   infra/nginx/generate-prometheus-htpasswd.sh <user> <password>
#
# Uses the httpd image rather than requiring apache2-utils on the host: the
# servers this deploys to only reliably have docker. nginx:alpine validates
# bcrypt fine, despite musl's crypt() not supporting it - nginx implements
# the comparison itself.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
ENV_FILE="../../.env"
OUT="prometheus.htpasswd"

FORCE=0
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--force" ]]; then FORCE=1; else ARGS+=("$arg"); fi
done

USER="${ARGS[0]:-}"
PASSWORD="${ARGS[1]:-}"

if [[ -z "$USER" || -z "$PASSWORD" ]]; then
  [[ -f "$ENV_FILE" ]] || {
    echo "Erreur: $ENV_FILE introuvable. Lancez ./install.sh d'abord, ou passez <user> <password> en arguments." >&2
    exit 1
  }
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
  USER="${PROMETHEUS_BASIC_AUTH_USER:-prometheus}"
  PASSWORD="${PROMETHEUS_BASIC_AUTH_PASSWORD:-}"
fi

if [[ -z "$PASSWORD" || "$PASSWORD" == changeme-* ]]; then
  echo "Erreur: renseignez PROMETHEUS_BASIC_AUTH_PASSWORD dans .env (valeur reelle, pas le placeholder)." >&2
  exit 1
fi

if [[ -f "$OUT" && "$FORCE" -ne 1 ]]; then
  echo "$OUT existe deja. Relancez avec --force pour le regenerer depuis .env." >&2
  exit 1
fi

# -B = bcrypt (not the default MD5 crypt), -b = password as an argument,
# -n = write to stdout instead of a file inside the container.
docker run --rm httpd:2.4-alpine htpasswd -Bbn "$USER" "$PASSWORD" > "$OUT"

# 644, not 600: the file is bind-mounted into the edge container, where the
# nginx workers run as uid 101 and not as the host user who owns it. With
# 600 they get "open() ... failed (13: Permission denied)" and nginx answers
# 500 to every request on /prometheus/ - an authenticated caller included.
# What the file holds is a bcrypt hash, not the password.
chmod 644 "$OUT"

echo "$OUT genere pour l'utilisateur '$USER' (mot de passe lu depuis .env)."
echo "Appliquer : docker compose --env-file .env -f infra/docker-compose.yml -f infra/docker-compose.edge.yml up -d edge"

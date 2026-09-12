#!/usr/bin/env bash
# Creates infra/nginx/prometheus.htpasswd, the credential the edge nginx
# uses to protect /prometheus/ (Prometheus itself has no authentication).
#
# Run once on the target server, before bringing the edge overlay up:
#   infra/nginx/generate-prometheus-htpasswd.sh            # random password
#   infra/nginx/generate-prometheus-htpasswd.sh admin s3cr3t
#
# The generated file is gitignored. Uses the httpd image rather than
# requiring apache2-utils on the host - the servers this deploys to only
# reliably have docker.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

USER="${1:-prometheus}"
PASSWORD="${2:-}"

if [[ -z "$PASSWORD" ]]; then
  command -v openssl >/dev/null 2>&1 || { echo "openssl requis pour generer un mot de passe" >&2; exit 1; }
  PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
  GENERATED=1
fi

if [[ -f prometheus.htpasswd ]]; then
  echo "prometheus.htpasswd existe deja - supprimez-le d'abord pour le regenerer." >&2
  exit 1
fi

# -B = bcrypt (not the default MD5 crypt), -b = password on the command
# line, -n = write to stdout instead of a file inside the container.
docker run --rm httpd:2.4-alpine htpasswd -Bbn "$USER" "$PASSWORD" > prometheus.htpasswd
chmod 600 prometheus.htpasswd

echo "prometheus.htpasswd cree."
echo "  utilisateur : $USER"
if [[ -n "${GENERATED:-}" ]]; then
  echo "  mot de passe : $PASSWORD"
  echo "  (genere aleatoirement, notez-le : il n'est stocke que hashe)"
fi

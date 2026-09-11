#!/usr/bin/env bash
# One-click install: pulls the published images, starts the full stack
# (Postgres, MinIO, backend, frontend, Prometheus, Grafana, Alertmanager),
# waits for migrations + seed (run automatically by the backend container's
# entrypoint, see backend/entrypoint.sh) and prints the URLs to open.
#
# Usage:
#   ./install.sh            # pulls prebuilt images from GHCR (default)
#   ./install.sh --build    # builds backend/frontend from local source instead
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

COMPOSE_FILES=(-f infra/docker-compose.yml)
MODE="pull"
if [[ "${1:-}" == "--build" ]]; then
  MODE="build"
  COMPOSE_FILES+=(-f infra/docker-compose.override.local.yml)
fi

log() { printf '\n\033[1;35m==> %s\033[0m\n' "$1"; }
die() { printf '\033[1;31mErreur:\033[0m %s\n' "$1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker n'est pas installe. Voir https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || die "le plugin 'docker compose' n'est pas disponible (docker compose v2 requis)."
command -v openssl >/dev/null 2>&1 || die "openssl est requis pour generer les secrets par defaut."
command -v curl >/dev/null 2>&1 || die "curl est requis pour verifier le demarrage des services."

COMPOSE=(docker compose --env-file .env "${COMPOSE_FILES[@]}")

# --- 1. .env -----------------------------------------------------------------
if [[ ! -f .env ]]; then
  log "Aucun .env trouve, generation a partir de .env.example (secrets aleatoires)..."
  cp .env.example .env
  for key in DB_PASSWORD JWT_SECRET PIN_PEPPER MINIO_ROOT_PASSWORD GRAFANA_ADMIN_PASSWORD; do
    secret=$(openssl rand -hex 24)
    # portable in-place sed (works on both GNU and BSD/macOS sed)
    sed -i.bak "s/^${key}=.*/${key}=${secret}/" .env && rm -f .env.bak
  done
  echo "Fichier .env cree avec des secrets generes. Conservez-le, il n'est jamais commite (.gitignore)."
else
  log ".env existant detecte, reutilisation."
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

# --- 2. images -----------------------------------------------------------------
if [[ "$MODE" == "build" ]]; then
  log "Construction des images backend/frontend depuis les sources locales..."
  "${COMPOSE[@]}" build
else
  log "Recuperation des images publiees (ghcr.io/${GITHUB_OWNER:-nagoloum}/portail-*:${IMAGE_TAG:-latest})..."
  "${COMPOSE[@]}" pull postgres minio backend frontend prometheus alertmanager grafana
fi

# --- 3. stack, migrations, seed ------------------------------------------------
log "Demarrage de la stack (Postgres, MinIO, backend, frontend, Prometheus, Grafana, Alertmanager)..."
"${COMPOSE[@]}" up -d

log "Attente du backend (migrations puis seed s'executent automatiquement au demarrage du conteneur)..."
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT:-3000}/health"
for i in $(seq 1 60); do
  if curl -fsS "$BACKEND_URL" >/dev/null 2>&1; then
    echo "Backend pret (migrations + seed termines)."
    break
  fi
  if [[ "$i" == 60 ]]; then
    die "Le backend ne repond toujours pas apres 2 minutes. Voir: docker compose --env-file .env -f infra/docker-compose.yml logs backend"
  fi
  printf '.'
  sleep 2
done

log "Attente de Grafana (provisioning des dashboards et de la source de donnees)..."
GRAFANA_URL="http://127.0.0.1:${GRAFANA_PORT:-3001}/api/health"
for i in $(seq 1 30); do
  if curl -fsS "$GRAFANA_URL" >/dev/null 2>&1; then
    echo "Grafana pret."
    break
  fi
  printf '.'
  sleep 2
done

# --- 4. summary -----------------------------------------------------------------
log "Installation terminee."
cat <<EOF

  Application (avocat + depot)  http://localhost:${APP_HTTP_PORT:-8080}
  API backend                   http://localhost:${BACKEND_PORT:-3000}
  Grafana                       http://localhost:${GRAFANA_PORT:-3001}  (${GRAFANA_ADMIN_USER:-admin} / voir .env: GRAFANA_ADMIN_PASSWORD)
  Prometheus                    http://localhost:${PROMETHEUS_PORT:-9090}
  Alertmanager                  http://localhost:${ALERTMANAGER_PORT:-9093}

  Compte avocat de demonstration
    email    ${SEED_LAWYER_EMAIL:-avocat@demo.dev}
    password ${SEED_LAWYER_PASSWORD:-Demo1234!}

  Parcours client (anonyme) sur la demande seedee "Dossier Martin, pieces 2026"
    lien  http://localhost:${APP_HTTP_PORT:-8080}/d/${SEED_REQUEST_TOKEN:-8f3a2c1b4d5e6f70}
    PIN   1234  (4 pieces attendues)

  Arreter la stack : docker compose --env-file .env -f infra/docker-compose.yml down
  Voir les logs     : docker compose --env-file .env -f infra/docker-compose.yml logs -f

EOF

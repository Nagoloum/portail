COMPOSE = docker compose --env-file .env -f infra/docker-compose.yml

.PHONY: install build up down logs ps test seed verify

install: ## One-click install (pulls published images). See install.sh.
	./install.sh

build: ## One-click install, building images from local source instead.
	./install.sh --build

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

test: ## Backend unit tests (business logic: expiry, PIN, status transitions)
	cd backend && npm test

# Runs exactly what ../.github/workflows/ci.yml runs, locally. Actions is
# disabled on the account that owns this repo (see README, "Registre
# d'images"), so the pipeline cannot run on push; this target is the same
# sequence, reproducible on any machine.
verify: ## Same checks as the CI workflow: install, build and test both apps
	cd backend && npm ci && npm run build && npm test -- --ci
	cd frontend && npm ci && npm run build

seed: ## Re-run the (idempotent) demo data seed against a running stack
	$(COMPOSE) exec backend node dist/database/seeds/seed.js

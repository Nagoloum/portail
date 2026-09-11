COMPOSE = docker compose --env-file .env -f infra/docker-compose.yml

.PHONY: install build up down logs ps test seed

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

seed: ## Re-run the (idempotent) demo data seed against a running stack
	$(COMPOSE) exec backend node dist/database/seeds/seed.js

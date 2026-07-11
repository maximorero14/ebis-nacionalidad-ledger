GITLEAKS_VERSION := v8.30.1
BESU_VERSION := 26.6.1
COMPOSE_FILE := infra/compose.yaml

.PHONY: security secret-scan contracts-install contracts-build contracts-test contracts-coverage contracts-gas besu-generate up down logs network-status reset-demo

security: secret-scan

secret-scan:
	docker run --rm -v "$(PWD):/repo" ghcr.io/gitleaks/gitleaks:$(GITLEAKS_VERSION) detect --source /repo --config /repo/.gitleaks.toml --redact --no-banner

contracts-install:
	npm install

contracts-build:
	npm run build

contracts-test:
	npm test

contracts-coverage:
	npm run test:coverage

contracts-gas:
	npm run test:gas

besu-generate:
	BESU_VERSION=$(BESU_VERSION) ./scripts/besu-generate-network.sh

up: besu-generate
	docker compose -f $(COMPOSE_FILE) up -d

down:
	docker compose -f $(COMPOSE_FILE) down

logs:
	docker compose -f $(COMPOSE_FILE) logs -f --tail=200

network-status:
	./scripts/besu-network-status.sh

reset-demo:
	docker compose -f $(COMPOSE_FILE) down -v
	rm -rf blockchain/besu/generated
	BESU_VERSION=$(BESU_VERSION) ./scripts/besu-generate-network.sh
	docker compose -f $(COMPOSE_FILE) up -d

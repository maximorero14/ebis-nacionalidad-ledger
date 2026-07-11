GITLEAKS_VERSION := v8.30.1
BESU_VERSION := 26.6.1
COMPOSE_FILE := infra/compose.yaml

.PHONY: security secret-scan contracts-install contracts-build contracts-test contracts-coverage contracts-gas besu-generate up down logs network-status reset-demo deploy verify-deployment test-integration seed seed-verify

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
	@if [ "$$CONFIRM" != "RESET" ]; then \
		echo "=================================================================="; \
		echo " reset-demo WIPES ALL local Besu chain data and regenerates the"; \
		echo " network from scratch (new genesis, new validator keys, new"; \
		echo " contract addresses). This is the LOCAL DEVELOPMENT network only"; \
		echo " ($(COMPOSE_FILE), 127.0.0.1) — no production environment exists"; \
		echo " and this command cannot reach one."; \
		echo ""; \
		echo " Re-run explicitly to confirm: make reset-demo CONFIRM=RESET"; \
		echo "=================================================================="; \
		exit 1; \
	fi
	docker compose -f $(COMPOSE_FILE) down -v
	rm -rf blockchain/besu/generated
	BESU_VERSION=$(BESU_VERSION) ./scripts/besu-generate-network.sh
	docker compose -f $(COMPOSE_FILE) up -d

deploy:
	BESU_DEPLOYER_PRIVATE_KEY=$${BESU_DEPLOYER_PRIVATE_KEY:-$$(node scripts/print-dev-private-key.js 0)} \
		BESU_LOCAL_RPC_URL=$${BESU_LOCAL_RPC_URL:-http://127.0.0.1:8545} \
		npm run deploy

verify-deployment:
	BESU_LOCAL_RPC_URL=$${BESU_LOCAL_RPC_URL:-http://127.0.0.1:8545} \
		npm run verify-deployment

test-integration:
	BESU_LOCAL_RPC_URL=$${BESU_LOCAL_RPC_URL:-http://127.0.0.1:8545} \
		npm run test:integration

seed:
	BESU_LOCAL_RPC_URL=$${BESU_LOCAL_RPC_URL:-http://127.0.0.1:8545} \
		npm run seed

seed-verify:
	BESU_LOCAL_RPC_URL=$${BESU_LOCAL_RPC_URL:-http://127.0.0.1:8545} \
		npm run seed:verify

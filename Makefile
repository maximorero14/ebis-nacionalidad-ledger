GITLEAKS_VERSION := v8.30.1
BESU_VERSION := 26.6.1
COMPOSE_FILE := compose.yaml

ifneq ("$(wildcard .env)","")
include .env
export
endif

.PHONY: security secret-scan contracts-install contracts-build contracts-test contracts-coverage contracts-gas besu-generate demo-wallets docker-prune-build-cache up demo-simple demo-simple-clean-build demo-complete down clean-demo-state logs network-status reset-demo deploy verify-deployment test-integration seed-simple seed seed-verify

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

demo-wallets:
	node scripts/demo-wallets.js

docker-prune-build-cache:
	docker builder prune -f
	docker image prune -f

up: clean-demo-state besu-generate
	docker compose -f $(COMPOSE_FILE) up -d --build

demo-simple: up
	$(MAKE) verify-deployment
	$(MAKE) seed-simple
	@node scripts/demo-wallets.js

demo-simple-clean-build: docker-prune-build-cache demo-simple

demo-complete: demo-simple
	$(MAKE) seed
	$(MAKE) seed-verify

down: clean-demo-state

clean-demo-state:
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	rm -rf blockchain/besu/generated
	rm -rf generated/deployments

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
	$(MAKE) demo-complete

deploy:
	BESU_DEPLOYER_PRIVATE_KEY=$${BESU_DEPLOYER_PRIVATE_KEY:-$$(node scripts/print-dev-private-key.js 0)} \
		BESU_LOCAL_RPC_URL=$${BESU_LOCAL_RPC_URL:-http://127.0.0.1:8545} \
		npm run deploy

verify-deployment:
	docker compose -f $(COMPOSE_FILE) run --rm contracts npm run verify-deployment

test-integration:
	BESU_LOCAL_RPC_URL=$${BESU_LOCAL_RPC_URL:-http://127.0.0.1:8545} \
		npm run test:integration

seed:
	docker compose -f $(COMPOSE_FILE) run --rm contracts npm run seed

seed-simple:
	docker compose -f $(COMPOSE_FILE) run --rm contracts npm run seed:simple

seed-verify:
	docker compose -f $(COMPOSE_FILE) run --rm contracts npm run seed:verify

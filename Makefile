BESU_VERSION := 26.6.1
COMPOSE_FILE := compose.yaml

ifneq ("$(wildcard .env)","")
include .env
export
endif

.PHONY: besu-generate demo-wallets docker-prune-build-cache up demo-simple demo-simple-clean-build demo-complete down clean-demo-state logs verify-deployment seed-simple seed seed-verify

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

verify-deployment:
	docker compose -f $(COMPOSE_FILE) run --rm contracts npm run verify-deployment

seed:
	docker compose -f $(COMPOSE_FILE) run --rm contracts npm run seed

seed-simple:
	docker compose -f $(COMPOSE_FILE) run --rm contracts npm run seed:simple

seed-verify:
	docker compose -f $(COMPOSE_FILE) run --rm contracts npm run seed:verify

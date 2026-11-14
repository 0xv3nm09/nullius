# nullius — one obvious command per intent.
# `make check` is exactly what CI runs (.github/workflows/ci.yml).

.DEFAULT_GOAL := help
.PHONY: help install dev check test build verify verify-offline verify-chain snapshot serve tamper clean

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install exact pinned dependencies
	npm ci || npm install

dev: ## Run the console with hot reload
	npm run dev

check: ## Everything CI runs: tests, typecheck+build, offline verification
	npm run test
	npm run build
	npm run verify:offline

test: ## Unit tests (includes the import-graph guard)
	npm run test

build: ## Typecheck and build the static console into docs/
	npm run build

verify-offline: ## Recompute all 15 propositions from committed captures — no network, no keys
	npm run verify:offline

verify-chain: ## Check the provenance chain of the committed records only
	npm run verify:chain

verify: ## Re-fetch from NEAR mainnet, recompute, diff against the committed snapshot
	npm run verify

snapshot: ## Re-capture the sources and rebuild the snapshot (needs network)
	npm run snapshot

serve: build ## Build and serve the console exactly as GitHub Pages does
	npx serve docs

tamper: ## Demonstrate that the chain is load-bearing: break a value, watch it fail closed
	@cp data/snapshot.json /tmp/nullius-snapshot.bak
	@node -e "const f='data/snapshot.json',d=JSON.parse(require('fs').readFileSync(f));\
	console.log('tampering '+d.metrics[0].id+': '+d.metrics[0].value+' -> 12.0');\
	d.metrics[0].value=12;require('fs').writeFileSync(f,JSON.stringify(d))"
	@echo "--- npm run verify:chain (expect: chain broken at index 0, exit 1) ---"
	@npm run verify:chain; echo "exit=$$?"
	@cp /tmp/nullius-snapshot.bak data/snapshot.json
	@echo "--- snapshot restored ---"

clean: ## Remove build output and node_modules
	rm -rf node_modules docs/assets

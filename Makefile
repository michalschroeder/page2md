IMAGE ?= page2md
URL   ?=

BUN := docker run --rm -v "$(PWD)":/app -w /app oven/bun:1-slim

.DEFAULT_GOAL := help

.PHONY: help build run clean install dev lockfile test lint fmt actionlint tsc biome hadolint token-comparison

help: ## show this help
	@awk 'BEGIN{FS=":.*##"; printf "page2md — render any URL to clean Markdown\n\ntargets:\n"} \
		/^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2} \
		END{printf "\nvars: IMAGE=%s  URL=%s\n", "$(IMAGE)", "$(URL)"}' $(MAKEFILE_LIST)

build: ## build Docker image
	docker build -t $(IMAGE) .

run: ## run via Docker (URL=<url>)
	@test -n "$(URL)" || { echo "usage: make run URL=<url>"; exit 1; }
	docker run --rm $(IMAGE) $(URL)

clean: ## remove Docker image
	-docker rmi $(IMAGE)

install: ## local Bun deps + Playwright chromium-headless-shell
	bun install
	bunx playwright install chromium-headless-shell

dev: ## run locally without Docker (URL=<url>, needs Bun)
	@test -n "$(URL)" || { echo "usage: make dev URL=<url>"; exit 1; }
	bun index.ts $(URL)

lockfile: ## regenerate bun.lock via Docker (no host Bun needed)
	$(BUN) bun install

test: ## run snapshot tests
	$(BUN) bun test

actionlint: ## validate GitHub Actions workflows
	docker run --rm -v "$(PWD)":/repo -w /repo rhysd/actionlint:latest -color

tsc: ## type-check via tsc --noEmit
	$(BUN) sh -c "bun install --frozen-lockfile && bunx tsc --noEmit"

biome: ## lint + format check
	$(BUN) sh -c "bun install --frozen-lockfile && bunx biome ci ."

fmt: ## auto-format with Biome
	$(BUN) sh -c "bun install --frozen-lockfile && bunx biome check --write ."

hadolint: ## lint Dockerfile
	docker run --rm -v "$(PWD)":/repo -w /repo hadolint/hadolint:latest-alpine hadolint --failure-threshold warning Dockerfile

lint: actionlint tsc biome hadolint ## run all linters

TOKEN_CMP_RUN = docker run --init --rm \
	-v "$(PWD)/scripts":/app/scripts:ro \
	-v "$(PWD)/docs":/app/docs \
	-v "$(PWD)/README.md":/app/README.md \
	--entrypoint bun \
	$(IMAGE) /app/scripts/token-comparison.ts

token-comparison: build ## regenerate docs/token-comparison/ + README.md table
	mkdir -p docs/token-comparison
	$(TOKEN_CMP_RUN)

token-comparison-readme: build ## regenerate only the README.md table
	$(TOKEN_CMP_RUN) --readme-only

IMAGE ?= page2md
URL   ?=

.DEFAULT_GOAL := help

.PHONY: help build run clean install dev lockfile test lint

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
	docker run --rm -v "$(PWD)":/app -w /app oven/bun:1-slim bun install

test: ## run snapshot tests
	docker run --rm -v "$(PWD)":/app -w /app oven/bun:1-slim bun test

lint: ## validate GitHub Actions workflows with actionlint
	docker run --rm -v "$(PWD)":/repo -w /repo rhysd/actionlint:latest -color

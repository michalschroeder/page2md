FROM oven/bun:1-slim@sha256:7e8ed3961db1cdedf17d516dda87948cfedbd294f53bf16462e5b57ed3fff0f1

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY --chown=bun:bun package.json bun.lock ./

# ca-certificates is a meta-package; pinning is impractical.
# hadolint ignore=DL3008
RUN bun install --frozen-lockfile \
    && apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && bunx playwright install --with-deps chromium-headless-shell \
    && rm -rf /var/lib/apt/lists/* \
    && chown -R bun:bun /ms-playwright /app/node_modules

USER bun

COPY --chown=bun:bun index.ts ./index.ts
COPY --chown=bun:bun src ./src

ENTRYPOINT ["bun", "/app/index.ts"]

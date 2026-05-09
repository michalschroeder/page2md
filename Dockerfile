FROM oven/bun:1-slim

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY --chown=bun:bun package.json bun.lock ./

RUN bun install --frozen-lockfile \
    && apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && bunx playwright install --with-deps chromium-headless-shell \
    && rm -rf /var/lib/apt/lists/* \
    && chown -R bun:bun /ms-playwright /app/node_modules

USER bun

COPY --chown=bun:bun index.ts ./index.ts
COPY --chown=bun:bun src ./src

ENTRYPOINT ["bun", "/app/index.ts"]

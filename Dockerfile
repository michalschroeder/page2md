FROM oven/bun:1-slim@sha256:d56a2534ffd262e92c12fd3249d3924d296d97086da773f821d7d0477435ea04

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY --chown=bun:bun package.json bun.lock ./

# ca-certificates is a meta-package; pinning is impractical.
# apt-get upgrade picks up OS security patches not yet in the base image rebuild.
# hadolint ignore=DL3008,DL3005
RUN bun install --frozen-lockfile \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && bunx playwright install --with-deps chromium-headless-shell \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && chown -R bun:bun /ms-playwright /app/node_modules

USER bun

COPY --chown=bun:bun index.ts ./index.ts
COPY --chown=bun:bun src ./src

ENTRYPOINT ["bun", "/app/index.ts"]

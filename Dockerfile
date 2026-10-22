FROM oven/bun:1-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4

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

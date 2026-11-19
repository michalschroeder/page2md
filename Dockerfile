FROM oven/bun:1-slim@sha256:b780593f3e10918cbdaec3d5a08d52224b9198069a65eb47812085c2ec007643

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

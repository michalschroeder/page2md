# CLAUDE.md

## What this is

CLI that renders a URL with headless Chromium and pipes the result through Defuddle to extract clean Markdown. Single entrypoint (`index.ts`); ships as `ghcr.io/michalschroeder/page2md`.

## Architecture

Pipeline in `index.ts`:
1. `src/args.ts` — hand-rolled arg parser, returns a discriminated union (`run` | `help` | `version`). Throws `ArgsError` carrying an exit code. No external CLI lib.
2. **Fetch** — two modes:
   - default: Playwright `chromium-headless-shell`. Route handler aborts image/font/media/stylesheet. Waits on `domcontentloaded` (not `networkidle`).
   - `--no-render`: `src/fetch-static.ts` plain `fetch`.
3. `src/clean.ts` `prepareInput()` — only runs when HTML contains `<pre` or `application/ld+json`. Parses with `linkedom`, strips line-number gutter `<pre>` blocks, recursively cleans `articleBody` inside JSON-LD. Returns a `Document` when parsed, else the raw string (Defuddle handles both — passing a string skips a re-parse).
4. `Defuddle(input, url, { markdown: true })` → stdout or `-o <file>`.

Exit codes: 1 args, 2 fetch, 3 empty extract, 4 defuddle error.

## Working in this repo

- **Build / lint / test / dev all run in Docker** via the `Makefile` — do not install tooling on the host. Run `make help` to see available targets.
- Single-test run: `docker run --rm -v "$PWD":/app -w /app oven/bun:1-slim bun test <path>`.
- Snapshots in `test/__snapshots__/`; fixtures in `test/fixtures/` (captured by `scripts/capture-fixture.ts`).

## Conventions

- Bun + TypeScript, ESM, top-level await in `index.ts`.
- Biome — tabs, double quotes, no semicolons (see `biome.json`).
- Conventional Commits. Releases via release-please; `CHANGELOG.md` and the manifest are generated — don't hand-edit.
- Docker base pinned by digest; Renovate keeps it current.

## Gotchas

- `prepareInput` returns `Document` only when it actually cleaned something — letting Defuddle parse the string itself is the faster path. Don't change without checking issue #19.
- `--timeout` is 1–300000 ms (default 30000). `--user-agent` overrides `DEFAULT_UA` exported from `src/fetch-static.ts` for both modes.

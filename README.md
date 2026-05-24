# page2md

Render any URL with headless Chromium and extract clean Markdown to stdout.

## Quickstart

```sh
docker run --rm ghcr.io/michalschroeder/page2md example.com
```

Tags: `latest`, semver (`1.0.0`), and major (`1`). Pin to a major in scripts:

```sh
docker run --rm ghcr.io/michalschroeder/page2md:1 example.com
```

## Why

Many pages need JS to render. `curl | defuddle` misses SPA content. page2md runs the page in headless Chromium first, so what you get is what a browser sees — then `defuddle` extracts the article.

### When to use it

- **Feeding pages to an LLM** — Markdown is ~19× smaller than rendered HTML (see [Token savings](#token-savings)), and the model sees content, not chrome.
- **Archiving / note-taking** — clean, diff-able Markdown for Obsidian, Logseq, git.
- **Scraping pipelines** — deterministic output, no AI in the loop, no hallucinated content.
- **Bot-blocked pages** — sites that 403 a plain `fetch`/`curl` (e.g. Stack Overflow) render here because page2md drives a real browser.

### vs. alternatives

| Approach | JS rendering | Cleanup | Deterministic | Token cost to convert |
| --- | :---: | :---: | :---: | :---: |
| `curl` (raw HTML) | ✗ | ✗ | ✓ | none |
| `curl \| pandoc` | ✗ | ✗ | ✓ | none |
| `curl \| readability-cli \| pandoc` | ✗ | ✓ (articles only) | ✓ | none |
| AI fetchers (Claude WebFetch, etc.) | ✗ | ✓ | ✗ | pays LLM tokens to extract |
| **page2md** | ✓ | ✓ (Defuddle) | ✓ | none |

Reach for `curl | pandoc` if the page is static and you want every byte. Reach for page2md when you want the actual rendered article as faithful Markdown — no LLM in the conversion path, so the only tokens you spend are on the output you actually feed downstream.

## Usage

Output goes to stdout. Pipe or redirect:

```sh
docker run --rm ghcr.io/michalschroeder/page2md example.com > page.md
docker run --rm ghcr.io/michalschroeder/page2md https://news.ycombinator.com | less
```

Or write to a file with `-o` (mount a host dir so the file lands on your machine, not in the container):

```sh
docker run --rm -v "$PWD":/out ghcr.io/michalschroeder/page2md -o /out/page.md example.com
```

URL scheme is optional (`https://` is assumed).

> **Tip:** add `--init` (`docker run --init --rm ...`) so Chromium's child processes get reaped cleanly if you ctrl-C mid-render.

### Slow or JS-heavy pages

By default page2md grabs the DOM the moment it's ready (`domcontentloaded`). Single-page apps that load their content *after* the initial render come back empty — give them an extra wait:

```sh
# wait 6s after load for late-rendering SPA content
docker run --rm ghcr.io/michalschroeder/page2md --wait-ms 6000 https://bsky.app/profile/bsky.app
```

- `--wait-ms <n>` — extra delay (ms, 0–300000) after load. The reliable lever for client-rendered SPAs.
- `--wait-until <event>` — `domcontentloaded` (default), `load`, or `networkidle`. `networkidle` waits for the network to go quiet; skip it on apps that hold connections open (it never settles).

### Shell wrapper

Bash/zsh:

```sh
page2md() { docker run --rm ghcr.io/michalschroeder/page2md "$@"; }
```

Nushell:

```nu
def page2md [url: string] { docker run --rm ghcr.io/michalschroeder/page2md $url }
```

## Token savings

Feeding raw or rendered HTML to an LLM burns tokens on tags, scripts, and chrome. page2md hands the model just the article.

The numbers below compare page2md's Markdown against the HTML itself — what you'd spend dumping a page straight into context. AI fetchers like WebFetch already extract before returning (and don't run JS), so page2md's edge over *those* is JS rendering and deterministic output, not raw token count.

<!-- token-comparison:start -->

Across 8 pages, page2md output is **18.9× smaller** than rendered HTML in tokens (95% savings, `cl100k_base`).

| Page | Rendered HTML | page2md MD | Savings |
| --- | ---: | ---: | ---: |
| example.com | 153 | 29 | 81% |
| Wikipedia article | 114,220 | 20,322 | 82% |
| Hacker News front page | 11,766 | 2,121 | 82% |
| MDN reference page | 26,063 | 2,775 | 89% |
| React docs page | 152,462 | 6,251 | 96% |
| Personal blog post | 30,205 | 1,713 | 94% |
| Stack Overflow Q&A | 269,408 | 4,727 | 98% |
| page2md GH repo | 139,025 | 1,297 | 99% |
| **Total** | **743,302** | **39,235** | **95%** |

<!-- token-comparison:end -->

Full numbers and method: [docs/token-comparison/](docs/token-comparison/README.md).

## How it works

1. Open the page in headless Chromium. Skip images, fonts, video, CSS.
2. Don't wait for the network to go quiet — as soon as the DOM is ready, grab the HTML.
3. Hand it to `defuddle`, which figures out the main content and turns it into Markdown.
4. Print it.

Roughly 1.3s for a trivial page (example.com), 2s for a typical article (Wikipedia, HN front page), 3s+ for heavier SPAs (e.g. GitHub). Container startup is a fixed ~1s of that; the rest is page render.

## Local dev

You'll need [Bun](https://bun.sh).

```sh
bun install
bunx playwright install chromium-headless-shell
bun index.ts <url>
```

Or build the Docker image locally:

```sh
docker build -t page2md .
docker run --rm page2md example.com
```

### Lint & test

All checks run via Docker — no host installs needed:

```sh
make lint    # tsc + biome + hadolint + actionlint
make fmt     # auto-format with Biome
make test    # snapshot tests
```

## License

MIT — see `LICENSE`.

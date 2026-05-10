# page2md

Render any URL with headless Chromium and extract clean Markdown to stdout.

## Quickstart

```sh
docker build -t page2md .
docker run --rm page2md example.com
```

(GHCR pull instructions land once the image is published — see plan 07.)

## Why

Many pages need JS to render. `curl | defuddle` misses SPA content. page2md runs the page in headless Chromium first, so what you get is what a browser sees — then `defuddle` extracts the article.

## Usage

Output goes to stdout. Pipe or redirect:

```sh
docker run --rm page2md example.com > page.md
docker run --rm page2md https://news.ycombinator.com | less
```

Or write to a file with `-o` (mount a host dir so the file lands on your machine, not in the container):

```sh
docker run --rm -v "$PWD":/out page2md -o /out/page.md example.com
```

URL scheme is optional (`https://` is assumed).

> **Tip:** add `--init` (`docker run --init --rm page2md ...`) so Chromium's child processes get reaped cleanly if you ctrl-C mid-render.

### Shell wrapper

Bash/zsh:

```sh
page2md() { docker run --rm page2md "$@"; }
```

Nushell:

```nu
def page2md [url: string] { docker run --rm page2md $url }
```

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

### Lint & test

All checks run via Docker — no host installs needed:

```sh
make lint    # tsc + biome + hadolint + actionlint
make fmt     # auto-format with Biome
make test    # snapshot tests
```

## License

MIT — see `LICENSE`.

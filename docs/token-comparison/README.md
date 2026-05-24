# Token-usage comparison

How many tokens does an LLM agent spend when it reads a web page — raw, rendered, or extracted with page2md?

## Method

For each URL we measure three payloads:

- **Raw HTML** — plain `fetch(url)`, no JS. What `curl` would return.
- **Rendered HTML** — Chromium loads the page, executes JS, then we serialize the live DOM (images/fonts/media/CSS skipped).
- **page2md Markdown** — the rendered HTML run through `defuddle` to extract the article and convert to Markdown. This is what `page2md <url>` produces.

Token counts use the `cl100k_base` tokenizer (`js-tiktoken`) as a portable stand-in for LLM tokenization; the relative shape is what matters.

Reproduce with `make token-comparison`. Numbers fluctuate with each page edit; treat them as orders of magnitude.

## Results

| Page | Raw HTML | Rendered HTML | page2md MD | MD vs raw | MD vs rendered | Savings vs rendered |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| example.com | 152 | 153 | 29 | 5.2× smaller | 5.3× smaller | 81% |
| Wikipedia article | 113,600 | 114,220 | 20,322 | 5.6× smaller | 5.6× smaller | 82% |
| Hacker News front page | 11,757 | 11,766 | 2,121 | 5.5× smaller | 5.5× smaller | 82% |
| MDN reference page | 44,699 | 26,063 | 2,775 | 16.1× smaller | 9.4× smaller | 89% |
| React docs page | 152,224 | 152,462 | 6,251 | 24.4× smaller | 24.4× smaller | 96% |
| Personal blog post | 30,206 | 30,205 | 1,713 | 17.6× smaller | 17.6× smaller | 94% |
| Stack Overflow Q&A | _error_ | 269,408 | 4,727 | _error_ | 57.0× smaller | 98% |
| page2md GH repo | 132,021 | 139,025 | 1,297 | 101.8× smaller | 107.2× smaller | 99% |
| **Total** | **484,659** | **743,302** | **39,235** | **12.4×** | **18.9×** | **95%** |

Byte sizes (KiB) for reference:

| Page | Raw | Rendered | Markdown |
| --- | ---: | ---: | ---: |
| example.com | 1 | 1 | 0 |
| Wikipedia article | 358 | 360 | 76 |
| Hacker News front page | 34 | 34 | 7 |
| MDN reference page | 153 | 90 | 10 |
| React docs page | 431 | 432 | 26 |
| Personal blog post | 94 | 94 | 7 |
| Stack Overflow Q&A | _error_ | 864 | 18 |
| page2md GH repo | 325 | 340 | 4 |

## Errors

- **Stack Overflow Q&A** (https://stackoverflow.com/questions/231767/what-does-the-yield-keyword-do-in-python): raw: HTTP 403

## Takeaway

Feeding raw or rendered HTML to a model burns tokens on tags, scripts, inline JSON, navigation chrome, and ads. The article you actually want is a tiny fraction of that. page2md extracts that fraction so the model spends its context window on content, not boilerplate.

These figures measure HTML fed to a model directly. AI fetchers like Claude's WebFetch already extract to Markdown before returning (and fetch static HTML, no JS), so page2md's advantage over such tools is JS rendering and deterministic output, not token count alone.

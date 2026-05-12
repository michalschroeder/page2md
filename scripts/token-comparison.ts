#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { Defuddle } from "defuddle/node"
import { getEncoding } from "js-tiktoken"
import { type Browser, chromium } from "playwright"
import { prepareInput } from "../src/clean"
import { DEFAULT_UA, fetchStaticHtml } from "../src/fetch-static"

const NAV_TIMEOUT = 30_000
const SKIP_RESOURCES = new Set(["image", "font", "media", "stylesheet"])

type Target = { label: string; url: string }

const TARGETS: Target[] = [
	{ label: "example.com", url: "https://example.com" },
	{ label: "Wikipedia article", url: "https://en.wikipedia.org/wiki/Quicksort" },
	{ label: "Hacker News front page", url: "https://news.ycombinator.com/" },
	{
		label: "MDN reference page",
		url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
	},
	{ label: "React docs page", url: "https://react.dev/reference/react/useState" },
	{ label: "Personal blog post", url: "https://overreacted.io/before-you-memo/" },
	{
		label: "Stack Overflow Q&A",
		url: "https://stackoverflow.com/questions/231767/what-does-the-yield-keyword-do-in-python",
	},
	{ label: "page2md GH repo", url: "https://github.com/michalschroeder/page2md" },
]

const OUT = "docs/token-comparison/README.md"
const README = "README.md"
const README_START = "<!-- token-comparison:start -->"
const README_END = "<!-- token-comparison:end -->"

type Row = {
	label: string
	url: string
	rawTokens: number | null
	renderedTokens: number | null
	markdownTokens: number | null
	rawBytes: number | null
	renderedBytes: number | null
	markdownBytes: number | null
	error?: string
}

const enc = getEncoding("cl100k_base")
const countTokens = (s: string): number => enc.encode(s).length
const byteLen = (s: string): number => Buffer.byteLength(s, "utf8")
const ERR = "_error_"
const fmt = (n: number | null): string => (n == null ? ERR : n.toLocaleString("en-US"))
const kb = (n: number | null): string =>
	n == null ? ERR : `${Math.round(n / 1024).toLocaleString("en-US")}`
const ratio = (small: number | null, big: number | null, suffix = ""): string => {
	if (!small || !big) return ERR
	return `${(big / small).toFixed(1)}×${suffix ? ` ${suffix}` : ""}`
}
const pct = (small: number | null, big: number | null): string => {
	if (!small || !big) return ERR
	return `${Math.round((1 - small / big) * 100)}%`
}

async function fetchRendered(browser: Browser, url: string, ua: string): Promise<string> {
	const ctx = await browser.newContext({ javaScriptEnabled: true, bypassCSP: true, userAgent: ua })
	await ctx.route("**/*", (route) =>
		SKIP_RESOURCES.has(route.request().resourceType()) ? route.abort() : route.continue(),
	)
	const page = await ctx.newPage()
	try {
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT })
		const prepared = prepareInput(await page.content())
		return typeof prepared === "string" ? prepared : prepared.documentElement.outerHTML
	} finally {
		await ctx.close()
	}
}

async function measure(browser: Browser, t: Target): Promise<Row> {
	const row: Row = {
		label: t.label,
		url: t.url,
		rawTokens: null,
		renderedTokens: null,
		markdownTokens: null,
		rawBytes: null,
		renderedBytes: null,
		markdownBytes: null,
	}
	try {
		const fetched = await fetchStaticHtml(t.url, NAV_TIMEOUT, DEFAULT_UA)
		const raw = typeof fetched === "string" ? fetched : fetched.documentElement.outerHTML
		row.rawBytes = byteLen(raw)
		row.rawTokens = countTokens(raw)
	} catch (e) {
		row.error = `raw: ${e instanceof Error ? e.message : String(e)}`
	}
	try {
		const rendered = await fetchRendered(browser, t.url, DEFAULT_UA)
		row.renderedBytes = byteLen(rendered)
		row.renderedTokens = countTokens(rendered)
		const { content = "" } = await Defuddle(rendered, t.url, { markdown: true })
		if (content) {
			row.markdownBytes = byteLen(content)
			row.markdownTokens = countTokens(content)
		}
	} catch (e) {
		row.error = `${row.error ? `${row.error}; ` : ""}rendered: ${e instanceof Error ? e.message : String(e)}`
	}
	return row
}

function renderReport(rows: Row[]): string {
	const lines: string[] = []
	lines.push("# Token-usage comparison")
	lines.push("")
	lines.push(
		"How many tokens does an LLM agent spend when it reads a web page — raw, rendered, or extracted with page2md?",
	)
	lines.push("")
	lines.push("## Method")
	lines.push("")
	lines.push("For each URL we measure three payloads:")
	lines.push("")
	lines.push("- **Raw HTML** — plain `fetch(url)`, no JS. What `curl` would return.")
	lines.push(
		"- **Rendered HTML** — Chromium loads the page, executes JS, then we serialize the live DOM (images/fonts/media/CSS skipped).",
	)
	lines.push(
		"- **page2md Markdown** — the rendered HTML run through `defuddle` to extract the article and convert to Markdown. This is what `page2md <url>` produces.",
	)
	lines.push("")
	lines.push(
		"Token counts use the `cl100k_base` tokenizer (`js-tiktoken`) as a portable stand-in for LLM tokenization; the relative shape is what matters.",
	)
	lines.push("")
	lines.push(
		"Reproduce with `make token-comparison`. Numbers fluctuate with each page edit; treat them as orders of magnitude.",
	)
	lines.push("")
	lines.push("## Results")
	lines.push("")
	lines.push(
		"| Page | Raw HTML | Rendered HTML | page2md MD | MD vs raw | MD vs rendered | Savings vs rendered |",
	)
	lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
	for (const r of rows) {
		lines.push(
			`| ${r.label} | ${fmt(r.rawTokens)} | ${fmt(r.renderedTokens)} | ${fmt(r.markdownTokens)} | ${ratio(r.markdownTokens, r.rawTokens, "smaller")} | ${ratio(r.markdownTokens, r.renderedTokens, "smaller")} | ${pct(r.markdownTokens, r.renderedTokens)} |`,
		)
	}
	const totRaw = sum(rows.map((r) => r.rawTokens))
	const totRendered = sum(rows.map((r) => r.renderedTokens))
	const totMd = sum(rows.map((r) => r.markdownTokens))
	lines.push(
		`| **Total** | **${fmt(totRaw)}** | **${fmt(totRendered)}** | **${fmt(totMd)}** | **${ratio(totMd, totRaw)}** | **${ratio(totMd, totRendered)}** | **${pct(totMd, totRendered)}** |`,
	)
	lines.push("")
	lines.push("Byte sizes (KiB) for reference:")
	lines.push("")
	lines.push("| Page | Raw | Rendered | Markdown |")
	lines.push("| --- | ---: | ---: | ---: |")
	for (const r of rows) {
		lines.push(
			`| ${r.label} | ${kb(r.rawBytes)} | ${kb(r.renderedBytes)} | ${kb(r.markdownBytes)} |`,
		)
	}
	lines.push("")
	const errored = rows.filter((r) => r.error)
	if (errored.length) {
		lines.push("## Errors")
		lines.push("")
		for (const r of errored) lines.push(`- **${r.label}** (${r.url}): ${r.error}`)
		lines.push("")
	}
	lines.push("## Takeaway")
	lines.push("")
	lines.push(
		"Feeding raw or rendered HTML to a model burns tokens on tags, scripts, inline JSON, navigation chrome, and ads. The article you actually want is a tiny fraction of that. page2md extracts that fraction so the model spends its context window on content, not boilerplate.",
	)
	lines.push("")
	return `${lines.join("\n")}`
}

function renderReadmeSnippet(rows: Row[]): string {
	const totRendered = sum(rows.map((r) => r.renderedTokens))
	const totMd = sum(rows.map((r) => r.markdownTokens))
	const lines: string[] = []
	lines.push(
		`Across ${rows.length} pages, page2md output is **${ratio(totMd, totRendered)} smaller** than rendered HTML in tokens (${pct(totMd, totRendered)} savings, \`cl100k_base\`).`,
	)
	lines.push("")
	lines.push("| Page | Rendered HTML | page2md MD | Savings |")
	lines.push("| --- | ---: | ---: | ---: |")
	for (const r of rows) {
		lines.push(
			`| ${r.label} | ${fmt(r.renderedTokens)} | ${fmt(r.markdownTokens)} | ${pct(r.markdownTokens, r.renderedTokens)} |`,
		)
	}
	lines.push(
		`| **Total** | **${fmt(totRendered)}** | **${fmt(totMd)}** | **${pct(totMd, totRendered)}** |`,
	)
	return lines.join("\n")
}

function patchReadme(path: string, snippet: string): boolean {
	if (!existsSync(path)) return false
	const src = readFileSync(path, "utf8")
	const startIdx = src.indexOf(README_START)
	const endIdx = src.indexOf(README_END)
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return false
	const before = src.slice(0, startIdx + README_START.length)
	const after = src.slice(endIdx)
	const next = `${before}\n\n${snippet}\n\n${after}`
	if (next === src) return false
	writeFileSync(path, next)
	return true
}

function sum(xs: (number | null)[]): number | null {
	let acc = 0
	let any = false
	for (const x of xs) {
		if (x == null) continue
		acc += x
		any = true
	}
	return any ? acc : null
}

const browser = await chromium.launch({
	channel: "chromium-headless-shell",
	args: ["--disable-dev-shm-usage", "--no-sandbox"],
})
const CONCURRENCY = 3
const rows: Row[] = new Array(TARGETS.length)
try {
	let next = 0
	const worker = async () => {
		while (true) {
			const i = next++
			if (i >= TARGETS.length) return
			const t = TARGETS[i]
			process.stderr.write(`→ ${t.label}\n`)
			const row = await measure(browser, t)
			rows[i] = row
			process.stderr.write(
				`✓ ${t.label}: raw=${fmt(row.rawTokens)} rendered=${fmt(row.renderedTokens)} md=${fmt(row.markdownTokens)}${row.error ? ` (${row.error})` : ""}\n`,
			)
		}
	}
	await Promise.all(Array.from({ length: CONCURRENCY }, worker))
} finally {
	await browser.close()
}

const args = new Set(process.argv.slice(2))
const onlyReadme = args.has("--readme-only")
const skipReadme = args.has("--no-readme")

if (!onlyReadme) {
	const report = renderReport(rows)
	mkdirSync(dirname(OUT), { recursive: true })
	writeFileSync(OUT, report)
	process.stderr.write(`\nwrote ${OUT}\n`)
}
if (!skipReadme) {
	const ok = patchReadme(README, renderReadmeSnippet(rows))
	process.stderr.write(ok ? `patched ${README}\n` : `skipped ${README} (markers not found)\n`)
}

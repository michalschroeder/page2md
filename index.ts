#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { Defuddle } from "defuddle/node"
import { type Browser, chromium } from "playwright"
import pkg from "./package.json" with { type: "json" }
import { ArgsError, parseArgs, type WaitUntil } from "./src/args"
import { prepareInput } from "./src/clean"
import { DEFAULT_UA, fetchStaticHtml } from "./src/fetch-static"

const SKIP_RESOURCES = new Set(["image", "font", "media", "stylesheet"])
const DEFAULT_TIMEOUT_MS = 30_000
const VERSION = pkg.version

const errMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))

const HELP = `page2md — render any URL to clean Markdown

Usage:
  page2md [options] <url>

Options:
  -o, --output <file>     write markdown to file instead of stdout
      --no-render         skip Chromium; plain HTTP fetch, no JS (static pages only)
      --externals         enrich third-party embeds via network (Twitter/YouTube/Reddit); off by default
  -j, --json              emit full Defuddle result as JSON (title, author, content, …)
  -p, --property <name>   print a single field (title, author, content, wordCount, …)
                          exits 3 if the field is missing/empty; combine with -j to JSON-encode
      --user-agent <ua>   override User-Agent header (both modes)
      --timeout <ms>      page-load timeout in ms (1–300000, default 30000)
      --wait-until <e>    nav wait event: domcontentloaded (default), load, networkidle
      --wait-ms <ms>      extra delay after load, for late-rendering SPAs (0–300000)
  -h, --help              show this help
  -V, --version           show version

Examples:
  page2md example.com
  page2md -o page.md https://example.com
  page2md --no-render https://en.wikipedia.org/wiki/Quicksort
  page2md --user-agent "Mozilla/5.0 (compatible; mybot/1.0)" example.com
`

let parsed: ReturnType<typeof parseArgs>
try {
	parsed = parseArgs(process.argv.slice(2))
} catch (err) {
	if (err instanceof ArgsError) {
		console.error(`error: ${err.message}`)
		process.exit(err.exitCode)
	}
	throw err
}

if (parsed.kind === "help") {
	process.stdout.write(HELP)
	process.exit(0)
}
if (parsed.kind === "version") {
	console.log(VERSION)
	process.exit(0)
}

const { url, output, noRender, externals, json, property, userAgent, timeoutMs, stealth } = parsed
const ua = userAgent ?? DEFAULT_UA
const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS
const waitUntil = parsed.waitUntil ?? "domcontentloaded"
const waitMs = parsed.waitMs ?? 0

let browser: Browser | undefined
let input: Document | string
try {
	if (noRender) {
		try {
			input = await fetchStaticHtml(url, timeout, ua)
		} catch (err) {
			console.error(`error: failed to load ${url}: ${errMessage(err)}`)
			process.exit(2)
		}
	} else {
		browser = await launchChromium(stealth ?? false)
		try {
			input = await fetchRenderedHtml(browser, url, ua, timeout, waitUntil, waitMs)
		} catch (err) {
			console.error(`error: failed to load ${url}: ${errMessage(err)}`)
			process.exit(2)
		}
	}

	try {
		const result = await Defuddle(input, url, { markdown: true, useAsync: externals })
		let out: string
		if (property !== undefined) {
			const value = (result as unknown as Record<string, unknown>)[property]
			if (value === undefined || value === null || value === "") {
				console.error(`error: property "${property}" missing or empty`)
				process.exit(3)
			}
			out = json || typeof value !== "string" ? JSON.stringify(value) : value
		} else {
			if (!result.content) {
				console.error(`error: extracted no content from ${url}`)
				process.exit(3)
			}
			out = json ? JSON.stringify(result) : result.content
		}
		if (output) writeFileSync(output, out)
		else process.stdout.write(out)
	} catch (err) {
		console.error(`error: ${errMessage(err)}`)
		process.exit(4)
	}
} finally {
	await browser?.close()
}

async function launchChromium(stealth: boolean): Promise<Browser> {
	const opts = {
		channel: "chromium-headless-shell",
		args: ["--disable-dev-shm-usage", "--no-sandbox"],
	}
	if (!stealth) return chromium.launch(opts)
	const { chromium: stealthChromium } = await import("playwright-extra")
	const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default
	stealthChromium.use(StealthPlugin())
	return stealthChromium.launch(opts) as unknown as Browser
}

async function fetchRenderedHtml(
	browser: Browser,
	url: string,
	userAgent: string,
	timeoutMs: number,
	waitUntil: WaitUntil,
	waitMs: number,
) {
	const ctx = await browser.newContext({
		javaScriptEnabled: true,
		bypassCSP: true,
		userAgent,
	})
	await ctx.route("**/*", (route) =>
		SKIP_RESOURCES.has(route.request().resourceType()) ? route.abort() : route.continue(),
	)
	const page = await ctx.newPage()
	await page.goto(url, { waitUntil, timeout: timeoutMs })
	if (waitMs > 0) await page.waitForTimeout(waitMs)
	return prepareInput(await page.content())
}

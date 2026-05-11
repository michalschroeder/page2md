#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { Defuddle } from "defuddle/node"
import { type Browser, chromium } from "playwright"
import pkg from "./package.json" with { type: "json" }
import { ArgsError, parseArgs } from "./src/args"
import { cleanLineNumberGutters } from "./src/clean"
import { DEFAULT_UA, fetchStaticHtml } from "./src/fetch-static"

const SKIP_RESOURCES = new Set(["image", "font", "media", "stylesheet"])
const NAV_TIMEOUT = 30_000
const VERSION = pkg.version

const errMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))

const HELP = `page2md — render any URL to clean Markdown

Usage:
  page2md [options] <url>

Options:
  -o, --output <file>     write markdown to file instead of stdout
      --no-render         skip Chromium; fetch HTML directly (fast, static pages only)
      --user-agent <ua>   override User-Agent header (both modes)
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

const { url, output, noRender, userAgent } = parsed
const ua = userAgent ?? DEFAULT_UA

let browser: Browser | undefined
let html: string
try {
	if (noRender) {
		try {
			html = await fetchStaticHtml(url, NAV_TIMEOUT, ua)
		} catch (err) {
			console.error(`error: failed to load ${url}: ${errMessage(err)}`)
			process.exit(2)
		}
	} else {
		browser = await chromium.launch({
			channel: "chromium-headless-shell",
			args: ["--disable-dev-shm-usage", "--no-sandbox"],
		})
		try {
			html = await fetchRenderedHtml(browser, url, ua)
		} catch (err) {
			console.error(`error: failed to load ${url}: ${errMessage(err)}`)
			process.exit(2)
		}
	}

	try {
		const { content = "" } = await Defuddle(html, url, { markdown: true })
		if (!content) {
			console.error(`error: extracted no content from ${url}`)
			process.exit(3)
		}
		if (output) writeFileSync(output, content)
		else process.stdout.write(content)
	} catch (err) {
		console.error(`error: ${errMessage(err)}`)
		process.exit(4)
	}
} finally {
	await browser?.close()
}

async function fetchRenderedHtml(browser: Browser, url: string, userAgent: string) {
	const ctx = await browser.newContext({
		javaScriptEnabled: true,
		bypassCSP: true,
		userAgent,
	})
	await ctx.route("**/*", (route) =>
		SKIP_RESOURCES.has(route.request().resourceType()) ? route.abort() : route.continue(),
	)
	const page = await ctx.newPage()
	await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT })
	return cleanLineNumberGutters(await page.content())
}

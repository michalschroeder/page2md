#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { Defuddle } from "defuddle/node"
import { type Browser, chromium } from "playwright"
import pkg from "./package.json" with { type: "json" }
import { cleanLineNumberGutters } from "./src/clean"
import { fetchStaticHtml } from "./src/fetch-static"

const SKIP_RESOURCES = new Set(["image", "font", "media", "stylesheet"])
const NAV_TIMEOUT = 30_000
const VERSION = pkg.version

const errMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))

const HELP = `page2md — render any URL to clean Markdown

Usage:
  page2md [options] <url>

Options:
  -o, --output <file>    write markdown to file instead of stdout
      --no-render        skip Chromium; fetch HTML directly (fast, static pages only)
  -h, --help             show this help
  -V, --version          show version

Examples:
  page2md example.com
  page2md -o page.md https://example.com
  page2md --no-render https://en.wikipedia.org/wiki/Quicksort
`

const { url, output, noRender } = parseArgs(process.argv.slice(2))

let browser: Browser | undefined
let html: string
try {
	if (noRender) {
		try {
			html = await fetchStaticHtml(url, NAV_TIMEOUT)
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
			html = await fetchRenderedHtml(browser, url)
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

function parseArgs(argv: string[]): { url: string; output?: string; noRender: boolean } {
	let url: string | undefined
	let output: string | undefined
	let noRender = false
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === "-h" || a === "--help") {
			process.stdout.write(HELP)
			process.exit(0)
		}
		if (a === "-V" || a === "--version") {
			console.log(VERSION)
			process.exit(0)
		}
		if (a === "-o" || a === "--output") {
			output = argv[++i]
			continue
		}
		if (a.startsWith("--output=")) {
			output = a.slice(9)
			continue
		}
		if (a === "--no-render") {
			noRender = true
			continue
		}
		if (a.startsWith("-")) {
			console.error(`error: unknown option: ${a}`)
			process.exit(1)
		}
		url = a
	}
	if (!url) {
		console.error("error: URL required (see --help)")
		process.exit(1)
	}
	return { url: /^https?:\/\//i.test(url) ? url : `https://${url}`, output, noRender }
}

async function fetchRenderedHtml(browser: Browser, url: string) {
	const ctx = await browser.newContext({ javaScriptEnabled: true, bypassCSP: true })
	await ctx.route("**/*", (route) =>
		SKIP_RESOURCES.has(route.request().resourceType()) ? route.abort() : route.continue(),
	)
	const page = await ctx.newPage()
	await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT })
	return cleanLineNumberGutters(await page.content())
}

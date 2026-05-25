#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { Defuddle } from "defuddle/node"
import { type Browser, chromium } from "playwright"
import pkg from "./package.json" with { type: "json" }
import { ArgsError, parseArgs, type WaitUntil } from "./src/args"
import { prepareInput } from "./src/clean"
import { DEFAULT_UA, fetchStaticHtml } from "./src/fetch-static"
import { buildStrategies, type Strategy } from "./src/strategies"

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
      --auto              on empty/failed render, auto-retry with stronger settings
  -h, --help              show this help
  -V, --version           show version

Examples:
  page2md example.com
  page2md -o page.md https://example.com
  page2md --no-render https://en.wikipedia.org/wiki/Quicksort
  page2md --auto https://bsky.app/profile/bsky.app
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

const { url, output, noRender, externals, json, property, userAgent, timeoutMs, stealth, auto } =
	parsed
const ua = userAgent ?? DEFAULT_UA
const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS

type Outcome = { out: string } | { code: number; msg: string }
type Failure = Extract<Outcome, { code: number }>
type DefuddleResult = Awaited<ReturnType<typeof Defuddle>>

// Register the stealth plugin only once per process: playwright-extra's `use`
// pushes onto a shared singleton without deduping, so repeated launches (e.g.
// --auto escalating into the stealth rung) would otherwise stack duplicates.
// Declared above the top-level await below — `launchChromium` is hoisted, but
// this `let` would be in its temporal dead zone if declared after the await.
let stealthRegistered = false

let outcome: Outcome
if (noRender) {
	outcome = await staticAttempt()
} else {
	const strats = buildStrategies({
		auto: auto ?? false,
		stealth: stealth ?? false,
		waitUntil: parsed.waitUntil ?? "domcontentloaded",
		waitMs: parsed.waitMs,
	})
	// Report the first (baseline) failure if every rung fails, so --auto's exit
	// code matches what a plain run would have produced rather than the last
	// rung's escalated error.
	let firstFailure: Failure | undefined
	outcome = { code: 2, msg: `failed to load ${url}` }
	for (let i = 0; i < strats.length; i++) {
		if (auto && i > 0) process.stderr.write(`page2md: retrying with ${strats[i].label}\n`)
		outcome = await renderAttempt(strats[i])
		if ("out" in outcome) break
		firstFailure ??= outcome
	}
	if ("code" in outcome && firstFailure) outcome = firstFailure
}

if ("code" in outcome) {
	console.error(`error: ${outcome.msg}`)
	process.exit(outcome.code)
}
if (output) writeFileSync(output, outcome.out)
else process.stdout.write(outcome.out)

// Convert a Defuddle result to output, or a failure (empty content / missing
// property) that --auto treats as a reason to escalate.
function toOutput(result: DefuddleResult): Outcome {
	if (property !== undefined) {
		const value = (result as unknown as Record<string, unknown>)[property]
		if (value === undefined || value === null || value === "") {
			return { code: 3, msg: `property "${property}" missing or empty` }
		}
		return { out: json || typeof value !== "string" ? JSON.stringify(value) : value }
	}
	if (!result.content) return { code: 3, msg: `extracted no content from ${url}` }
	return { out: json ? JSON.stringify(result) : result.content }
}

async function renderAttempt(strat: Strategy): Promise<Outcome> {
	let browser: Browser | undefined
	try {
		browser = await launchChromium(strat.stealth)
	} catch (err) {
		return { code: 2, msg: `failed to launch browser: ${errMessage(err)}` }
	}
	try {
		let input: Document | string
		try {
			input = await fetchRenderedHtml(browser, url, ua, timeout, strat.waitUntil, strat.waitMs)
		} catch (err) {
			return { code: 2, msg: `failed to load ${url}: ${errMessage(err)}` }
		}
		try {
			return toOutput(await Defuddle(input, url, { markdown: true, useAsync: externals }))
		} catch (err) {
			return { code: 4, msg: errMessage(err) }
		}
	} finally {
		await browser?.close()
	}
}

async function staticAttempt(): Promise<Outcome> {
	let input: Document | string
	try {
		input = await fetchStaticHtml(url, timeout, ua)
	} catch (err) {
		return { code: 2, msg: `failed to load ${url}: ${errMessage(err)}` }
	}
	try {
		return toOutput(await Defuddle(input, url, { markdown: true, useAsync: externals }))
	} catch (err) {
		return { code: 4, msg: errMessage(err) }
	}
}

async function launchChromium(stealth: boolean): Promise<Browser> {
	const opts = {
		channel: "chromium-headless-shell",
		args: ["--disable-dev-shm-usage", "--no-sandbox"],
	}
	if (!stealth) return chromium.launch(opts)
	const { chromium: stealthChromium } = await import("playwright-extra")
	if (!stealthRegistered) {
		const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default
		stealthChromium.use(StealthPlugin())
		stealthRegistered = true
	}
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

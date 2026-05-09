#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { chromium } from "playwright"

const SKIP_RESOURCES = new Set(["image", "font", "media", "stylesheet"])
const [url, outPath] = process.argv.slice(2)
if (!url || !outPath) {
	console.error("usage: bun scripts/capture-fixture.ts <url> <out.html>")
	process.exit(1)
}

const browser = await chromium.launch({
	channel: "chromium-headless-shell",
	args: ["--disable-dev-shm-usage", "--no-sandbox"],
})
try {
	const ctx = await browser.newContext({ javaScriptEnabled: true, bypassCSP: true })
	await ctx.route("**/*", (r) =>
		SKIP_RESOURCES.has(r.request().resourceType()) ? r.abort() : r.continue(),
	)
	const page = await ctx.newPage()
	await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
	writeFileSync(outPath, `<!-- Source: ${url} | Captured: ${new Date().toISOString()} -->\n${await page.content()}`)
} finally {
	await browser.close()
}

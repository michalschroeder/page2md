import { afterEach, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { Defuddle } from "defuddle/node"
import { fetchStaticHtml } from "../src/fetch-static"

const realFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = realFetch
})

function stubFetch(impl: (...args: Parameters<typeof fetch>) => Promise<Response>) {
	globalThis.fetch = impl as typeof fetch
}

test("fetches static HTML and runs defuddle", async () => {
	const fixture = readFileSync("test/fixtures/wikipedia-plain-text.html", "utf8")
	stubFetch(
		async () =>
			new Response(fixture, {
				status: 200,
				headers: { "content-type": "text/html; charset=utf-8" },
			}),
	)
	const html = await fetchStaticHtml("https://en.wikipedia.org/wiki/Plain_text", 30_000)
	const { content = "" } = await Defuddle(html, "https://en.wikipedia.org/wiki/Plain_text", {
		markdown: true,
	})
	expect(content).toMatchSnapshot()
})

test("throws on non-2xx", async () => {
	stubFetch(async () => new Response("nope", { status: 404 }))
	await expect(fetchStaticHtml("https://example.com", 30_000)).rejects.toThrow(/HTTP 404/)
})

test("throws on non-HTML content-type", async () => {
	stubFetch(
		async () => new Response("plain", { status: 200, headers: { "content-type": "text/plain" } }),
	)
	await expect(fetchStaticHtml("https://example.com/x.txt", 30_000)).rejects.toThrow(/content-type/)
})

test("accepts application/xhtml+xml", async () => {
	stubFetch(
		async () =>
			new Response("<html><body><p>hi</p></body></html>", {
				status: 200,
				headers: { "content-type": "application/xhtml+xml" },
			}),
	)
	const html = await fetchStaticHtml("https://example.com", 30_000)
	expect(html).toContain("<p>hi</p>")
})

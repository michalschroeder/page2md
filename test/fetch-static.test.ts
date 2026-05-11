import { afterEach, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { Defuddle } from "defuddle/node"
import { DEFAULT_UA, fetchStaticHtml } from "../src/fetch-static"

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
	const html = await fetchStaticHtml("https://en.wikipedia.org/wiki/Plain_text", 30_000, DEFAULT_UA)
	const { content = "" } = await Defuddle(html, "https://en.wikipedia.org/wiki/Plain_text", {
		markdown: true,
	})
	expect(content).toMatchSnapshot()
})

test("throws on non-2xx", async () => {
	stubFetch(async () => new Response("nope", { status: 404 }))
	await expect(fetchStaticHtml("https://example.com", 30_000, DEFAULT_UA)).rejects.toThrow(
		/HTTP 404/,
	)
})

test("throws on non-HTML content-type", async () => {
	stubFetch(
		async () => new Response("plain", { status: 200, headers: { "content-type": "text/plain" } }),
	)
	await expect(fetchStaticHtml("https://example.com/x.txt", 30_000, DEFAULT_UA)).rejects.toThrow(
		/content-type/,
	)
})

test("accepts application/xhtml+xml", async () => {
	stubFetch(
		async () =>
			new Response("<html><body><p>hi</p></body></html>", {
				status: 200,
				headers: { "content-type": "application/xhtml+xml" },
			}),
	)
	const html = await fetchStaticHtml("https://example.com", 30_000, DEFAULT_UA)
	expect(html).toContain("<p>hi</p>")
})

test.each([
	["custom string", "custom-ua/1.0", "custom-ua/1.0"],
	["DEFAULT_UA contains Chrome/141", DEFAULT_UA, /Chrome\/141/],
])("sends user-agent header (%s)", async (_label, input, expected) => {
	let seenUa: string | undefined
	stubFetch(async (_input, init) => {
		const headers = (init?.headers ?? {}) as Record<string, string>
		seenUa = headers["user-agent"]
		return new Response("<html><body>x</body></html>", {
			status: 200,
			headers: { "content-type": "text/html" },
		})
	})
	await fetchStaticHtml("https://example.com", 30_000, input)
	if (typeof expected === "string") expect(seenUa).toBe(expected)
	else expect(seenUa).toMatch(expected)
})

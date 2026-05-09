import { test, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { Defuddle } from "defuddle/node"
import { cleanLineNumberGutters } from "../src/clean"

const fixtures: Array<[string, string]> = [
	["wikipedia-quicksort", "https://en.wikipedia.org/wiki/Quicksort"],
	["wikipedia-plain-text", "https://en.wikipedia.org/wiki/Plain_text"],
	["synthetic-gutter", "https://example.test/synthetic"],
]

for (const [name, url] of fixtures) {
	test(`extracts ${name}`, async () => {
		const html = readFileSync(`test/fixtures/${name}.html`, "utf8")
		const cleaned = cleanLineNumberGutters(html)
		const { content = "" } = await Defuddle(cleaned, url, { markdown: true })
		expect(content).toMatchSnapshot()
	})
}

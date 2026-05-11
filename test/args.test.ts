import { expect, test } from "bun:test"
import { ArgsError, parseArgs } from "../src/args"

test("returns run with url and https scheme prepended", () => {
	const r = parseArgs(["example.com"])
	expect(r).toEqual({ kind: "run", url: "https://example.com", noRender: false })
})

test("preserves explicit http scheme", () => {
	const r = parseArgs(["http://example.com"])
	expect(r).toEqual({ kind: "run", url: "http://example.com", noRender: false })
})

test("parses -o output", () => {
	const r = parseArgs(["-o", "out.md", "example.com"])
	expect(r).toEqual({ kind: "run", url: "https://example.com", output: "out.md", noRender: false })
})

test("parses --output=foo", () => {
	const r = parseArgs(["--output=out.md", "example.com"])
	expect(r).toEqual({ kind: "run", url: "https://example.com", output: "out.md", noRender: false })
})

test("parses --no-render", () => {
	const r = parseArgs(["--no-render", "example.com"])
	expect(r).toEqual({ kind: "run", url: "https://example.com", noRender: true })
})

test("returns help for -h", () => {
	expect(parseArgs(["-h"])).toEqual({ kind: "help" })
})

test("returns help for --help", () => {
	expect(parseArgs(["--help"])).toEqual({ kind: "help" })
})

test("returns version for -V", () => {
	expect(parseArgs(["-V"])).toEqual({ kind: "version" })
})

test("returns version for --version", () => {
	expect(parseArgs(["--version"])).toEqual({ kind: "version" })
})

test("throws ArgsError on missing url", () => {
	try {
		parseArgs([])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).exitCode).toBe(1)
		expect((e as ArgsError).message).toMatch(/URL required/)
	}
})

test("throws ArgsError on unknown flag", () => {
	try {
		parseArgs(["--bogus", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).exitCode).toBe(1)
		expect((e as ArgsError).message).toMatch(/--bogus/)
	}
})

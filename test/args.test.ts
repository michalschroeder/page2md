import { expect, test } from "bun:test"
import { ArgsError, parseArgs } from "../src/args"

test("returns run with url and https scheme prepended", () => {
	const r = parseArgs(["example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
	})
})

test("preserves explicit http scheme", () => {
	const r = parseArgs(["http://example.com"])
	expect(r).toEqual({ kind: "run", url: "http://example.com", noRender: false, externals: false })
})

test("parses -o output", () => {
	const r = parseArgs(["-o", "out.md", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		output: "out.md",
		noRender: false,
		externals: false,
	})
})

test("parses --output=foo", () => {
	const r = parseArgs(["--output=out.md", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		output: "out.md",
		noRender: false,
		externals: false,
	})
})

test("parses --no-render", () => {
	const r = parseArgs(["--no-render", "example.com"])
	expect(r).toEqual({ kind: "run", url: "https://example.com", noRender: true, externals: false })
})

test("parses --externals", () => {
	const r = parseArgs(["--externals", "example.com"])
	expect(r).toEqual({ kind: "run", url: "https://example.com", noRender: false, externals: true })
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

test("throws on -o with no value", () => {
	try {
		parseArgs(["-o"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/-o requires a non-empty value/)
	}
})

test("throws on empty -o value", () => {
	try {
		parseArgs(["-o", "", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/-o requires a non-empty value/)
	}
})

test("throws on empty --output=value", () => {
	try {
		parseArgs(["--output=", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--output requires a non-empty value/)
	}
})

test("throws on whitespace-only --output=value", () => {
	try {
		parseArgs(["--output=   ", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--output requires a non-empty value/)
	}
})

test("parses --user-agent value", () => {
	const r = parseArgs(["--user-agent", "foo/1.0", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		userAgent: "foo/1.0",
	})
})

test("parses --user-agent=value", () => {
	const r = parseArgs(["--user-agent=foo/1.0", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		userAgent: "foo/1.0",
	})
})

test("throws on --user-agent with no value", () => {
	try {
		parseArgs(["--user-agent"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--user-agent requires a non-empty value/)
	}
})

test("throws on empty --user-agent value", () => {
	try {
		parseArgs(["--user-agent", "", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--user-agent requires a non-empty value/)
	}
})

test("throws on whitespace-only --user-agent=value", () => {
	try {
		parseArgs(["--user-agent=   "])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--user-agent requires a non-empty value/)
	}
})

test("throws on -o consuming a flag-like value", () => {
	try {
		parseArgs(["-o", "--no-render", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).exitCode).toBe(1)
		expect((e as ArgsError).message).toMatch(/-o requires a value/)
	}
})

test("throws on --output consuming a flag-like value", () => {
	try {
		parseArgs(["--output", "--foo", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--output requires a value/)
	}
})

test("throws on --user-agent consuming a flag-like value", () => {
	try {
		parseArgs(["--user-agent", "--no-render", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--user-agent requires a value/)
	}
})

test("parses --timeout value", () => {
	const r = parseArgs(["--timeout", "5000", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		timeoutMs: 5000,
	})
})

test("parses --timeout=value", () => {
	const r = parseArgs(["--timeout=5000", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		timeoutMs: 5000,
	})
})

test("accepts --timeout at max (300000)", () => {
	const r = parseArgs(["--timeout=300000", "example.com"])
	expect(r).toMatchObject({ kind: "run", timeoutMs: 300000 })
})

test("throws on --timeout with no value", () => {
	try {
		parseArgs(["--timeout"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--timeout requires a value/)
	}
})

test("throws on non-numeric --timeout", () => {
	try {
		parseArgs(["--timeout=abc", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/positive integer/)
	}
})

test("throws on fractional --timeout", () => {
	try {
		parseArgs(["--timeout=1.5", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/positive integer/)
	}
})

test("throws on --timeout=0", () => {
	try {
		parseArgs(["--timeout=0", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/between 1 and 300000/)
	}
})

test("throws on negative --timeout", () => {
	try {
		parseArgs(["--timeout=-1", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/positive integer/)
	}
})

test("throws on --timeout above max", () => {
	try {
		parseArgs(["--timeout=300001", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/between 1 and 300000/)
	}
})

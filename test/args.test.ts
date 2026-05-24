import { expect, test } from "bun:test"
import { ArgsError, parseArgs } from "../src/args"

test("returns run with url and https scheme prepended", () => {
	const r = parseArgs(["example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		json: false,
	})
})

test("preserves explicit http scheme", () => {
	const r = parseArgs(["http://example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "http://example.com",
		noRender: false,
		externals: false,
		json: false,
	})
})

test("parses -o output", () => {
	const r = parseArgs(["-o", "out.md", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		output: "out.md",
		noRender: false,
		externals: false,
		json: false,
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
		json: false,
	})
})

test("parses --no-render", () => {
	const r = parseArgs(["--no-render", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: true,
		externals: false,
		json: false,
	})
})

test("parses --externals", () => {
	const r = parseArgs(["--externals", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: true,
		json: false,
	})
})

test("parses --json", () => {
	const r = parseArgs(["--json", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		json: true,
	})
})

test("parses -p value", () => {
	const r = parseArgs(["-p", "title", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		json: false,
		property: "title",
	})
})

test("parses --property=value", () => {
	const r = parseArgs(["--property=author", "example.com"])
	expect(r).toMatchObject({ kind: "run", property: "author" })
})

test("throws on -p with no value", () => {
	try {
		parseArgs(["-p"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/-p requires a non-empty value/)
	}
})

test("throws on empty --property=value", () => {
	try {
		parseArgs(["--property=", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--property requires a non-empty value/)
	}
})

test("throws on -p consuming a flag-like value", () => {
	try {
		parseArgs(["-p", "--no-render", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/-p requires a value/)
	}
})

test("parses -j", () => {
	const r = parseArgs(["-j", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		json: true,
	})
})

test("parses --stealth", () => {
	const r = parseArgs(["--stealth", "example.com"])
	expect(r).toMatchObject({ kind: "run", stealth: true })
})

test("omits stealth when flag absent", () => {
	expect(parseArgs(["example.com"])).not.toHaveProperty("stealth")
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
		json: false,
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
		json: false,
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
		json: false,
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
		json: false,
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

test("parses --wait-ms value", () => {
	const r = parseArgs(["--wait-ms", "6000", "example.com"])
	expect(r).toEqual({
		kind: "run",
		url: "https://example.com",
		noRender: false,
		externals: false,
		json: false,
		waitMs: 6000,
	})
})

test("parses --wait-ms=value", () => {
	const r = parseArgs(["--wait-ms=6000", "example.com"])
	expect(r).toMatchObject({ kind: "run", waitMs: 6000 })
})

test("accepts --wait-ms=0", () => {
	const r = parseArgs(["--wait-ms=0", "example.com"])
	expect(r).toMatchObject({ kind: "run", waitMs: 0 })
})

test("throws on non-numeric --wait-ms", () => {
	try {
		parseArgs(["--wait-ms=abc", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/non-negative integer/)
	}
})

test("throws on --wait-ms above max", () => {
	try {
		parseArgs(["--wait-ms=300001", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/between 0 and 300000/)
	}
})

test("parses --wait-until networkidle", () => {
	const r = parseArgs(["--wait-until=networkidle", "example.com"])
	expect(r).toMatchObject({ kind: "run", waitUntil: "networkidle" })
})

test("parses --wait-until load (separate value)", () => {
	const r = parseArgs(["--wait-until", "load", "example.com"])
	expect(r).toMatchObject({ kind: "run", waitUntil: "load" })
})

test("throws on invalid --wait-until", () => {
	try {
		parseArgs(["--wait-until=idle", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--wait-until must be one of/)
	}
})

test("parses --auto", () => {
	const r = parseArgs(["--auto", "example.com"])
	expect(r).toMatchObject({ kind: "run", auto: true })
})

test("omits auto when flag absent", () => {
	expect(parseArgs(["example.com"])).not.toHaveProperty("auto")
})

test("--auto carries base --wait-ms/--stealth", () => {
	const r = parseArgs(["--auto", "--wait-ms=8000", "--stealth", "example.com"])
	expect(r).toMatchObject({ kind: "run", auto: true, waitMs: 8000, stealth: true })
})

test("throws on --auto with --no-render", () => {
	try {
		parseArgs(["--auto", "--no-render", "example.com"])
		throw new Error("expected throw")
	} catch (e) {
		expect(e).toBeInstanceOf(ArgsError)
		expect((e as ArgsError).message).toMatch(/--auto cannot be combined with --no-render/)
	}
})

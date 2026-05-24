export type ParseResult =
	| {
			kind: "run"
			url: string
			output?: string
			noRender: boolean
			externals: boolean
			json: boolean
			property?: string
			userAgent?: string
			timeoutMs?: number
			stealth?: boolean
			waitUntil?: WaitUntil
			waitMs?: number
			auto?: boolean
	  }
	| { kind: "help" }
	| { kind: "version" }

export const TIMEOUT_MAX_MS = 300_000

export type WaitUntil = "domcontentloaded" | "load" | "networkidle"
const WAIT_UNTIL_VALUES: readonly WaitUntil[] = ["domcontentloaded", "load", "networkidle"]

export class ArgsError extends Error {
	exitCode: number
	constructor(message: string, exitCode = 1) {
		super(message)
		this.name = "ArgsError"
		this.exitCode = exitCode
	}
}

function requireNonEmpty(flag: string, value: string | undefined): string {
	if (value === undefined || value.trim() === "") {
		throw new ArgsError(`${flag} requires a non-empty value`)
	}
	return value
}

function requireValue(flag: string, value: string | undefined): string {
	if (value === undefined || value.startsWith("-")) {
		throw new ArgsError(`${flag} requires a value`)
	}
	return value
}

function parseTimeoutMs(value: string | undefined): number {
	if (value === undefined || value.trim() === "") {
		throw new ArgsError("--timeout requires a value in milliseconds")
	}
	if (!/^\d+$/.test(value.trim())) {
		throw new ArgsError(`--timeout must be a positive integer in milliseconds, got: ${value}`)
	}
	const n = Number(value)
	if (n < 1 || n > TIMEOUT_MAX_MS) {
		throw new ArgsError(`--timeout must be between 1 and ${TIMEOUT_MAX_MS} ms, got: ${n}`)
	}
	return n
}

function parseWaitMs(value: string | undefined): number {
	if (value === undefined || value.trim() === "") {
		throw new ArgsError("--wait-ms requires a value in milliseconds")
	}
	if (!/^\d+$/.test(value.trim())) {
		throw new ArgsError(`--wait-ms must be a non-negative integer in milliseconds, got: ${value}`)
	}
	const n = Number(value)
	if (n > TIMEOUT_MAX_MS) {
		throw new ArgsError(`--wait-ms must be between 0 and ${TIMEOUT_MAX_MS} ms, got: ${n}`)
	}
	return n
}

function parseWaitUntil(value: string | undefined): WaitUntil {
	const v = requireNonEmpty("--wait-until", value)
	if (!(WAIT_UNTIL_VALUES as readonly string[]).includes(v)) {
		throw new ArgsError(`--wait-until must be one of ${WAIT_UNTIL_VALUES.join(", ")}, got: ${v}`)
	}
	return v as WaitUntil
}

export function parseArgs(argv: string[]): ParseResult {
	let url: string | undefined
	let output: string | undefined
	let noRender = false
	let externals = false
	let json = false
	let property: string | undefined
	let userAgent: string | undefined
	let timeoutMs: number | undefined
	let stealth = false
	let waitUntil: WaitUntil | undefined
	let waitMs: number | undefined
	let auto = false
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === "-h" || a === "--help") return { kind: "help" }
		if (a === "-V" || a === "--version") return { kind: "version" }
		if (a === "-o" || a === "--output") {
			output = requireValue(a, requireNonEmpty(a, argv[++i]))
			continue
		}
		if (a.startsWith("--output=")) {
			output = requireNonEmpty("--output", a.slice(9))
			continue
		}
		if (a === "--no-render") {
			noRender = true
			continue
		}
		if (a === "--stealth") {
			stealth = true
			continue
		}
		if (a === "--auto") {
			auto = true
			continue
		}
		if (a === "--externals") {
			externals = true
			continue
		}
		if (a === "-j" || a === "--json") {
			json = true
			continue
		}
		if (a === "-p" || a === "--property") {
			property = requireValue(a, requireNonEmpty(a, argv[++i]))
			continue
		}
		if (a.startsWith("--property=")) {
			property = requireNonEmpty("--property", a.slice("--property=".length))
			continue
		}
		if (a === "--user-agent") {
			userAgent = requireValue(a, requireNonEmpty(a, argv[++i]))
			continue
		}
		if (a.startsWith("--user-agent=")) {
			userAgent = requireNonEmpty("--user-agent", a.slice("--user-agent=".length))
			continue
		}
		if (a === "--timeout") {
			timeoutMs = parseTimeoutMs(argv[++i])
			continue
		}
		if (a.startsWith("--timeout=")) {
			timeoutMs = parseTimeoutMs(a.slice("--timeout=".length))
			continue
		}
		if (a === "--wait-until") {
			waitUntil = parseWaitUntil(argv[++i])
			continue
		}
		if (a.startsWith("--wait-until=")) {
			waitUntil = parseWaitUntil(a.slice("--wait-until=".length))
			continue
		}
		if (a === "--wait-ms") {
			waitMs = parseWaitMs(argv[++i])
			continue
		}
		if (a.startsWith("--wait-ms=")) {
			waitMs = parseWaitMs(a.slice("--wait-ms=".length))
			continue
		}
		if (a.startsWith("-")) throw new ArgsError(`unknown option: ${a}`)
		url = a
	}
	if (!url) throw new ArgsError("URL required (see --help)")
	if (auto && noRender) {
		throw new ArgsError(
			"--auto cannot be combined with --no-render (--auto only escalates rendering)",
		)
	}
	const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
	const run: Extract<ParseResult, { kind: "run" }> = {
		kind: "run",
		url: finalUrl,
		noRender,
		externals,
		json,
	}
	if (output !== undefined) run.output = output
	if (property !== undefined) run.property = property
	if (userAgent !== undefined) run.userAgent = userAgent
	if (timeoutMs !== undefined) run.timeoutMs = timeoutMs
	if (stealth) run.stealth = true
	if (waitUntil !== undefined) run.waitUntil = waitUntil
	if (waitMs !== undefined) run.waitMs = waitMs
	if (auto) run.auto = true
	return run
}

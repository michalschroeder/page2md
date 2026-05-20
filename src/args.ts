export type ParseResult =
	| {
			kind: "run"
			url: string
			output?: string
			noRender: boolean
			externals: boolean
			userAgent?: string
			timeoutMs?: number
	  }
	| { kind: "help" }
	| { kind: "version" }

export const TIMEOUT_MAX_MS = 300_000

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

export function parseArgs(argv: string[]): ParseResult {
	let url: string | undefined
	let output: string | undefined
	let noRender = false
	let externals = false
	let userAgent: string | undefined
	let timeoutMs: number | undefined
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
		if (a === "--externals") {
			externals = true
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
		if (a.startsWith("-")) throw new ArgsError(`unknown option: ${a}`)
		url = a
	}
	if (!url) throw new ArgsError("URL required (see --help)")
	const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
	const run: Extract<ParseResult, { kind: "run" }> = {
		kind: "run",
		url: finalUrl,
		noRender,
		externals,
	}
	if (output !== undefined) run.output = output
	if (userAgent !== undefined) run.userAgent = userAgent
	if (timeoutMs !== undefined) run.timeoutMs = timeoutMs
	return run
}

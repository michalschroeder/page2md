export type ParseResult =
	| { kind: "run"; url: string; output?: string; noRender: boolean; userAgent?: string }
	| { kind: "help" }
	| { kind: "version" }

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

export function parseArgs(argv: string[]): ParseResult {
	let url: string | undefined
	let output: string | undefined
	let noRender = false
	let userAgent: string | undefined
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === "-h" || a === "--help") return { kind: "help" }
		if (a === "-V" || a === "--version") return { kind: "version" }
		if (a === "-o" || a === "--output") {
			output = requireNonEmpty(a, argv[++i])
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
		if (a === "--user-agent") {
			userAgent = requireNonEmpty("--user-agent", argv[++i])
			continue
		}
		if (a.startsWith("--user-agent=")) {
			userAgent = requireNonEmpty("--user-agent", a.slice("--user-agent=".length))
			continue
		}
		if (a.startsWith("-")) throw new ArgsError(`unknown option: ${a}`)
		url = a
	}
	if (!url) throw new ArgsError("URL required (see --help)")
	const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
	const run: Extract<ParseResult, { kind: "run" }> = { kind: "run", url: finalUrl, noRender }
	if (output !== undefined) run.output = output
	if (userAgent !== undefined) run.userAgent = userAgent
	return run
}

export type ParseResult =
	| { kind: "run"; url: string; output?: string; noRender: boolean }
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

export function parseArgs(argv: string[]): ParseResult {
	let url: string | undefined
	let output: string | undefined
	let noRender = false
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === "-h" || a === "--help") return { kind: "help" }
		if (a === "-V" || a === "--version") return { kind: "version" }
		if (a === "-o" || a === "--output") {
			output = argv[++i]
			continue
		}
		if (a.startsWith("--output=")) {
			output = a.slice(9)
			continue
		}
		if (a === "--no-render") {
			noRender = true
			continue
		}
		if (a.startsWith("-")) throw new ArgsError(`unknown option: ${a}`)
		url = a
	}
	if (!url) throw new ArgsError("URL required (see --help)")
	const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
	const result: ParseResult = { kind: "run", url: finalUrl, noRender }
	if (output !== undefined) (result as { output?: string }).output = output
	return result
}

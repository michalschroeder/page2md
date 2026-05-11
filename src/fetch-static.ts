import { prepareInput } from "./clean"

export const DEFAULT_UA =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

const HTML_TYPES = ["text/html", "application/xhtml+xml"]

export async function fetchStaticHtml(
	url: string,
	timeoutMs: number,
	userAgent: string,
): Promise<Document | string> {
	const ctrl = new AbortController()
	const timer = setTimeout(() => ctrl.abort(), timeoutMs)
	try {
		const res = await fetch(url, {
			headers: { "user-agent": userAgent },
			redirect: "follow",
			signal: ctrl.signal,
		})
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		const ct = (res.headers.get("content-type") || "").toLowerCase()
		if (!HTML_TYPES.some((t) => ct.startsWith(t))) {
			throw new Error(`unexpected content-type: ${ct || "(none)"}`)
		}
		return prepareInput(await res.text())
	} finally {
		clearTimeout(timer)
	}
}

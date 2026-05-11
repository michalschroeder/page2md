import { parseHTML } from "linkedom"

const JSON_LD_MARKER = "application/ld+json"

export function prepareInput(html: string): Document | string {
	if (!html.includes("<pre") && !html.includes(JSON_LD_MARKER)) return html

	const { document } = parseHTML(html)

	const isLineNumberGutter = (el: Element) => {
		const lines = (el.textContent || "")
			.trim()
			.split("\n")
			.map((l) => l.trim())
		return lines.length > 1 && lines.every((l, i) => l === String(i + 1))
	}
	const cleanPres = (root: Document | Element) => {
		for (const pre of root.querySelectorAll("pre")) if (isLineNumberGutter(pre)) pre.remove()
	}

	cleanPres(document)

	for (const script of document.querySelectorAll(`script[type="${JSON_LD_MARKER}"]`)) {
		try {
			const data = JSON.parse(script.textContent || "")
			const visit = (node: unknown): void => {
				if (Array.isArray(node)) {
					for (const item of node) visit(item)
					return
				}
				if (!node || typeof node !== "object") return
				const obj = node as Record<string, unknown>
				if (typeof obj.articleBody === "string") {
					const { document: doc } = parseHTML(`<body>${obj.articleBody}</body>`)
					cleanPres(doc)
					obj.articleBody = doc.body.innerHTML
				}
				for (const key of Object.keys(obj)) visit(obj[key])
			}
			visit(data)
			script.textContent = JSON.stringify(data)
		} catch {
			// Malformed JSON-LD — leave it alone.
		}
	}

	return document
}

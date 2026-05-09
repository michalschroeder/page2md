import { parseHTML } from "linkedom"

export function cleanLineNumberGutters(html: string): string {
	const { document } = parseHTML(html)

	const isLineNumberGutter = (el: Element) => {
		const lines = (el.textContent || "").trim().split("\n").map((l) => l.trim())
		return lines.length > 1 && lines.every((l, i) => l === String(i + 1))
	}
	const cleanPres = (root: Document | Element) => {
		for (const pre of root.querySelectorAll("pre")) if (isLineNumberGutter(pre)) pre.remove()
	}

	cleanPres(document)

	for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			const data = JSON.parse(script.textContent || "")
			const visit = (node: any) => {
				if (Array.isArray(node)) return node.forEach(visit)
				if (!node || typeof node !== "object") return
				if (typeof node.articleBody === "string") {
					const { document: doc } = parseHTML(`<body>${node.articleBody}</body>`)
					cleanPres(doc)
					node.articleBody = doc.body.innerHTML
				}
				for (const key of Object.keys(node)) visit(node[key])
			}
			visit(data)
			script.textContent = JSON.stringify(data)
		} catch {
			// Malformed JSON-LD — leave it alone.
		}
	}

	return document.toString()
}

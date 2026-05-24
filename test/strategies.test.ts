import { expect, test } from "bun:test"
import { AUTO_WAIT_MS, buildStrategies } from "../src/strategies"

const keyOf = (s: { stealth: boolean; waitUntil: string; waitMs: number }) =>
	`${s.stealth}|${s.waitUntil}|${s.waitMs}`

test("without --auto: single attempt honoring flags exactly", () => {
	const s = buildStrategies({ auto: false, stealth: true, waitUntil: "networkidle", waitMs: 1000 })
	expect(s).toEqual([{ stealth: true, waitUntil: "networkidle", waitMs: 1000, label: "" }])
})

test("without --auto: unset waitMs becomes 0", () => {
	const s = buildStrategies({
		auto: false,
		stealth: false,
		waitUntil: "domcontentloaded",
		waitMs: undefined,
	})
	expect(s[0].waitMs).toBe(0)
})

test("--auto, no flags: base → wait → evasive, all distinct", () => {
	const s = buildStrategies({
		auto: true,
		stealth: false,
		waitUntil: "domcontentloaded",
		waitMs: undefined,
	})
	expect(s.map(keyOf)).toEqual([
		`false|domcontentloaded|0`,
		`false|domcontentloaded|${AUTO_WAIT_MS}`,
		`true|domcontentloaded|${AUTO_WAIT_MS}`,
	])
})

test("--auto escalation forces domcontentloaded even when base is networkidle", () => {
	const s = buildStrategies({
		auto: true,
		stealth: false,
		waitUntil: "networkidle",
		waitMs: undefined,
	})
	// rung 0 honors the user's networkidle; escalation rungs fall back so a
	// hanging networkidle can't block every attempt.
	expect(s[0].waitUntil).toBe("networkidle")
	expect(s.slice(1).every((r) => r.waitUntil === "domcontentloaded")).toBe(true)
})

test("--auto with explicit --wait-ms equal to escalation drops the duplicate rung", () => {
	const s = buildStrategies({
		auto: true,
		stealth: false,
		waitUntil: "domcontentloaded",
		waitMs: 8000,
	})
	// base (dc/8000) and the wait rung (dc/8000) collapse to one; stealth rung remains.
	expect(s.map(keyOf)).toEqual([`false|domcontentloaded|8000`, `true|domcontentloaded|8000`])
})

test("--auto --wait-ms 0 is honored (not overridden to default) and dedupes", () => {
	const s = buildStrategies({
		auto: true,
		stealth: false,
		waitUntil: "domcontentloaded",
		waitMs: 0,
	})
	// explicit 0 stays 0; wait rung equals base and is dropped; stealth rung remains.
	expect(s.map(keyOf)).toEqual([`false|domcontentloaded|0`, `true|domcontentloaded|0`])
})

test("--auto --stealth does not produce a triple-stealth ladder", () => {
	const s = buildStrategies({
		auto: true,
		stealth: true,
		waitUntil: "domcontentloaded",
		waitMs: undefined,
	})
	// base (stealth/0) and wait rung (stealth/6000) differ; the final all-stealth
	// rung duplicates the wait rung and is dropped → at most 2 stealth launches.
	expect(s.map(keyOf)).toEqual([`true|domcontentloaded|0`, `true|domcontentloaded|${AUTO_WAIT_MS}`])
})

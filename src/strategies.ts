import type { WaitUntil } from "./args"

export type Strategy = { stealth: boolean; waitUntil: WaitUntil; waitMs: number; label: string }

export const AUTO_WAIT_MS = 6_000

export type StrategyOpts = {
	auto: boolean
	stealth: boolean
	waitUntil: WaitUntil
	/** Explicit --wait-ms, or undefined when unset (distinct from an explicit 0). */
	waitMs: number | undefined
}

// Build the render attempts to try in order.
//
// Without --auto: a single attempt honoring the flags exactly as given.
//
// With --auto: escalate base → wait → evasive+wait. Escalation rungs force
// `domcontentloaded` so a hanging `--wait-until networkidle` in the base can't
// block every attempt — the post-load delay is the real lever. Rungs identical
// to an earlier one (e.g. when --wait-ms already equals the escalation wait) are
// dropped so no attempt is wasted re-running the same settings.
export function buildStrategies(opts: StrategyOpts): Strategy[] {
	const base: Strategy = {
		stealth: opts.stealth,
		waitUntil: opts.waitUntil,
		waitMs: opts.waitMs ?? 0,
		label: opts.auto ? "default" : "",
	}
	if (!opts.auto) return [base]

	const w = opts.waitMs ?? AUTO_WAIT_MS
	const rungs: Strategy[] = [
		base,
		{ stealth: opts.stealth, waitUntil: "domcontentloaded", waitMs: w, label: `--wait-ms ${w}` },
		{
			stealth: true,
			waitUntil: "domcontentloaded",
			waitMs: w,
			label: `evasive rendering + --wait-ms ${w}`,
		},
	]

	const seen = new Set<string>()
	return rungs.filter((s) => {
		const key = `${s.stealth}|${s.waitUntil}|${s.waitMs}`
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})
}

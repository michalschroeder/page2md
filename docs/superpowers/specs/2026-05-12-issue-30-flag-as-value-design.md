# Issue #30 — flag-as-value detection for `-o` and `--user-agent`

## Problem

`src/args.ts` consumes the next token as a value without checking whether
it looks like a flag. Likely user typos:

- `page2md -o --no-render url` → `output = "--no-render"`
- `page2md --user-agent --no-render url` → `userAgent = "--no-render"`

## Scope

`src/args.ts` only. Space-separated value form for `-o` / `--output` and
`--user-agent`. The `=` form (`--output=--foo`, `--user-agent=--foo`) is
unaffected — explicit `=` is unambiguous intent.

Out of scope: empty-value rejection for `-o`/`--output` (tracked in #29).

## Change

Add a small helper used at the two affected call sites:

```ts
function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value.startsWith("-")) {
    throw new ArgsError(`${flag} requires a value`)
  }
  return value
}
```

Call sites:

- `-o` / `--output` (space form): `output = requireValue("-o/--output", argv[++i])`
- `--user-agent` (space form): run `requireValue("--user-agent", argv[++i])`
  first, then the existing non-empty check (preserves the existing
  `--user-agent requires a non-empty value` message for the empty case).

## Error messages

- `-o/--output requires a value`
- `--user-agent requires a value` (flag-looking value)
- `--user-agent requires a non-empty value` (existing; empty/whitespace)

## Tests (`test/args.test.ts`)

- `parseArgs(["-o", "--no-render", "example.com"])` throws `ArgsError`
  matching `/-o\/--output requires a value/`.
- `parseArgs(["--output", "--foo", "url"])` throws same.
- `parseArgs(["--user-agent", "--no-render", "url"])` throws `ArgsError`
  matching `/--user-agent requires a value/`.
- `parseArgs(["--output=--foo", "example.com"])` still parses; `output`
  equals `"--foo"` (explicit `=` form unaffected).
- Existing `-o` trailing-missing case still throws (now via the same
  helper).

## Non-goals

- No change to the `=` form.
- No new exit codes; reuse `ArgsError` (exit 1).
- No help-text changes.

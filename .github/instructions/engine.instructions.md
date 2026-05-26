---
applyTo: "src/engine/**"
---

# Engine Layer Instructions

These instructions apply to all files under `src/engine/`.

## Core constraints

- **Pure TypeScript only** — no React imports, no DOM APIs, no `window`, no `document`, no side effects
- **No `any`** — all parameters and return types must be fully typed
- **No `enum` or `namespace`** — use `as const` objects or union types (`erasableSyntaxOnly`)
- **No `eslint-disable`** or `@ts-ignore` — fix the root cause

## Module structure

- Export only named functions and types (no default exports)
- Functions must be deterministic given the same inputs
- Throw `RangeError` for out-of-bounds inputs with a descriptive message: `throw new RangeError(\`functionName: description, got \${value}\`)`
- Use JSDoc on every exported function: `@param`, `@returns`, `@throws`

## Coordinate system (cut optimizer)

- `x` → across sheet width (`sheetWidth`)
- `y` → along sheet length / grain (`sheetLength`)
- Invariants: `p.x + p.width ≤ sheetWidth` AND `p.y + p.length ≤ sheetLength`

## Testing requirement

Every engine function must have a corresponding unit test in `tests/engine/`.
Use `it.each` for parametrised input/output pairs. Minimum 80% line coverage.

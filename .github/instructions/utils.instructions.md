---
applyTo: src/utils/**
---

# Utilities Instructions — Cabinet Planner

Rules enforced for every file under `src/utils/`.

## Purpose

`src/utils/` contains **export helpers and serialisation utilities** — pure
functions that transform data for output formats (BOM, DXF, G-code, URL state,
project storage). They have no UI, no Zustand store imports, and no side effects
beyond returning a value or triggering a browser download.

## Pure function rules

- Every exported function must be **pure** (same input → same output, no
  observable side effects except `URL.createObjectURL` / `a.click()` download
  helpers).
- No React imports.
- No Zustand store imports (`useCabinetStore`, etc.). Receive state as arguments.
- No `window` access in functions that should be testable — isolate DOM calls
  to a thin helper at the bottom of the file.

## TypeScript

- `erasableSyntaxOnly: true` — no `enum`, no `namespace`, no `const enum`.
- Use `as const` objects or union types for constants.
- No `as any`. Validate unknown data at system boundaries with type guards.

## Security (OWASP A03 Injection)

- String-based exports (G-code, DXF, SVG) must sanitise part names and
  user-provided text: strip control characters, limit length to ≤ 255 chars.
- URL state serialisation must not `eval()` or execute arbitrary code.
- When parsing JSON from localStorage or URL params, wrap in try/catch and
  validate the shape with a type guard before use.

## Testing

- Every utility must have a corresponding test in `tests/utils/`.
- Use `it.each` for parametrised positive/negative cases.
- Do NOT use real `URL.createObjectURL` in tests — mock it.

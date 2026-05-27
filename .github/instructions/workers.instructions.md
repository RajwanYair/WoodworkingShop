---
applyTo: src/workers/**
---

# Web Worker Instructions — Cabinet Planner

Rules enforced for every file under `src/workers/`.

## Comlink / Vite pattern

```ts
// ✅ Expose the worker API with Comlink
import { expose } from 'comlink';
expose({ run });
```

- Import workers in app code with the `?worker` Vite suffix:

```ts
import MyWorker from '../workers/my.worker?worker';
```

- Never import worker files directly in unit tests — use the sync engine
  function fallback.

## What workers MUST NOT do

- No React imports (`react`, `react-dom`).
- No direct DOM API access (`document`, `window`, `localStorage`).
- No Zustand store imports — workers are stateless; receive all input as args.
- No `eval()` or `new Function()` — security and CSP violation.
- No `console.log` in production paths — use structured error returns instead.

## What workers SHOULD do

- Accept a plain-data message/argument and return a plain-data result.
- Use `postMessage` only via Comlink's `expose()`; never raw `self.postMessage`.
- Handle errors explicitly and re-throw structured objects:

```ts
try { ... }
catch (err) { throw new Error(`CutOptimizer: ${String(err)}`); }
```

## TypeScript

- `erasableSyntaxOnly: true` — no `enum`, no `namespace`, no `const enum`.
- No `as any`; all worker payloads must be fully typed.
- Import types from `../engine/` (pure TS) — never from `../components/`.

## Testing

- Unit tests must use the sync engine function, not the worker file.
- Worker smoke tests (if needed) go in `tests/workers/` with a mock `postMessage`.

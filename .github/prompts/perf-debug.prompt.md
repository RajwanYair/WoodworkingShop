---
mode: agent
description: Diagnose and fix Lighthouse / runtime performance regressions — TBT, FCP, and sub-100 ms config→preview.
---

# Performance Debugging

You are diagnosing and fixing performance regressions in the Cabinet Planner project.

## Performance Targets

| Metric                | Target   | Measurement            |
| --------------------- | -------- | ---------------------- |
| FCP (First Content)   | < 1.2 s  | Lighthouse (mobile)    |
| TBT (Total Blocking)  | < 200 ms | Lighthouse (mobile)    |
| Config → preview      | < 100 ms | Vitest bench           |
| Cut optimizer (1 run) | < 50 ms  | Vitest bench           |
| Bundle (gzipped)      | < 1.8 MB | `npm run bundle:check` |

## Steps

### 1 — Baseline

```bash
npm run lighthouse
```

Review `.lighthouseci/` output. Note TBT, FCP, and CLS scores.

### 2 — Identify regressions

```bash
npm run bench:check
```

Compare against `config/bench-budget.json`. Any bench that exceeds its budget is a regression.

### 3 — Common root causes and fixes

| Symptom                  | Likely cause                             | Fix                                          |
| ------------------------ | ---------------------------------------- | -------------------------------------------- |
| High TBT on load         | Heavy sync work on main thread           | Move to Web Worker (`?worker` import suffix) |
| Slow config → preview    | Memoization missing in engine            | Use `memo()` from `src/engine/memo.ts`       |
| Large initial bundle     | Vendor lib loaded eagerly                | Use `import()` dynamic chunk or `React.lazy` |
| Re-render storm in store | Selector returns new object every render | Use shallow equality or selector memoisation |
| Slow PDF generation      | PDF rendered on main thread              | Ensure PDF worker is spawned via `?worker`   |

### 4 — Profiling

Open Chrome DevTools → **Performance** tab → record a config-change interaction.

Look for:

- Long tasks (> 50 ms) on the main thread
- Forced reflows (`style`/`layout` calls inside loops)
- Component re-renders caused by unstable prop references

### 5 — Constraints

- **Never disable the bench CI gate** — fix the root cause
- **Never inline heavy synchronous logic** in React render or store selectors
- **Do not add new prod deps** for caching — use native `Map` / `WeakMap` or `useMemo`
- **No `useEffect` polling** — use event-driven updates via the store

### 6 — Validate

```bash
npm run bench:check   # all benchmarks within budget
npm run lighthouse    # TBT < 200 ms, FCP < 1.2 s
npm run bundle:check  # total bundle within 1.8 MB
```

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.

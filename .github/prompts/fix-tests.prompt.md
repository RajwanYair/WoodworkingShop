---
mode: agent
description: Diagnose and fix failing unit tests — trace assertion failures, update snapshots, fix regressions.
---

# Fix Tests

You are diagnosing and fixing failing unit tests in the Cabinet Planner project.

## Task

Run `npx vitest run` and fix all failing tests until the suite passes green.

## Strategy

1. Run `npx vitest run 2>&1` — capture full output.
2. Identify each failing test: file, test name, assertion, actual vs. expected.
3. Categorize failures:
   - **Stale assertion** — test expectation outdated after a code change → update test
   - **Regression** — new code broke existing behavior → fix the source code
   - **Type error in test** — test doesn't compile → fix the test's type usage
   - **Missing mock** — test uses a browser API without setup → add to `tests/setup.ts`
4. Fix each failure in the appropriate file.
5. Re-run `npx vitest run` — confirm all pass.
6. Run `npm run quality` — confirm no lint/type regressions.

## Constraints

- **Never skip tests** (`it.skip`, `describe.skip`) — fix the root cause.
- **Never use `as any`** in test files — properly type test data.
- **Use `cfg()` helper** from `tests/helpers.ts` to build CabinetConfig fixtures.
- **Use `it.each`** when fixing multiple related assertions.

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.

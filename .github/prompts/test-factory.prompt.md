---
mode: agent
description: Convert repetitive Vitest tests in a file to it.each / describe.each parameterised form.
---

# Test Factory

You are improving test maintainability in the WoodworkingShop Cabinet Planner project.

## Task

Shorten `${testFile}` (currently ${lineCount} lines) by at least 20 % using `it.each` and `describe.each` patterns.

## Mandatory constraints

- **Import style**: Keep `import { describe, it, expect } from 'vitest'` — do not switch to globals.
- **Test factory helper**: Use `cfg(overrides)` from `tests/helpers.ts` to build `CabinetConfig` variants. Do not inline large objects.
- **Group paired positive/negative cases**: A single `it.each` table should cover both valid and invalid inputs when the assertions are symmetric.
- **One `expect` cluster per `it`**: Group all related assertions for a scenario inside one `it` block rather than spreading them across multiple `it` calls.
- **No `as any`**, no `eslint-disable`, no `@ts-ignore`.
- **`erasableSyntaxOnly: true`**: Use `as const` casts on string union literals in table rows.
- Keep the file ≤ 400 lines after refactoring.

## Pattern to apply

```ts
// BEFORE — repetitive positive/negative pair
it('raises FOO for narrow cabinet', () => {
  expect(hasCode(validateConfig(cfg({ width: 100 })), 'FOO')).toBe(true);
});
it('does not raise FOO for wide cabinet', () => {
  expect(hasCode(validateConfig(cfg({ width: 800 })), 'FOO')).toBe(false);
});

// AFTER — parametrised table
it.each([
  ['narrow cabinet triggers FOO', { width: 100 }, true],
  ['wide cabinet does not trigger FOO', { width: 800 }, false],
] as const)('%s', (_, overrides, expected) => {
  expect(hasCode(validateConfig(cfg(overrides)), 'FOO')).toBe(expected);
});
```

## Steps

1. Read the full test file with `read_file`.
2. Identify groups of 2+ structurally identical `it` blocks that differ only in input/assertion values.
3. Collapse each group into an `it.each` table.
4. Extract any repeated fixture objects into a `const` near the top of the file.
5. Run `npm test -- --reporter=verbose ${testFile}` — all tests must still pass with the same count.
6. Confirm the line count dropped by ≥ 20 %.

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.

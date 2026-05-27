---
mode: agent
description: Find and remove dead code, unused exports, and orphaned files.
---

# Dead Code Cleanup

Run Knip to detect dead code, then remove it without breaking anything.

## Steps

1. Run `npx knip` to list unused files, exports, and dependencies.
2. For each finding:
   - Verify it is truly unused (grep for imports/usages).
   - If dead: remove the export, file, or dependency.
   - If it is a barrel re-export used externally: add to `knip.entry` in `package.json`.
3. After all removals, run `npm run quality && npm test` to confirm nothing breaks.
4. Run `npx knip` again to confirm zero issues.

## Rules

- Never suppress Knip warnings without justification.
- Do not delete test files or benchmark files.
- If a utility is planned for future use, add it to `knip.entry` with a `!` suffix.

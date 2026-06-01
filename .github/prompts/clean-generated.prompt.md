---
mode: agent
description: Verify all intermediate/generated files go to $TEMP, clean any that leaked into workspace.
---

# Clean Generated Files

Enforce the rule that all intermediate and generated files go to `$TEMP`.

## Audit

Check for generated/intermediate files that should not be in the workspace:

```bash
# Check for common offenders
ls -la .eslintcache .stylelintcache .vite_cache 2>/dev/null
ls -la coverage/ playwright-report/ test-results/ 2>/dev/null
ls -la tsconfig.tsbuildinfo 2>/dev/null
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" 2>/dev/null
```

## Expected locations

| Artifact           | Expected path                            |
| ------------------ | ---------------------------------------- |
| ESLint cache       | `$TEMP/WoodworkingShop/.eslintcache`     |
| Vite cache         | `$TEMP/WoodworkingShop/.vite_cache`      |
| Coverage reports   | `$TEMP/WoodworkingShop/coverage/`        |
| Playwright reports | `$TEMP/WoodworkingShop/playwright/`      |
| TS build info      | `$TEMP/WoodworkingShop/*.tsbuildinfo`    |
| Lighthouse reports | `$TEMP/WoodworkingShop/.lighthouseci/`   |
| Bundle analysis    | `$TEMP/WoodworkingShop/bundle-analysis/` |

## Fix

For any file found in workspace root that belongs in `$TEMP`:

1. Update the relevant config to point to `$TEMP`.
2. Add path to `.gitignore` if not already present.
3. Delete the stale file from workspace.

## Verify

```bash
git status --short  # Should show no untracked generated files
npm run build       # Build still works with new paths
npm test            # Tests still pass
```

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.

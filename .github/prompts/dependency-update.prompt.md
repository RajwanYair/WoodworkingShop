---
mode: agent
description: Review and apply Dependabot PRs — verify changes are safe, run quality gates, and merge patch/minor updates.
---

# Dependency Update Review

You are reviewing and applying dependency updates for the Cabinet Planner project.

## Inputs

- Dependabot PR(s) to review: **`${prNumbers}`** (or all open Dependabot PRs if not specified)

## Step 1 — Fetch PR details

For each Dependabot PR:

1. Read the PR diff to understand what changed
2. Check the CHANGELOG / release notes of the updated package
3. Classify the update:

| Update type   | Action                                                 |
| ------------- | ------------------------------------------------------ |
| Patch (x.y.Z) | Merge after tests pass                                 |
| Minor (x.Y.z) | Merge after tests pass + verify no breaking API change |
| Major (X.y.z) | Manual review required — check migration guide         |

## Step 2 — Run quality gates locally

```bash
npm ci                        # install updated deps
npm run quality               # typecheck + lint + format + i18n
npm test                      # all unit tests
npm run build && npm run bundle:check   # build still fits budget
```

If any gate fails:

- For a **type error**: update the type annotation to match the new API
- For a **lint error**: update the import path or usage per new API
- For a **test failure**: update test fixtures to match new behaviour (verify new behaviour is correct first)
- For a **bundle budget overrun**: check if the package grew significantly; may warrant reverting the update

## Step 3 — Merge safe updates

Merge patch and minor updates that pass all gates:

```bash
gh pr merge <number> --squash --auto
```

## Step 4 — Document major updates

For major version bumps, add an entry to `CHANGELOG.md [Unreleased]`:

```markdown
### Chore

- Upgraded `<package>` from vX to vY — see [migration guide](url)
```

## Constraints

- Never force-merge a failing PR
- Never downgrade a dependency to avoid fixing the code
- Verify `≤ 7 prod deps` rule is not violated (check `package.json` `dependencies`)

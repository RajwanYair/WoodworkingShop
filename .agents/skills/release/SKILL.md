---
description: "Create a versioned release of a project. Use when: bumping the version number, publishing a new release, updating CHANGELOG, tagging a git commit, or preparing a GitHub release."
---

# Release Skill — Generic Template

This skill provides a reusable release workflow for any project in the MyScripts workspace.

## Prerequisites

- All CI checks passing (lint, typecheck, tests)
- No `eslint-disable`, `@ts-ignore`, or `# type: ignore` suppressions
- CHANGELOG entry prepared
- All milestone issues closed

## Version File Table

> **Each project must maintain its own version file table.** Copy this template
> into `<project>/.github/skills/release/SKILL.md` and fill in the file list.

| # | File                      | Pattern to Replace          | Notes                      |
|---|---------------------------|-----------------------------|----------------------------|
| 1 | `package.json`            | `"version": "X.Y.Z"`       | npm/node projects          |
| 2 | `pyproject.toml`          | `version = "X.Y.Z"`        | Python projects            |
| 3 | `CHANGELOG.md`            | Add `## [X.Y.Z]` header    | All projects               |
| 4 | `README.md`               | Version badge/header        | If present                 |
| 5 | `copilot-instructions.md` | Version in title            | GitHub Copilot config      |
| 6 | _project-specific files_  | _varies_                    | SW, docs, instructions     |

## Release Workflow

### 1. Pre-Release Gate

```powershell
# TypeScript projects
npx tsc --noEmit
npx eslint src tests --max-warnings 0
npx vitest run

# Python projects
mypy src
ruff check src tests
pytest --tb=short
```

All must exit 0. Zero tolerance for suppressions.

### 2. Version Bump

1. Confirm current version from `package.json` or `pyproject.toml`
2. Replace old version → new version in every file from the table
3. Add CHANGELOG entry: `## [X.Y.Z] — YYYY-MM-DD`

### 3. Commit & Tag

```powershell
git add -A
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

### 4. GitHub Release

```powershell
gh release create vX.Y.Z --generate-notes --title "vX.Y.Z"
```

### 5. Post-Release

- Verify CI passes on the tagged commit
- Update any downstream references (parent README, etc.)
- Bump to next dev version if using pre-release workflow

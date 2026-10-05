---
mode: agent
description: Prepare and publish a new Cabinet Planner release — version bump, CHANGELOG, tag, and GitHub Release.
---

# Release

You are publishing a new Cabinet Planner release.

## Pre-flight checklist (verify before any changes)

1. `npm run check` — must pass with 0 errors / 0 warnings
   > `check` runs quality checks in parallel (`quality:fast`) then tests — use `npm run quality` if you need sequential output for debugging
2. `npm run dead:check` — no orphaned exports
3. `git status` — confirm all candidate changes are intentional and no unrelated user changes are present
4. `CHANGELOG.md [Unreleased]` section is populated
5. `ROADMAP.md` sprint items marked DONE where applicable
6. A GitHub release issue exists with target version, scope, and acceptance criteria
7. Work is on an issue-specific branch from the latest `origin/main`; never make release changes on shared `main`

## Steps

### 1 — Determine the new version

- Read `package.json` for current version (e.g. `3.72.0`)
- Classify changes in `CHANGELOG.md [Unreleased]`:
  - **Breaking change** → major bump (`4.0.0`)
  - **New feature / enhancement** → minor bump (`3.73.0`)
  - **Bug-fix / chore only** → patch bump (`3.72.1`)
- Choose target version accordingly.

### 2 — Update version in `package.json`

```bash
npm version <major|minor|patch> --no-git-tag-version
```

### 3 — Update `CHANGELOG.md`

- Rename `[Unreleased]` to `[X.Y.Z] — YYYY-MM-DD` with today's date
- Add a new empty `[Unreleased]` section at the top
- Keep format: `### Added / Changed / Fixed / Performance / Chore`

### 4 — Update version references

Files that embed the version string:

- `.github/copilot-instructions.md` — `Current release: vX.Y.Z`
- `AGENTS.md` — header line with version
- `ROADMAP.md` — `Current version: X.Y.Z`

Run a search: `rg -n "v?[0-9]+\.[0-9]+\.[0-9]+" .github/ *.md`

### 5 — Run `npm run release:build`

```bash
npm run release:build   # build + bundle:check + sbom
```

### 6 — Commit and open the release PR

```bash
git add -A
git commit -m "chore: release vX.Y.Z"
git push -u origin issue-<number>-release-vX.Y.Z
gh pr create --base main --title "chore: release vX.Y.Z" --body "Fixes #<issue>"
```

Wait for required checks and review, then merge using the approved repository strategy. Never push release preparation directly to `main`.

### 7 — Tag the merged release commit

After merge, fetch `origin/main`, verify the release PR is included, and create/push the annotated tag from that merged commit only. Never force-push or retarget a published tag.

### 8 — Verify GitHub Release

Pushing the annotated `vX.Y.Z` tag triggers `.github/workflows/release.yml`, which builds and attaches
the release archive, checksum, and SBOM and creates the `WoodworkingShop vX.Y.Z` release. Do not
create a duplicate release manually; verify the workflow run and published artifacts after the push.

## Constraints

- Never skip `npm run check` before bumping
- Never force-push after tagging
- Never commit or push release preparation directly to `main`; tag only after the reviewed release PR is merged
- Keep release commit message format: `chore: release vX.Y.Z`
- The release workflow must publish its generated SBOM, archive, and checksum

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.

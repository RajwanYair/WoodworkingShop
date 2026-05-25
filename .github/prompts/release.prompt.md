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
3. `git status` — working tree is clean (all changes committed)
4. `CHANGELOG.md [Unreleased]` section is populated
5. `ROADMAP.md` sprint items marked DONE where applicable

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

Run a search: `grep -r "3\.\d\+\.\d\+" --include="*.md" .github/ *.md`

### 5 — Run `npm run release:build`

```bash
npm run release:build   # build + bundle:check + sbom
```

### 6 — Commit and tag

```bash
git add -A
git commit -m "chore: release vX.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --follow-tags
```

### 7 — Create GitHub Release

```bash
gh release create vX.Y.Z --generate-notes --title "v X.Y.Z"
```

Attach the generated SBOM from `dist/` if present.

## Constraints

- Never skip `npm run check` before bumping
- Never force-push after tagging
- Keep release commit message format: `chore: release vX.Y.Z`
- SBOM file from `dist/sbom.json` should be attached to the GitHub Release

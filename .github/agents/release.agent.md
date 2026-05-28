---
mode: agent
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - run_in_terminal
  - get_errors
  - grep_search
  - file_search
  - list_dir
  - manage_todo_list
  - vscode_renameSymbol
description: >
  Full automated release workflow: pre-flight checks → version bump →
  CHANGELOG → version references → build → commit → tag → GitHub Release.
---

# Release Agent — Cabinet Planner

You are the Cabinet Planner **release agent**. Follow every step in order.
Do not skip the pre-flight gate.

## Pre-flight (must all pass before any changes)

```bash
npm run check          # quality:fast + tests — 0 errors required
npm run dead:check     # 0 orphaned exports required
git status             # working tree must be clean
```

Also verify:

- `CHANGELOG.md [Unreleased]` section is populated with at least one entry
- `ROADMAP.md` sprint items are marked DONE where applicable

**STOP** if any pre-flight check fails. Fix first, release second.

## Step 1 — Determine version

Read `package.json` for current version. Classify `CHANGELOG.md [Unreleased]`:

| Change type                 | Bump  |
| --------------------------- | ----- |
| Breaking API / removal      | major |
| New feature / enhancement   | minor |
| Bug fix / chore / docs only | patch |

## Step 2 — Bump version

```bash
npm version <major|minor|patch> --no-git-tag-version
```

## Step 3 — Update CHANGELOG.md

- Rename `[Unreleased]` → `[X.Y.Z] — YYYY-MM-DD` (today's date)
- Add a new empty `[Unreleased]` section at the top
- Keep sections: `### Added / Changed / Fixed / Performance / Chore`

## Step 4 — Update version references

Search and update the version string in:

- `.github/copilot-instructions.md` — `Current release: vX.Y.Z`
- `AGENTS.md` — header version line
- `ROADMAP.md` — `Current version: X.Y.Z`

```bash
grep -r "4\.[0-9]\+\.[0-9]\+" --include="*.md" .github/ *.md
```

## Step 5 — Release build

```bash
npm run release:build   # build + bundle:check + sbom
```

## Step 6 — Commit and tag

```bash
git add -A
git commit -m "chore: release vX.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --follow-tags
```

## Step 7 — GitHub Release

```bash
gh release create vX.Y.Z --generate-notes --title "v X.Y.Z"
```

Attach `dist/sbom.json` if present.

## Constraints

- Never skip `npm run check`
- Never force-push after tagging
- Commit message must be exactly: `chore: release vX.Y.Z`
- Do not bump the version if `npm run check` fails

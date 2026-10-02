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
git status             # confirm candidate changes are intentional and no unrelated user changes are present
```

Also verify:

- `CHANGELOG.md [Unreleased]` section is populated with at least one entry
- `ROADMAP.md` release-blocking sprint items and clean-checkout acceptance are complete

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
rg -n "v?[0-9]+\.[0-9]+\.[0-9]+" .github/ *.md
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

## Step 7 — Verify GitHub Release

Pushing the annotated `vX.Y.Z` tag triggers `.github/workflows/release.yml`, which builds the
release archive, checksum, and SBOM and creates the `WoodworkingShop vX.Y.Z` GitHub Release. Do not
create a duplicate release manually. Verify the workflow run and published artifacts after the push.

## Constraints

- Never skip `npm run check`
- Never force-push after tagging
- Commit message must be exactly: `chore: release vX.Y.Z`
- Do not bump the version if `npm run check` fails

## Definition of done

1. Pre-flight checks pass on a clean working tree.
2. Version and release metadata are updated consistently.
3. Release build artifacts are generated successfully.
4. The release commit passes clean-checkout acceptance before it is tagged and pushed without history rewrites.
5. The release workflow completes and publishes its artifacts; report the release URL.

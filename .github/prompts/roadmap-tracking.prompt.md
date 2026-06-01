---
mode: agent
description: Track and update ROADMAP.md sprint statuses, verify phase completion, plan next phase.
---

# Roadmap Tracking

Maintain the project roadmap and sprint progress.

## Steps

### 1 — Audit current phase

Read `ROADMAP.md` and `.github/copilot-instructions.md` to identify:

- Current phase number and sprints.
- Which sprints are marked Done vs TODO vs WIP.
- Any discrepancies between ROADMAP.md and copilot-instructions.md.

### 2 — Sync status

Ensure both files agree on sprint statuses. The source of truth is:

- `git log --oneline` — committed sprints are DONE.
- `CHANGELOG.md [Unreleased]` — work in progress for current sprint.

### 3 — Plan next phase

When all sprints in current phase are DONE:

1. Mark the phase as complete in ROADMAP.md.
2. Add next phase with 5 sprints (sequential numbering).
3. Update the Active Sprint table in `.github/copilot-instructions.md`.
4. Update `AGENTS.md` with the new phase reference.

### 4 — Version alignment

Ensure `package.json` version aligns with the release sprint:

- Minor bump per phase completion.
- Patch bump per individual sprint (if releasing mid-phase).

## Rules

- Never skip sprint numbers.
- Each phase has exactly 5 sprints.
- Sprint commit format: `feat(<scope>): Sprint NNN — <summary> (Phase NN)`

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.

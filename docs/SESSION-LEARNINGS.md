# WoodworkingShop Session Learnings

> Snapshot: 2026-10-12. Source: 13 locally indexed WoodworkingShop Copilot sessions, 470 turns, from 2026-08-02 through 2026-10-12.

This is a short index of recurring, actionable lessons from project work. It is not a transcript or a replacement for the repository's [architecture](ARCHITECTURE.md), [roadmap](../ROADMAP.md), [sprint history](SPRINT-HISTORY.md), or [engineering decisions](ENGINEERING-DECISIONS.md). The local session index may omit cloud-only, unindexed, and other-device chats; do not treat this snapshot as exhaustive session history.

## Issue and Branch Workflow

- Reserve roadmap work with a GitHub issue before implementation. Start one issue-scoped branch from freshly fetched `origin/main`; inspect status and ahead/behind counts before syncing. Keep concurrent issues on separate branches, and preserve other contributors' work.
- A clean or green PR is not permission to merge. Check its target branch, reviews, required checks, and dependencies. Do not close an issue as complete until its linked work is merged or the owner confirms another disposition.
- Before editing, identify the code that decides the behavior, state one falsifiable hypothesis, and choose the cheapest check that can disprove it. Keep the first edit narrow and run that check immediately.
- Stage explicit paths, inspect the staged diff, and use a commit message that describes the change and references its issue. Never use a broad stage when unrelated work may be present.

Canonical workflow: [GitHub governance](MCP-GITHUB-GOVERNANCE.md), [repository instructions](../.github/copilot-instructions.md), and [global workflow instructions](../.github/instructions/ryair-global.instructions.md).

## Debugging and Validation

- Start with the narrow failing test or validator. If it fails, repair the same slice and rerun it before widening validation. Run `npm run check` before committing and `npm run ci` when validating the full build/release gate; do not weaken budgets just to get green.
- Separate a product regression from a test-environment failure. Reproduce the behavior, inspect the actual failing assertion and logs, then use existing mocks or browser tests to isolate it. A test that passes under load once is not enough to dismiss a reproducible failure.
- Read complete command output when the terminal says it was saved or truncated. A successful wrapper can hide a non-blocking inner failure; inspect the underlying step and conclusion rather than trusting only the top-level status.
- For GitHub checks, distinguish `failure`, `cancelled`, `skipped`, and `in_progress`. Check runs for the relevant branch and event. A green default-branch badge does not prove a PR is green, and a skipped optional deployment is not a successful deployment.
- Validate generated/browser-visible geometry in a browser when source coordinates are ambiguous. For rotated SVG text, transform all four `getBBox()` corners through `getCTM()` before comparing against the viewBox; a simple x-coordinate check can report false overflow.

Canonical validation rules: [test instructions](../.github/instructions/tests.instructions.md), [SVG instructions](../.github/instructions/svg.instructions.md), and the commands in [Copilot instructions](../.github/copilot-instructions.md).

## Product and Security Boundaries

- Trace browser features through their real UI entry point to deployment headers and permissions. A globally denied Permissions-Policy feature can silently break a supported same-origin flow; allow only the origins the product needs and retain denials for unrelated capabilities. Add a contract test for both allowed and denied directives.
- Before changing a helper that handles credentials or browser storage, prove it is used by a production path. An unused helper is not evidence of an active user-facing workflow; avoid refactoring dead code into a new product contract without a scoped roadmap item.
- For TypeScript/toolchain upgrades, verify the stable package and CLI separately from previews. Compare every referenced config, diagnostics, and timing; retain a second compiler API only when a real tool dependency requires it, and document a removal trigger.
- Keep generated reports, benchmark results, and temporary compiler artifacts under the OS temp directory. Link to canonical docs rather than copying large instructions into new guides.

## Documentation and Status Claims

- Audit all tracked Markdown, including hidden directories: use `git ls-files '*.md'` before searching; a normal glob/search may omit dot-directories.
- For status badges, verify the rendered badge text, its linked target, and the underlying workflow/check. HTTP 200 alone is insufficient: a badge service can return a not-found image with status 200, and skipped workflows may render as failing. For coverage uploads, inspect the uploader log when the action is configured not to fail CI on upload errors.
- Preserve distinct historical, roadmap, and current-state documentation. Update the canonical source and its explicit mirrors together; do not rewrite dated audit records as if they were current.

## Environment Notes

- On Windows, if the `git` shim reports that it cannot create the configured process, locate the actual `git.exe` with `Get-Command git.exe -All` or `where.exe git` and invoke that executable directly. Recheck status afterward; do not retry destructive Git operations through an unverified shim.
- Prefer PowerShell-native quoting and inspect `$LASTEXITCODE` after external commands. If a command enters a continuation prompt because a quote was malformed, cancel it and rerun a simpler, correctly quoted command before making edits.

## Refreshing This Snapshot

Update this document only when later sessions confirm a reusable lesson or invalidate one above. Query the local session index for the current repository, verify each proposed lesson against code or tests, and update the coverage date/count. Do not copy raw chat turns or present local history as all-device history.

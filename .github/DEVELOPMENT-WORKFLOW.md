# GitHub-First Development Workflow

This repository is developed by multiple contributors. GitHub issues and pull requests are the shared record of planned work, decisions, review, and verification.

## Visible Progress Checklist

For multi-step chat/AI/Copilot work, begin with a concise, user-visible TODO list. Use a task-list tool when available; otherwise maintain the list in progress updates. Mark work in progress/completed incrementally, identify blockers promptly, and revise the list when scope changes. Keep simple one-step requests lightweight.

## Before Work Starts

1. Find the roadmap sprint or existing issue that owns the change. If none exists, create a GitHub issue before editing code, tests, configuration, or documentation.
2. Record the scope, acceptance criteria, affected roadmap item, and expected verification in the issue. Split independently reviewable work into separate issues.
3. Fetch and inspect the latest base branch. Start each issue on its own branch, named `issue-<number>-<short-slug>`, from the current `origin/main` (or the explicitly designated base).
4. Do not have multiple contributors edit the same checkout or branch concurrently. Use separate worktrees/checkouts and issue branches.

Security vulnerabilities are the exception to public issue registration: use GitHub's private vulnerability reporting process described in `SECURITY.md`.

## While Developing

- Keep changes within the registered issue. If scope or acceptance criteria change, update the issue before expanding implementation.
- Commit only to the issue branch, using the repository's Conventional Commit format. Include the issue reference in the commit body when practical.
- Never commit or push feature work directly to `main`. Never force-push shared branches or rewrite history that another contributor may have based work on.
- Before synchronizing, run `git status`, `git fetch origin`, and inspect `git log --left-right` / `git rev-list` to understand divergence. Preserve uncommitted work. Rebase or merge `origin/main` only into your issue branch; resolve conflicts there and rerun affected tests.
- If existing local work has no issue, register it first and move it to an issue branch before publishing. Do not bundle unrelated work to avoid creating a second issue.

## Pull Request and Merge

1. Open a PR from the issue branch to the agreed base branch. Link the tracking issue with `Fixes #N`, `Closes #N`, or `Refs #N` as appropriate.
2. The PR description must state user-visible behavior, acceptance criteria, verification commands/results, known gaps, and any roadmap/changelog updates. Keep one primary issue per PR; split unrelated scopes.
3. Obtain the required review and passing required checks before merging. Do not merge a failing, unreviewed, or draft PR. Use the repository's approved merge strategy and avoid force pushes.
4. Mark roadmap work complete only after its acceptance criteria are evidenced in the merged PR. A commit existing locally or on a branch is not completion evidence.

## Releases

Release preparation is tracked by an issue and reviewed in a PR. Complete release-blocking roadmap criteria, verify a clean candidate and all required checks, then merge the release PR. Create and push the annotated version tag from the merged release commit only after approval. Verify the GitHub release workflow and published artifacts; never force-push or retarget a published tag.

## Synchronizing With Other Contributors

When another contributor has pushed since your last sync:

```bash
git status --short --branch
git fetch origin
git log --oneline --graph --decorate --left-right HEAD...origin/main
git rev-list --left-right --count HEAD...origin/main
```

If `main` is behind `origin/main`, update the local base with a fast-forward only when it is safe. If branches have diverged, inspect the commits and coordinate before merging; do not discard either side. Update an issue branch from the latest base, not by pushing it over `main`. After conflict resolution, run the narrow affected checks and the required project gates before opening or updating the PR.

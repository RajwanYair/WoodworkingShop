---
name: pr-stack
description: Create, split, extend, or restack dependent pull requests, with one app-native child session per layer and native GitHub Stack linking.
---

# PR stacks

Use this skill to create a chain of small dependent PRs:

- The bottom PR targets the stack's ultimate base (often `main`).
- Each higher PR targets the branch immediately below it.
- Each layer is one app session, one branch, and one ordinary PR.
- After the app opens the PRs, the Stacks REST API records their bottom-to-top order.
- github.com then provides stack navigation, final-base CI/protection, cascading merge,
  and server-side rebase.

The app owns branches, commits, pushes, PR creation, and review. The REST API owns only
stack metadata; it must not replace the app-native PR flow.

## Non-negotiable rules

- **Keep PR creation app-native.** Every layer session opens its own PR for review in
  the app.
- **Create layers sequentially, bottom to top.** A higher `create_session` must wait
  until its parent layer has committed and pushed, because `base_branch` snapshots the
  parent's current commit.
- **Keep Git mutations in the owning layer session.** Never rebase or force-push a
  branch from the coordinator while another worktree owns it.
- **Snapshot, revalidate, mutate, verify.** Before every REST mutation, record the
  relevant PR states, refs, SHAs, membership, and lock state; re-read them immediately
  before the call; verify the exact postcondition afterward.
- **Treat API values as untrusted shell input.** Before using them in a terminal,
  require PR/stack numbers to contain only digits, SHAs to be 40- or 64-character
  hexadecimal object IDs, owner/repo names to match `^[A-Za-z0-9._-]+$`, remote names
  to match `^[A-Za-z0-9._][A-Za-z0-9._-]*$`, and refs to match
  `^[A-Za-z0-9._/-]+$`; additionally validate branch shorthands with
  `git check-ref-format --branch` and full refs with `git check-ref-format`. Stop on
  any mismatch, single-quote every validated dynamic argument, and use `--` before
  positional arguments where supported.
- **Do not poll.** Use `notify_on_idle`, end the turn, and resume when notified.
- **Do not force a stack.** If the work is one small independent change, use one PR.

## Choose a mode

State the inferred mode. Ask at most one multiple-choice question only when signals
are absent or conflict.

| Signal | Mode |
| --- | --- |
| New work with nothing built | **Greenfield** |
| A named PR, large open PR, or large current diff | **Split** |
| A confirmed current top PR in a native stack | **Extend** |
| A lower layer changed/merged, or the user asks to rebase/sync | **Restack** |

## Shared layer workflow

- Plan and announce small, self-contained layers in bottom-to-top order.
- Create one child session per layer with a complete kickoff prompt,
  the current `project_id`, `coordinate_with_creator: true`, and
  `notify_on_idle: "once"`.
- Layer 1 uses the mode-specific base below.
- Wait for each layer to develop, commit, and push before creating the next with
  `base_branch` set to the lower layer's branch.
- Each child opens its own PR through the app. The app-native PR base should already
  be the branch below.
- Register only after every intended layer PR exists and passes the create/append
  preflight below.

## Mode playbooks

### Greenfield

- Layer 1 uses an explicitly requested ultimate base; otherwise leave `base_branch`
  unset so it starts from the project default.
- Higher layers follow the shared sequential workflow.
- Register all PRs bottom to top.

### Split

- Stabilize the source before spawning:
  - Named PR: require it to remain open/unmerged; record its exact base ref/base SHA
    and head SHA.
  - Current uncommitted work: commit and push it first; child worktrees cannot see
    another worktree's uncommitted files.
- Preserve the source's actual base, including release branches or another stack
  layer. Do not assume the project default.
- For a named PR, resolve a configured remote whose normalized URL matches the PR's
  validated base repository; do not assume `origin` points there. Fetch the fork-safe
  source snapshot through that remote:

```text
git fetch -- '<validated-base-remote>' '<validated-base-sha>'
git fetch -- '<validated-base-remote>' '+refs/pull/<validated-pr-number>/head:refs/pr-stack/source/<validated-pr-number>'
git rev-parse 'refs/pr-stack/source/<validated-pr-number>^{commit}'
```

- Require the resolved source ref to equal the recorded head SHA before creating any
  layer; on mismatch, restart the snapshot.
- Give every child the recorded source/base commits and its assigned slice. Carve
  from `git diff '<validated-base-sha>...refs/pr-stack/source/<validated-pr-number>' --`
  (or the validated, quoted pushed source branch for current-session work), not from
  an unverified local branch.
- Resolve source membership before planning and again immediately before mutation:

```text
gh api 'repos/<validated-owner>/<validated-repo>/stacks?pull_request=<validated-source-pr-number>'
```

- If standalone, create the replacement stack and close/supersede the source only
  after exact postcondition verification.
- If already stacked, rebuild only when all of these hold:
  - Every surviving member is open/unmerged, not queued, and has no auto-merge.
  - Each affected upper layer's historical fork point is provable from recorded
    creation state or verified history.
  - Every upper branch can be rebased bottom to top in its owning session and pushed
    with an explicit compare-and-swap lease:
    `'--force-with-lease=refs/heads/<validated-branch>:<validated-remote-tip>'`.
- Otherwise stop before unstacking. Do not strand or partially rewrite a stack.

### Extend

- Fetch the candidate PR plus filtered membership and stack detail. Extend only when:
  - the PR is open and is the final ordered stack member;
  - its head repository/ref exists;
  - the live head ref SHA equals the PR's recorded head SHA.
- Probe the live ref with:

```text
gh api 'repos/<validated-head-owner>/<validated-head-repo>/git/ref/heads/<validated-head-ref>' --jq .object.sha
```

- If all members are merged, start a successor from the stack's recorded base.
- If a member is closed-unmerged or the open top lost its ref, stop and repair.
- If the open PR is not a confirmed current top, use **Split** instead.
- Create one new layer based on the confirmed top branch.
- Immediately before append, require the same stack number, top PR, top ref, and top
  SHA. If any changed, rebase/retarget in the new layer's session and restart preflight.
- Append only the new PR number, never the full existing member list.

### Restack

- Prefer github.com's **Rebase Stack** action or automatic rebase after partial merge.
- If unavailable, rebase upper branches bottom to top inside their owning sessions.
- Before each push, record the remote tip and use an explicit
  `'--force-with-lease=refs/heads/<validated-branch>:<validated-remote-tip>'`.
- On lease failure, fetch and restart preflight; never overwrite concurrent work.
- Append-only membership changes use the REST add endpoint. Removal or reordering
  requires the guarded unstack/rebuild flow below.

## REST operations

Use authenticated `gh api`; do not install or invoke the `gh stack` extension.

```text
# Membership
gh api 'repos/<validated-owner>/<validated-repo>/stacks?pull_request=<validated-pr-number>'

# Detail
gh api 'repos/<validated-owner>/<validated-repo>/stacks/<validated-stack-number>'

# Create (2-100 open PRs, bottom to top)
gh api --method POST 'repos/<validated-owner>/<validated-repo>/stacks' -F 'pull_requests[]=<validated-bottom-pr-number>' -F 'pull_requests[]=<validated-top-pr-number>'

# Append new top members
gh api --method POST 'repos/<validated-owner>/<validated-repo>/stacks/<validated-stack-number>/add' -F 'pull_requests[]=<validated-new-top-pr-number>'

# Dissolve before a guarded rebuild
gh api --method POST 'repos/<validated-owner>/<validated-repo>/stacks/<validated-stack-number>/unstack'
```

Use repeated `-F 'pull_requests[]=<number>'` fields so commands work in Unix shells
and PowerShell.

### Create/append preflight

- Every candidate is open/unmerged, not queued, and has no auto-merge request.
- Every candidate's head branch is in the base repository. Native stacks do not
  support cross-fork PRs; if any head is in a fork, keep the dependent-PR chain
  without native stack registration.
- Filtered membership confirms each create candidate is standalone.
- The bottom targets the intended ultimate base; every higher `base.ref` equals the
  previous PR's `head.ref`.
- Recorded states, refs, head SHAs, membership, and current stack top are unchanged
  immediately before mutation.
- Afterward, stack detail exactly matches the intended base and ordered PR numbers.

The API validates PR bases but does not rebase commits, repair chains, create PRs,
push branches, or change draft state.

### Guarded unstack/rebuild

- REST cannot remove or reorder one member. Prepare affected rebases in their owning
  sessions, then use unstack and create the replacement stack.
- Before unstack, require every original member to be open/unmerged, not merging or
  queued, and without auto-merge; also require an available GitHub PR update path for
  every base that will change. Revalidate immediately before the call.
- Verify each upper layer's historical fork point, then finish and verify every
  conflict-prone rebase locally. Record the original ordered membership, PR bases,
  remote tips, and prepared tips.
- Lease-push prepared branches while the original metadata remains. On any failure,
  restore each already-pushed branch with a lease against its prepared tip and abort
  without unstacking.
- Unstack may leave locked members behind. Afterward, query filtered membership for
  **every original and replacement PR** and rebuild only when every result is empty.
- After unstack, retarget each surviving upper PR to the replacement parent branch
  through the available GitHub PR tooling; verify the exact base/head chain before
  recreating stack metadata.
- If any step after unstack fails, restore recorded PR bases and remote tips with
  compare-and-swap leases, restore the original ordered stack metadata, and verify its
  exact detail before stopping. If concurrent changes prevent recovery, report the
  recorded recovery data rather than overwriting them.
- After rebuild, verify exact stack detail before closing or superseding any source PR.

Reference: https://github.github.com/gh-stack/reference/rest-api/

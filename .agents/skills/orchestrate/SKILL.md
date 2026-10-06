---
name: orchestrate
description: Coordinate work across multiple sessions and repositories by spawning and steering child sessions. Use for multi-repo changes, cross-repo research, breaking a large change into a stack of dependent PRs (one session each), running independent workstreams in parallel, or forking the current session to explore an alternative direction. Sessions nest under their creator for visual grouping and can message each other.
---

# Orchestrate — multi-session & multi-repo coordination

Use this skill to act as a **coordinator**: instead of doing every change inline,
spawn one or more child sessions, give each a complete task, and steer them with
messages until the work lands. Child sessions nest under the session that created
them (visual grouping in the sidebar) and can message back and forth, so you can
fan work out and pull results back in.

This is the right tool when a request is bigger than one branch in one repo.

**Mental model: one session ≈ one branch ≈ one PR.** Each child session owns a single,
self-contained unit of work that lands as its own pull request. Use that 1:1 framing to
scope what each session does — if a chunk of work would naturally become its own PR, it
should be its own session. This keeps each session's task crisp and each diff reviewable,
and it's why breaking a big change into a stack of dependent PRs maps cleanly onto one
session per layer.

**When the user explicitly invokes `/orchestrate`, default to delegating.** They've
opted into orchestration, so your job is to *coordinate* child sessions — spawn them,
give each a complete task, and steer them — not to quietly do all the work inline in
this one session. Doing everything inline defeats the purpose. Before spawning,
**announce your plan** (how many sessions, which repos, what each will do); the only
reason to skip orchestration is a genuinely trivial single-repo change, which you
should call out explicitly.

## Where research happens — match the tool to the scope

Research and context-gathering come *before* the real work. Put each in the right place:

- **Cross-repo research → a separate research session per repo.** When you need to
  investigate a *different* repo (e.g. "find my merged PRs in github/github-app", "what
  are the good first issues in github/app", "how does repo X implement Y"), spin up a
  research session in that repo's project to investigate and report back. One research
  session per repo it spans.
- **Single-repo research → do it inline in this session.** When the research is confined
  to the repo you're already in, just do it here directly. Don't stand up a child session
  for it, and don't coerce sub-agent (`task`) usage for something this session can answer
  itself — that's unnecessary overhead.
- **The actual work → its own branch/session.** Once research tells you *which* concrete
  work to do, create a user-facing child session per unit of work (the selected bug fix,
  the repo slice, the stacked-PR layer). Don't implement it inline.

The goal: keep research where the relevant code is (separate sessions only when it spans
other repos), and reserve user-facing sessions for the work the user actually wants landed.

## When to reach for orchestration

| Pattern | What it looks like | Shape |
|---------|--------------------|-------|
| **Multi-repo change** | A feature needs edits in repo A *and* repo B (e.g. an SDK change plus its consumer). | One child session per repo, coordinated. |
| **Cross-repo research** | "How does repo X do Y?" or "find my merged PRs / good issues in another repo" while you work in repo A. | A separate research session in each other repo, reporting back. Single-repo research stays inline. |
| **Stacked / dependent PRs** | One big change would be an unreviewable diff. Split it into a stack of smaller PRs, each building on the last. | One session per layer, each branched off the previous layer's branch. |
| **Parallel fan-out** | Several independent tasks with no ordering between them. | Multiple independent sessions, then aggregate. |
| **Explore an alternative** | "What if we did this a different way?" without disturbing current work. | `fork_session` from the current session. |

If the task is a single change in the current repo, **don't orchestrate** — just do it.

## Step 0 — Clarify scope before spawning anything

A `/orchestrate` invocation is often under-specified. **Do not guess and spawn a pile
of sessions.** First make sure you know:

- **Which repos / projects** are involved. Run `list_projects` to see what's
  available, and map each requested repo to a `project_id`. If the user named a repo
  that isn't a configured project, say so.
- **What each session should do** — a concrete, self-contained task per session.
- **Dependencies / ordering** — is this a parallel fan-out, or a stack where each
  layer depends on the previous one?
- **Whether you need results back** (coordinated) or the work is fire-and-forget
  (independent).

If any of these is unclear, use `ask_user` to ask **one focused question at a time**
(e.g. "Which repositories should I work across?") before creating sessions. Prefer
multiple-choice when you can derive the options from `list_projects`.

## The toolbox

| Tool | Use it to |
|------|-----------|
| `list_projects` | Discover configured projects and their `project_id` / repo / default branch. Always the first call for multi-repo work. |
| `create_session` | Spawn a child session in any project. Pass `kickoff.prompt` to auto-start it with a task. Key options below. |
| `open_pr_session` | Spin up a session on an existing pull request (review or continue work on it). |
| `open_issue_session` | Spin up a session to work an existing issue. Use `target_repo` when the code lives in a different repo than the issue. |
| `fork_session` | Branch the **current** session into a new worktree to explore an alternative without disturbing the original. |
| `send_session_message` | Send a message to another session (delegate a task, deliver context, or ask for a result). Delivered as a user turn in that session. **Note:** a child paused in **plan mode** awaiting approval won't process this until its plan is resolved — use `respond_to_session_plan` for that. |
| `respond_to_session_plan` | Approve or reject a child session's pending plan when it's paused in plan mode, instead of leaving it to wait for a human. Optionally pick the continue-action (`interactive` / `autopilot` / `autopilot_fleet` / `exit_only`) and pass `feedback`. |
| `get_session` | Inspect another session's state (branch, path, PR/issue, diff stats). Also surfaces a `pending_plan` block when the child is paused awaiting plan approval, so you can read the plan before responding. |
| `list_sessions_and_chats` | Enumerate existing sessions so you reuse one instead of spawning a duplicate. |
| `navigate_to` | Switch the UI to a session or chat so the user can watch it. |
| `archive_session` | Clean up a finished child session. |

### Important `create_session` options

- **`project_id`** (required) — which repo/project to create the session in. Use the
  ids from `list_projects`. Same project for multi-session work in one repo, a
  different project for cross-repo work.
- **`kickoff.prompt`** — the task. Providing it auto-starts the session. **Write a
  complete, standalone prompt** — child sessions start fresh and cannot see this
  conversation. Restate the goal, the relevant context, and the definition of done.
- **`kickoff.mode`** — `plan`, `interactive`, or `autopilot`. Default to `autopilot`
  for well-specified execution work; `plan` when you want the child to propose an
  approach first. **Pair `plan` with `notify_on_idle`** so you're told when the child's
  plan is ready, then approve or redirect it with `respond_to_session_plan` (see
  "Approve or redirect a child's plan").
- **`coordinate_with_creator`** (default `true`) — when `true`, the child is told who
  created it and how to message you back, so you can keep collaborating. Set `false`
  for independent fire-and-forget work that shouldn't report back.
- **`base_branch`** — **the key to stacked PRs.** Omit it in almost all cases (new work
  branches off the project default). Set it to a specific branch only to stack a
  session on top of in-progress work — e.g. layer 2 of a stack uses layer 1's branch
  as its base.
- **`notify_on_idle`** — `once` or `always` to be notified when the child finishes a
  turn, so you can collect results without polling.
- **`execution_location`** — `local` (default) or `cloud` for a GitHub-hosted remote
  session (repository projects only; always give it a kickoff prompt).

## Core workflow

1. **Map work → sessions.** Decide how many sessions and what each one owns. Fewer is
   better — one session per repo / PR layer / independent workstream.
2. **Resolve projects.** `list_projects` → pick the `project_id` for each session.
3. **Announce the plan.** Tell the user how many sessions you'll spawn, in which repos,
   and what each will do — before creating them.
4. **Spawn with complete kickoff prompts.** Each prompt must stand on its own.
5. **Choose coordination.** Coordinated (`coordinate_with_creator: true` +
   `notify_on_idle`) when you need results back; independent otherwise.
6. **Steer.** Use `send_session_message` to deliver follow-ups, corrections, or
   context. When you need a child's output before your next step, say you're waiting
   and end your turn — you'll get an idle notification rather than blocking.
7. **Aggregate.** Pull results together, summarize for the user, and `archive_session`
   anything that's done.

**Never block on `sleep` or watch loops** waiting for a child session. Hand off the
work, end the turn, and resume when the idle notification arrives.

## Pattern playbooks

### Multi-repo change
1. `list_projects`; identify the project for each repo.
2. `create_session` in each, with a kickoff prompt describing that repo's slice and how
   it fits the whole (e.g. "expose `fooBar()` in the SDK" / "consume `fooBar()` in the
   app"), `coordinate_with_creator: true`, `notify_on_idle: "once"`.
3. If repo B depends on repo A's API, do A first (or have B message A via
   `send_session_message` for the final signature).
4. Collect both, confirm they line up, summarize.

### Cross-repo research / context gathering
**Cross-repo research → a research session in that repo. Single-repo research → inline.**
When the questions are about *another* repo (e.g. "list this user's merged PRs in
github/github-app and infer their strongest areas"; "find good first issues in
github/app"; "how does repo X implement Y"), spin up a research session in that repo's
project so the investigation runs where the code and history live.
1. `list_projects` → find the project for each repo you need to research.
2. `create_session` in each such repo with a kickoff prompt that states the question and
   asks for a written findings report; `coordinate_with_creator: true`,
   `notify_on_idle: "once"`. Run them in parallel when several repos are involved.
3. Collect the reports, fold them into your plan, then create child sessions **only** for
   the concrete, user-facing work the research selected (e.g. the specific bugs to fix).

> If the research is confined to the repo you're already in, just do it inline in this
> session — don't spin up a session or force a `task`/`explore` sub-agent for work this
> session can do directly. Reach for orchestration only when research spans other repos or
> when there's real work to land.

### Stacked / dependent PRs
1. Create the layer-1 session normally (kickoff prompt for the base change).
2. For each subsequent layer, `create_session` with **`base_branch`** set to the
   previous layer's branch (from `get_session`), so its diff is only that layer's
   delta.
3. Each session opens its own PR; the stack stays small and reviewable.

### Parallel fan-out
1. Spawn N independent sessions, one per task, `notify_on_idle: "once"`. Use
   `coordinate_with_creator: false` if they genuinely don't need to report back.
2. As each goes idle, collect its result; aggregate when all are done.

### Explore an alternative
1. `fork_session` (optionally `to_event_id` to fork at an earlier point) to copy the
   current history into a fresh worktree/branch.
2. Try the alternative there; the original session is untouched.

### Approve or redirect a child's plan (plan mode)
When you spawn a child with `kickoff.mode: "plan"`, it researches and then **pauses
awaiting approval of its plan**. While paused it will *not* act on a
`send_session_message` — that message just queues behind the blocked turn. As the
coordinator you resolve the plan directly:

1. **Spawn with `kickoff.mode: "plan"` and `notify_on_idle`.** The notify flag is what
   tells you the child is ready: you'll get a "created a plan and is paused waiting for
   approval" notification as soon as the plan is up. (Use `always` if the child may
   produce more than one plan over its life; `once` notifies for the first plan plus the
   eventual finish.)
2. **Read the plan** with `get_session` — the `pending_plan` block holds the summary,
   full plan content, the available actions, and the recommended action.
3. **Respond** with `respond_to_session_plan`:
   - Approve and let it run: `{ approved: true }` (defaults to the recommended action),
     or set `selected_action` to force `interactive` / `autopilot` / `autopilot_fleet`.
   - Redirect it: `{ approved: false, feedback: "..." }` sends it back to planning with
     your guidance instead of waiting for a human.
4. After it's running again, steer normally with `send_session_message`.

Use this whenever you want a child to plan first but don't want a human in the loop for
every approval — the coordinator *is* the approver.

## Best practices

- **Complete kickoff context every time.** Child sessions can't see this chat. A vague
  kickoff produces vague work.
- **Reuse before you spawn.** Check `list_sessions_and_chats` so you don't create a
  duplicate session for work already in flight.
- **Don't over-orchestrate.** Spawning sessions has overhead; only split work that
  genuinely benefits from separate branches, repos, or parallelism.
- **Prefer coordination when you need results.** `coordinate_with_creator: true` +
  `notify_on_idle` is the loop that lets you collect and combine outputs.
- **Clean up.** `archive_session` finished children so the sidebar stays readable.
- **Use `ask_user` only in the main session** for true scoping blockers — not for
  expected waiting states.

---
name: code-review
description: Perform a code review of the current session's changes. Use when the user requests a code review via the Run Code Review button in the Changes toolbar.
---

<!-- Customize this skill and select save to override its behavior. Delete that copy to restore the built-in behavior. -->

# Code Review

You are a coding agent acting as a code reviewer. Review the current session's changed files and surface concrete, actionable issues as inline comments on the code.

## Workflow

1. Determine the set of changed files in the current session (e.g. `git status`, `git diff`).
2. For each changed file, read the relevant ranges and review them against the rest of the codebase:

- Correctness and edge cases
- Bugs, regressions, and missing error handling
- Security and data-handling issues
- Code clarity, naming, and consistency with surrounding code
- Tests and documentation gaps that the change introduces

1. For every issue you find, use the `addComment` tool to attach a comment to the exact file URI and line range. Each comment should:

- Explain _what_ is wrong and _why_ it matters
- Be specific to that range - do not leave a single summary comment per file

1. Prefer fewer, higher-signal comments over many minor stylistic nits. Do not comment on things that are already correct.
2. Do not modify files. Do not run commits, pushes, or other write operations. Your only output is review comments.
3. When you have finished reviewing every changed file, stop and let the user act on the comments.

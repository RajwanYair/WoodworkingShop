---
name: docs-sync-audit
description: Audit whether repository documentation, setup steps, examples, configuration guidance, and release claims still match the implementation. Use after code or config changes, before releases, or when checking README and contributor onboarding.
license: MIT
---

# Documentation Drift Audit

Compare documentation against the actual source of truth and report actionable
drift. Stay read-only unless the user explicitly requests documentation changes.

## Workflow

1. Establish the requested scope. For a code change, inspect changed files and
   their directly related docs; for a general request, inventory README files,
   `docs/`, contributor guidance, prompts, configuration examples, and release
   docs before selecting high-impact areas to inspect deeply.
2. Identify the source of truth: `package.json`, `.vscode/mcp.json`, source,
   tests, scripts, CI workflows, or a generator. Do not treat prose as proof of
   runtime behavior.
3. Compare exact commands, paths, package versions, environment variable names,
   defaults, feature behavior, and release gates. Treat generated docs carefully:
   find their source and generation command before suggesting edits.
4. Run a narrow, read-only check when it helps. Use `npm run docs:freshness`,
   `npm run mcp:metadata:validate`, or another existing focused check as
   appropriate. Do not run formatters or generators during an audit.
5. Report confirmed drift separately from inferred omissions. Prioritize broken
   setup, credential handling, user workflows, exports, and release instructions
   over cosmetic wording. Cite exact paths and line anchors when available.

## Report

Summarize scope and checks. For each finding, state severity (P1-P3), what the
source does, what the documentation says or omits, user impact, and the
smallest useful update. Note surveyed areas that were not deeply inspected;
never present a partial pass as a complete audit. If no actionable drift is
found, say so and list residual verification limits.

When the user asks to update docs, change only confirmed drift or explicitly
selected gaps, then run the narrowest relevant documentation check.

## References

This workflow is adapted to this repository from GitHub's
[docs-sync-audit skill](https://github.com/github/awesome-copilot/tree/main/skills/docs-sync-audit).

---
name: test-gap-audit
description: Find missing, weak, stale, or mis-scoped tests for a feature, change, bug fix, or repository area. Use when asked what regression tests are missing or whether existing tests prove important behavior.
license: MIT
---

# Test Gap Audit

Assess behavior-level regression protection, not general code quality. Stay
read-only unless the user explicitly asks to add tests.

## Workflow

1. Infer the smallest useful scope from the request. For a full-repository
   audit, inventory the main testable areas first and limit deep inspection to
   the highest-risk paths; list important areas not deeply inspected.
2. Check `git status --short`, `package.json`, test configuration, CI checks,
   and nearby tests. Follow project conventions: Vitest, `it.each`, `cfg()` in
   engine tests, store reset between tests, Testing Library and `userEvent` for
   components, and Playwright for browser-level workflows.
3. Trace the selected behavior through implementation and existing direct or
   indirect tests. Inspect assertions, fixtures, and mocks to establish what is
   genuinely proven; coverage percentages alone do not prove behavior.
4. Prefer the lowest reliable test level. For engine invariants, inspect
   `tests/engine/` and use `cfg()`; for broader source coverage evidence, the
   existing `npm run test:coverage:map` command writes its report under the OS
   temporary directory. Treat automated maps as leads and confirm gaps manually.
5. Separate confirmed gaps from inferred risks. Give concrete test scenarios,
   expected assertions, severity (P1-P3), and source/test path anchors. Avoid
   suggesting slow E2E tests when a focused unit or component test proves the
   behavior.
6. Run only focused read-only test discovery or relevant tests unless the user
   asks for broader validation. Never weaken or remove assertions to make a
   suite pass.

## Report

State the scope, checks run, and any areas not deeply inspected. For every gap,
explain what the code does, what current tests prove, what they do not prove,
and the smallest reliable test to add. If no meaningful gap is confirmed, say
so and describe residual risk. When the user asks to implement tests, add the
highest-priority cases using local fixtures and conventions, then run those
tests and the closest existing suite.

## References

This workflow is adapted to this repository from GitHub's
[test-gap-audit skill](https://github.com/github/awesome-copilot/tree/main/skills/test-gap-audit).

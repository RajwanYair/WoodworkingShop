---
name: workspace-maintenance
description: Audit and improve quality across the MyScripts workspace and its independent Python, TypeScript, and other project repositories. Use for workspace health checks, multi-project quality gates, and buildflow reporting.
---

# Workspace Maintenance

Run an evidence-led health check across the shared workspace and its independent
project repositories. Keep each repository's results separate and preserve all
existing user changes.

## 1. Inventory and preflight

- Identify the workspace root and immediate project directories; do not descend
  into `.git`, `node_modules`, virtual environments, build output, or coverage.
- Classify projects from their manifests (`pyproject.toml`, `package.json`,
  solution/project files, and CI workflows), not directory names alone.
- Read applicable workspace and project instructions before running commands.
- Record `git status --short --branch` for each repository before making edits.
- Do not reset, clean, overwrite, or commit user changes. Ask before expanding a
  requested project-scoped task to other repositories.

## 2. Select gates from project configuration

Run only gates supported by that project's declared tooling. Prefer existing
quality scripts and CI workflow commands over invented equivalents.

Python projects may use:

```powershell
python -m ruff check src tests
python -m ruff format --check src tests
python -m mypy src --ignore-missing-imports
python -m pytest tests -x --tb=short -q
```

TypeScript projects may use their configured npm scripts for typecheck, lint,
tests, build, i18n parity, bundle budgets, and dead-code checks. Run `npm audit`
or `pip-audit` when dependency security is in scope and the project manifests
support it. For other languages, follow the repository's documented CI gates.

Run commands from the repository that owns the manifest. Do not treat a missing
tool or unconfigured gate as a pass; mark it skipped with the reason.

## 3. Diagnose and make scoped fixes

- Capture the failing command and relevant output before changing code.
- Fix the root cause, keep changes within the requested scope, and run the
  narrowest affected check immediately after each substantive edit.
- Do not suppress diagnostics or auto-upgrade dependencies unless requested.
- If a failure appears pre-existing or depends on inaccessible files, report it
  with evidence instead of broadening the change.

## 4. Buildflow reporting

Report a separate result for each project and gate, including command, exit
status, and skipped/unavailable reason. Distinguish actual executable scripts
from inputs: list only scripts that were run under `Scripts`, and list only
pre-existing configuration, data, or artifacts those scripts read under
`Inputs`. Use `<DUT>` for a shared target row. If generating HTML, CSV, and
Excel reports, keep their column order identical and validate outputs before
reporting success.

Finish with a concise summary of passed, failed, and skipped gates; list changed
files and note any remaining user changes. Never report the whole workspace
green while a required project gate is failing or unverified.

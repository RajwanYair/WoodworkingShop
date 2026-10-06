---
name: ryair-global-workflow
description: "Apply Ryair's cross-workspace artifact locations, evidence-first coding workflow, buildflow reporting conventions, and reusable debugging lessons."
applyTo: '**'
---

# Ryair Global Workflow

- Response discipline: Be concise, clear, and action-oriented. Lead with the answer; omit repetition, generic background, and unnecessary narration. For proposal, plan, architecture, or strategy reviews, act as a skeptical executive panel: challenge assumptions, weaknesses, risks, costs, dependencies, and unintended consequences.
  Use exactly these headings: `Executive Debate`, `Key Vulnerabilities`, `Tough Questions and Recommended Responses`, `Proposal Improvements`, and `Readiness Assessment`. End with `Green`, `Yellow`, or `Red` plus a brief rationale.
- Create scripts and final generated outputs under `/nfs/site/disks/ryair_wa01/scripts/`.
- Create intermediate, scratch, extracted, downloaded, browser, and temporary files under `/tmp/ryair/`; use a task subdirectory when useful.
- Before writing a script, review `/nfs/site/disks/ryair_wa01/scripts/` and reuse or enhance an existing script when possible; create a new script only if no suitable script exists.
- Do not place generated outputs or temporary files in the active workspace unless explicitly requested. Required repository source edits remain in the repository.
- Before editing, use the narrowest concrete evidence, state a falsifiable hypothesis, and identify a cheap discriminating check.
- After the first substantive edit, run the narrowest executable validation immediately. Preserve unrelated user changes and never reset or commit without explicit approval.
- In buildflow tables, list actual executable scripts in `Scripts`; list only pre-existing data/configuration/artifacts read by those scripts in `Inputs`; use `<DUT>` for shared target rows; and keep HTML, CSV, and Excel column order identical.
- For HTML reports, validate the rendered DOM, controls, downloads, and narrow viewport alignment in a browser when possible.
- For regression triage, compare report identity, feed/configuration, exact test counts, status records, post-processing, and source/build deltas before assigning causality.
- For tcsh syntax, use `tcsh -f -n`, align `setenv` blocks, and use `$?VARIABLE` for variable existence.
- Use consistent tool names across code and documentation and consolidate stale aliases when a tool is renamed.

Canonical script catalog: `/nfs/site/disks/ryair_wa01/scripts/`.

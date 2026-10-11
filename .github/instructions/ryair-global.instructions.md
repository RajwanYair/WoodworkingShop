---
name: ryair-global-workflow
description: "Apply Ryair's cross-workspace artifact locations, evidence-first coding workflow, buildflow reporting conventions, and reusable debugging lessons."
applyTo: '**'
---

# Ryair Global Workflow

- Be concise and lead with the answer. For proposal, plan, architecture, or strategy reviews, challenge assumptions, risks, costs, dependencies, and unintended consequences; use exactly `Executive Debate`, `Key Vulnerabilities`, `Tough Questions and Recommended Responses`, `Proposal Improvements`, `Readiness Assessment`, then end with `Green`, `Yellow`, or `Red` and a rationale.
- Keep scripts and final outputs in `/nfs/site/disks/ryair_wa01/scripts/`; keep scratch, downloads, extracted files, browser artifacts, and temporary files in `/tmp/ryair/<task>/`. Before adding a script, review and reuse the canonical script catalog: `/nfs/site/disks/ryair_wa01/scripts/`.
- Keep generated/temp files out of the workspace unless requested; required source edits stay in the repository.
- Before editing, identify the narrowest evidence, a falsifiable hypothesis, and a cheap discriminating check. After the first substantive edit, run the narrowest executable validation. Preserve user changes; never reset or commit without explicit approval.
- Buildflow tables: list executable scripts under `Scripts`, only pre-existing read inputs under `Inputs`, use `<DUT>` for shared targets, and keep HTML/CSV/Excel columns identical.
- When possible, validate HTML report DOM, controls, downloads, and narrow-viewport alignment in a browser.
- Before assigning regression causality, compare report identity, feed/configuration, exact test counts, status records, post-processing, and source/build deltas.
- For tcsh, validate with `tcsh -f -n`, align `setenv` blocks, and use `$?VARIABLE` for existence checks. Keep tool names consistent across code and docs; consolidate stale aliases.

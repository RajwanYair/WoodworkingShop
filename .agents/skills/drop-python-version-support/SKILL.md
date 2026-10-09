---
name: drop-python-version-support
description: 'Guide changes required when a project drops one or more oldest supported Python versions and raises its minimum supported version. Use when asked to remove the oldest supported runtimes, raise the minimum Python requirement, modernize code after raising the Python floor, or upgrade/migrate by replacing older runtimes.'
---

# Drop Python Version Support

Use this skill to raise a project's minimum supported Python version safely and take advantage of features guaranteed by the new minimum.

## Core Principle

Dropping the oldest supported version raises the project's compatibility floor. Code may then use features available in the new minimum, and compatibility code needed only by dropped versions may become removable.

Deprecation cleanup is primarily part of adding support for each Python release. Do not make deprecations the sole focus here. The main opportunity is to adopt useful features that the new minimum guarantees while preserving behavior on every remaining supported version.

If the requested minimum is not already in the project's tested support range, also follow the `add-python-version-support` workflow before claiming support.

## Workflow

### 1. Establish Scope and Policy

1. Identify the exact versions being dropped and the requested minimum.
2. Determine whether the target is a package, application, standalone script, or a workspace containing multiple independently configured projects.
3. Resolve each independent project separately. Do not impose one support range on unrelated project roots.
4. Read the project's actual support declarations. Do not infer its supported range from the selected interpreter or terminal `python`.
5. Preserve unrelated platform, implementation, and dependency support policies.
6. Determine whether the requested minimum is a final or prerelease Python version. Treat a prerelease floor as provisional and do not present it as normal released-version support.

If a request says only "upgrade" or "migrate" to a Python version, determine whether the user intends to raise the minimum, add another tested version, or do both. Do not silently drop supported versions when the intent is ambiguous.

This workflow assumes the dropped versions form a contiguous block at the lower end of the support range. If the request removes an interior version while retaining older versions, use the terminal path below instead of the floor-raising workflow.

#### Interior-Version Exclusion Path

For an intentional noncontiguous support policy:

1. Preserve the existing minimum and every retained version below and above the exclusion.
2. Express only the requested exclusion in authoritative version constraints. For package metadata, use an appropriate version exclusion such as `!=3.10.*`; do not raise the lower bound.
3. Remove only the excluded version from CI, tox, nox, classifiers, and support documentation. Preserve jobs and declarations for every retained version.
4. Keep tool target versions, active runtime pins, compatibility code, dependencies, and syntax aligned with the unchanged minimum. Do not apply floor-based modernization.
5. Run the project's existing validation on the minimum, the nearest retained versions below and above the gap when available, and the highest supported version.
6. Report the excluded version, unchanged minimum, declarations updated, validation results, and any tooling that cannot represent a noncontiguous range.

After completing this path, stop. Do not continue with sections 2–5, which apply only when the minimum is raised.

### 2. Inventory Version Declarations

Inspect the files the project actually uses, including:

-   `[project].requires-python` in `pyproject.toml`;
-   legacy `python_requires` declarations in `setup.cfg` or statically readable `setup.py`;
-   `requires-python` in inline script metadata;
-   package-manager-specific Python constraints;
-   Python Trove classifiers;
-   Pyright, Ruff, mypy, formatter, and other tool target versions;
-   CI matrices and tox, nox, or equivalent test environments;
-   development and deployment version pins when they encode the support policy;
-   support tables, badges, installation instructions, and release documentation.

Also search source and dependency configuration for:

-   `sys.version_info` and other runtime version checks;
-   compatibility imports and fallback implementations;
-   conditional dependency markers based on `python_version`;
-   backport packages;
-   `typing_extensions` features that may be available in the new minimum.

Treat generated lockfiles as tool-owned artifacts. Regenerate them with the project's existing package manager when input constraints change; do not hand-edit them.

### 3. Review Newly Available Python Features

Read the official **What's New** document for every Python feature release that becomes newly guaranteed, from the previous minimum (exclusive) through the new minimum (inclusive):

```text
https://docs.python.org/{version}/whatsnew/{version}.html
```

Focus on:

-   language and syntax additions;
-   standard-library additions and improvements;
-   typing features;
-   standard-library functionality that can replace a dependency or backport;
-   porting notes that affect the proposed minimum.

Use official documentation rather than relying on model memory. If it is unavailable, state that limitation instead of inventing release details.

Produce a short list of applicable opportunities. Do not rewrite code merely to demonstrate every available feature.

### 4. Apply the Support Change

1. Update the authoritative minimum-version metadata.
2. Do not introduce a `Requires-Python` upper bound. Preserve intentional exclusions and unrelated constraints.
3. Remove dropped versions from test matrices and support documentation. When updating YAML, preserve quoted Python version strings (for example, `"3.10"`) so they are not parsed as numbers such as `3.1`.
4. Remove classifiers for versions the release no longer supports.
5. Add or retain classifiers only for versions the project validates and publicly supports.
6. Update active development, build, container, and deployment runtime pins that are below the new minimum. Do not change pins that already satisfy the new minimum merely to make every environment use the same version.
7. Align tool target-version settings with the new minimum when those settings represent the package's runtime floor.
8. Remove compatibility branches, imports, and dependencies only when:
    - no remaining supported version needs them;
    - their behavior and side effects are understood;
    - all remaining references are updated.
9. Apply useful, behavior-preserving modernizations enabled by the new minimum. Prefer the project's existing formatter, linter, or modernization tool when it already provides a safe transformation; do not install a new tool solely for this workflow.
10. Keep generated-file and vendored-code policies intact.

### 5. Validate

Run the project's existing validation, prioritizing:

1. the test suite on the new minimum;
2. the test suite on the highest supported version;
3. configured type checking, linting, and formatting;
4. package build or metadata validation when packaging metadata changed;
5. active container or deployment environments whose Python pin changed, using the project's existing validation.

If an interpreter or validation command is unavailable, do not claim success for that part of the support range. Report exactly what was and was not verified.

After validation, confirm that:

-   source syntax and APIs are valid on the new minimum;
-   version declarations, test matrices, classifiers, and docs agree;
-   removed compatibility code is no longer referenced;
-   generated dependency artifacts are consistent with their inputs;
-   active runtime pins and environments do not use a dropped Python version;
-   no change requires a Python version newer than the declared minimum.

## Completion Report

Report:

-   the previous and new minimum versions;
-   metadata, classifiers, test matrices, and documentation updated;
-   compatibility code or dependencies removed;
-   newly available features adopted and candidates left for review;
-   validation run for each supported boundary;
-   unavailable interpreters, failed checks, or unresolved compatibility risks.

Do not describe the migration as complete when required validation did not run or failed.

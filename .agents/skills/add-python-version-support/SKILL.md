---
name: add-python-version-support
description: 'Guide changes required when a project adds a newer Python version above its current tested ceiling while preserving its existing minimum. Use when asked to support, test, certify, or prepare for a newer Python release at the upper end of the support range without dropping existing runtimes.'
---

# Add Python Version Support

Use this skill to extend the upper end of a project's tested Python support range while preserving compatibility with its existing minimum.

## Core Principle

Adding a newer Python version above the current tested ceiling raises that ceiling, not the compatibility floor. The project generally cannot adopt syntax or APIs introduced by the added version while earlier versions remain supported.

The main source-code work is to find and resolve porting issues, removals, and deprecations exposed by the added version. Keeping warnings clean across the supported range reduces future migration work.

If the project supports exactly one Python version and replaces it with another, the change both adds and drops support. Follow this workflow and `drop-python-version-support`.

## Workflow

### 1. Establish Scope and Existing Support

1. Identify the Python version being added.
2. Determine the project's existing minimum and highest tested versions.
3. Determine whether the target is a package, application, standalone script, or a workspace containing multiple independently configured projects.
4. Resolve each independent project separately. Do not impose one support range on unrelated project roots.
5. Read actual metadata, test configuration, and support documentation. Do not infer support from the selected interpreter.
6. Determine whether the target Python release is final or prerelease. Treat prerelease results as provisional.

If a request says only "upgrade" or "migrate" to a Python version, determine whether the user intends to add another tested version, replace older runtimes, or do both. Do not silently change the minimum when the intent is ambiguous.

This workflow assumes the target is newer than the project's highest tested version. If the target is already inside the tested range, treat the request as targeted validation rather than raising the ceiling. If it fills an untested gap, add only the missing test coverage and related support declarations. If it is below the current minimum, report that it expands support below the current compatibility floor and requires separate backward-compatibility analysis; do not lower the minimum or apply this workflow unchanged.

### 2. Inventory Support Declarations

Inspect the files the project actually uses, including:

-   `[project].requires-python` in `pyproject.toml`;
-   legacy `python_requires` declarations in `setup.cfg` or statically readable `setup.py`;
-   `requires-python` in inline script metadata;
-   package-manager-specific Python constraints;
-   Python Trove classifiers;
-   CI matrices and tox, nox, or equivalent test environments;
-   Pyright, Ruff, mypy, formatter, and other tool target versions;
-   dependency constraints and environment markers;
-   support tables, badges, installation instructions, and release documentation.

The selected development interpreter and deployment default are separate choices. Do not change them merely because the project is adding another tested version.

Keep type-checker, linter, and formatter compatibility targets at the existing minimum when those settings represent the project's runtime floor. Do not raise Pyright `pythonVersion`, mypy `python_version`, Ruff `target-version`, or equivalent settings to the newly added ceiling; doing so can hide or introduce code that breaks the minimum.

### 3. Review Compatibility Guidance

Read the official **What's New** document for every Python feature release between the previous tested ceiling (exclusive) and the target version (inclusive):

```text
https://docs.python.org/{version}/whatsnew/{version}.html
```

Prioritize:

-   the porting section;
-   deprecated APIs and behavior;
-   removed APIs, modules, and behavior;
-   changes to warnings, exceptions, imports, typing, and runtime semantics;
-   build, packaging, and C-extension compatibility when relevant.

Use official documentation rather than relying on model memory. If it is unavailable, state that limitation instead of inventing release details.

### 4. Add and Test the Target Version

1. Add the target version to the project's CI and test matrices using existing project conventions. Quote Python versions in YAML (for example, `"3.10"`) so they are not parsed as numbers such as `3.1`.
2. If the target skips intermediate Python releases, follow the project's stated test policy: add and validate intermediate versions when the project claims they are tested, or report them explicitly as supported-but-untested or unsupported. Do not invent classifiers for unvalidated versions.
3. Confirm that the test runner, build backend, dependencies, and development tools support the target version.
4. Run the existing test suite on the target interpreter.
5. Surface deprecation warnings according to the project's existing warning policy. If no policy exists, prefer a targeted run that makes `DeprecationWarning` visible; do not turn every warning into an error without understanding the project's baseline.
6. Fix relevant deprecations, removals, and compatibility failures.
7. Choose fixes that remain valid on the existing minimum. If no suitable replacement works across the supported range, report the issue and ask before introducing a new compatibility layer.
8. Re-run the test suite on the existing minimum after source or dependency changes.
9. Run configured type checking, linting, formatting, and package-build validation.

Do not guess dependency versions. When a dependency blocks the target interpreter, identify the evidence and make the narrowest change consistent with the project's dependency policy, or report the blocker.

### 5. Update Support Metadata

1. Keep the lower bound of `Requires-Python` unchanged.
2. Python packaging guidance discourages `Requires-Python` upper bounds. If an existing upper bound excludes the target, remove or widen it only after validation and without changing unrelated exclusions.
3. Add the target version's Trove classifier only after validation demonstrates support and the classifier exists.
4. Update support documentation to distinguish declared compatibility from versions actually tested.
5. Regenerate tool-owned lockfiles when dependency inputs change; do not hand-edit generated artifacts.

Adding support for Python 3.15 while retaining Python 3.11, for example, does not mean changing `requires-python` to `>=3.15`.

### 6. Final Compatibility Check

Confirm that:

-   the target version is included in repeatable test configuration;
-   relevant porting issues, removals, and deprecations are resolved or explicitly reported;
-   source syntax and APIs remain valid on the minimum;
-   dependency and build-tool compatibility is established;
-   metadata, classifiers, test matrices, and documentation agree;
-   no target-version-only feature was introduced into code that must run on earlier versions.

For a prerelease interpreter, report support as provisional and avoid presenting it as equivalent to validation on the final release.

## Completion Report

Report:

-   the existing support range and added version;
-   compatibility guidance reviewed;
-   deprecations, removals, dependency issues, and test failures addressed;
-   test and validation results for the target and existing minimum;
-   metadata, classifiers, matrices, and documentation updated;
-   unavailable interpreters, provisional results, or unresolved blockers.

Do not claim support when the target-version test suite did not run or failed.

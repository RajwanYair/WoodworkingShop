---
name: pylance-docs
description: 'Use when the user explicitly asks for the Pylance docs skill, or when an answer depends on current official Pylance documentation for settings, diagnostics, configuration, troubleshooting, feature behavior, or supported workflows.'
---

# Pylance Docs

Use this skill when the answer should be grounded in current Pylance documentation instead of memory, source guesses, or stale web knowledge.

## Workflow

1. Turn the user's question into a Pylance documentation search query.
2. Call `pylanceDocuments` with `action="search"`.
3. Fetch the most relevant result with `action="fetch"`.
4. Follow important `references` by calling `pylanceDocuments` with `action="fetch"` again for each referenced document you need.
5. Answer from the fetched documentation. Say when the docs do not cover the requested behavior.

## When Docs Are Not Enough

-   Use `pylanceSettings` when the user needs the effective settings for the current workspace.
-   Use `pylanceLSP` diagnostics when the user asks about a specific Problems entry, diagnostic code, or file error.
-   Use `pylancePythonEnvironments` when the question depends on the editor-selected interpreter.

## Working Rules

-   Prefer official docs for settings, diagnostics, feature support, configuration, and troubleshooting claims.
-   Do not treat source search as official product guidance.
-   Do not read referenced doc paths directly from disk; fetch references through `pylanceDocuments` so uncached docs are retrieved correctly.
-   Include the setting name, diagnostic code, or feature name that changed the answer when reporting the result.

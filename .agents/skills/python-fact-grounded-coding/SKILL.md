---
name: python-fact-grounded-coding
description: 'Use when the user explicitly asks for the Python fact-grounded coding skill, or when a Python coding, debugging, explanation, or bug-fix task should be grounded in verified Pylance facts, runtime values, diagnostics, selected interpreter state, tests, or debugger evidence before changing code or reporting a conclusion.'
---

# Python Fact-Grounded Coding

Treat reasoning as a source of hypotheses, not proof. Before explaining behavior or changing code, collect enough observable facts to support the answer.

## Pylance Tool Routing

When Pylance MCP tools are available, use them for facts that generic file reading cannot reliably prove.

-   Use `pylanceLSP` for diagnostics, hover/type facts, definitions, references, signatures, call hierarchy, document symbols, and workspace symbols.
-   Use `pylanceSemanticContext` when a cursor position needs related imports, base classes, overrides, usages, call sites, or dependency context.
-   Use `pylanceCheckSignatureCompatibility` before or after changing a function signature to verify existing callers.
-   Use `pylanceImports` plus `pylanceInstalledTopLevelModules` for dependency and unresolved-import questions; do not infer the editor environment from terminal `python`.
-   Use `pylanceDocuments`, `pylanceSettings`, `pylancePythonEnvironments`, or `pylanceWorkspaceRoots` for Pylance behavior, configuration, workspace, or selected-interpreter claims when those tools are available.
-   Use `pylanceRunCodeSnippet` for a focused runtime value, return value, parser result, or small input/output check.
-   Use `pylancePythonDebug` when the answer depends on a branch, exception, loop iteration, closure, subprocess, mutable state, or frame-local value.
-   Use `pylanceSyntaxErrors` or `pylanceFileSyntaxErrors` to validate generated Python syntax before treating code as ready.

## Evidence Ladder

Use the lightest reliable evidence that settles the question. Escalate when the current evidence leaves uncertainty.

1. **Language facts**: Use Pylance code intelligence for symbol meaning, types, diagnostics, references, signatures, base classes, overrides, and call sites.
2. **Product and workspace facts**: Use Pylance docs, settings, workspace, import, and environment tools for claims about Pylance behavior or editor-selected Python state.
3. **Execution facts**: Use a focused snippet or test when the answer depends on runtime values, return values, parsing behavior, or a concrete input/output case.
4. **Debugger facts**: Use the debugger when the issue depends on a branch, exception, loop iteration, closure, subprocess, mutable state, or frame-local value.

## Example Workflows

-   **Explain or fix a diagnostic**: call `pylanceLSP` for `textDocument/diagnostic` or `workspace/diagnostic`, keep the exact diagnostic code/message in mind, then inspect only the code needed to explain or fix that rule.
-   **Change Python API behavior**: use `pylanceLSP` references or `pylanceCheckSignatureCompatibility` to find real call sites, patch the producer, then run the focused test or snippet that proves the changed behavior.
-   **Debug dynamic runtime behavior**: inspect the relevant test and source, run a focused snippet or test, and escalate to `pylancePythonDebug` if the important value is produced inside a branch, loop, callback, or mutable context.
-   **Audit imports or requirements**: compare `pylanceImports` with `pylanceInstalledTopLevelModules`; use diagnostics only when locations, severities, or report codes matter.

## Working Rules

-   Name assumptions explicitly as hypotheses until verified.
-   Verify the exact symbol, type, diagnostic code, call path, or runtime value that the task depends on.
-   For bug fixes, prefer a repro test, failing command, snippet, or debug session before patching behavior.
-   Fix the producer of the wrong behavior after the facts identify it; avoid patching a downstream symptom because it looks plausible.
-   After changing code, run the focused validation that would have caught the original mistake.
-   If a needed verification tool is unavailable, say what remains uncertain and keep the change narrow.

## Common Traps

-   Do not patch from a familiar bug pattern until observed values confirm this code is taking that path.
-   Do not treat text search as proof of semantic relationships such as overrides, re-exports, aliases, or call compatibility.
-   Do not infer the editor/Pylance interpreter from terminal `python` or PATH.
-   Do not explain a diagnostic from wording alone when the exact Pylance rule code is available.
-   Do not say a test, breakpoint, or tool would prove something; run it or label the result as unverified.

## Minimal Good Answer Shape

When reporting the result, include the facts that changed the decision: the diagnostic code, type, call site, runtime value, failing input, debugger frame, or test result. Keep speculation out of the conclusion.

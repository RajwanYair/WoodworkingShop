---
name: pylance-refactoring
description: 'Use when the user explicitly asks for the Pylance refactoring skill, or when they want named automated Python refactorings applied to one file, many files, a workspace, a folder subset, or a composed cleanup workflow such as workspace-wide unused-import cleanup, wildcard-import conversion followed by unused-import cleanup, inferred type annotations, or Pylance fix-all.'
---

# Pylance Refactoring

Use this skill to orchestrate named Pylance automated refactorings across one file, a filtered file set, or a whole workspace. `pylanceInvokeRefactoring` operates on one file at a time; batch workflows combine it with workspace discovery and per-file reporting.

## Verified Tool Facts

-   `pylanceInvokeRefactoring` takes one `fileUri`, one refactoring `name`, and optional `mode`.
-   `mode="update"` applies the returned workspace edit; omitted `mode` defaults to `update`.
-   `mode="edits"` returns a WorkspaceEdit without modifying files.
-   `mode="string"` returns updated content for the target file without modifying files.
-   `pylanceWorkspaceRoots` returns workspace root URIs, and `pylanceWorkspaceUserFiles` returns Pylance-visible user Python files for a workspace root.
-   In VS Code-backed Copilot Chat, `mode="update"` applies a VS Code workspace edit to editor buffers. It does not save files to disk. A terminal reads the on-disk file, so terminal validation can miss refactoring edits until the user or Copilot saves the edited files.

## Batch Workflow

1. Resolve scope.
   If the user named files, use those files. If the user asked for a folder, package, project, or workspace, get the workspace root with `pylanceWorkspaceRoots`, then get Pylance-visible files with `pylanceWorkspaceUserFiles` and filter that list to the requested scope.
2. Choose the refactoring names from the map below.
   For composed workflows, run one refactoring pass at a time across the target set.
3. Preview broad edits when appropriate.
   For “show me”, “preview”, “what would change”, or ambiguous broad-scope requests, call `pylanceInvokeRefactoring` with `mode="edits"` or `mode="string"` per target file and summarize the files that would change. If the user clearly asked to apply, use `mode="update"`.
4. Apply per file and track results.
   Invoke `pylanceInvokeRefactoring` once per target file. Track changed files, no-op files, and errors separately.
5. Save before terminal-based validation.
   After `mode="update"` in VS Code-backed Copilot Chat, save changed files before running terminal tools, tests, or shell-based inspections that read from disk.
6. Validate and report.
   For larger changes, run the most relevant validation available, such as diagnostics or focused tests. Report the refactoring names used, target scope, changed/no-op/error counts, files saved before terminal validation, and any files skipped by the user's filter.

## Common Workflows

-   **Remove unused imports from the whole workspace**: `pylanceWorkspaceRoots` → `pylanceWorkspaceUserFiles` → for each target file call `pylanceInvokeRefactoring` with `name="source.unusedImports"`.
-   **Clean imports under a folder**: get user files, filter paths to the requested folder such as `src/` or `tests/`, then run `source.unusedImports` per matching file.
-   **Expand wildcard imports, then clean up**: run `source.convertImportStar` across the target files first, then run `source.unusedImports` across the same target files.
-   **Convert imported names to module-qualified imports, then clean up**: run `source.convertImportToModule`, then `source.unusedImports` if the user asked for cleanup too.
-   **Preview workspace cleanup**: run the requested refactoring with `mode="edits"` on each target file, summarize files with edits, then wait for the user to confirm before applying if the request was only a preview.
-   **Run Pylance fix-all on a file set**: run `source.fixAll.pylance` per target file. This applies the fixes configured by Pylance settings, so use settings/diagnostics tools when the user asks what fix-all includes.

## Refactoring Map

| User intent                                                   | `name`                               |
| ------------------------------------------------------------- | ------------------------------------ |
| Remove unused imports                                         | `source.unusedImports`               |
| Convert absolute/relative import format                       | `source.convertImportFormat`         |
| Expand `from module import *`                                 | `source.convertImportStar`           |
| Convert `from module import name` to module-qualified imports | `source.convertImportToModule`       |
| Rename user modules that shadow standard library modules      | `source.renameShadowedStdlibImports` |
| Add inferable type annotations                                | `source.addTypeAnnotation`           |
| Apply available Pylance auto-fixes                            | `source.fixAll.pylance`              |

## Working Rules

-   Treat workspace-wide refactoring as orchestration over many single-file tool calls, not as one bulk API call.
-   Prefer `pylanceWorkspaceUserFiles` over raw globbing for workspace-wide requests so the target set matches Pylance's user-code view.
-   Preserve the user's scope exactly: all files, selected files, a folder, tests only, src only, changed files only, or explicit exclusions.
-   In VS Code-backed Copilot Chat, do not assume terminal tools can see `mode="update"` results until files are saved. Save before terminal validation, or use Pylance/editor-visible tools for immediate post-refactor checks.
-   Use this skill for the named refactorings above, not for arbitrary code rewrites.
-   Do not use this for semantic rename, reference search, diagnostics explanation, or signature-impact analysis; use Pylance LSP or signature compatibility tools for those.
-   If `pylanceInvokeRefactoring` returns no edits for a file, count it as a no-op instead of inventing a manual cleanup.
-   If a later manual edit is needed, keep it separate from the automated refactoring and explain why.
-   After `mode="update"`, do not manually reapply the same refactoring to the same file.

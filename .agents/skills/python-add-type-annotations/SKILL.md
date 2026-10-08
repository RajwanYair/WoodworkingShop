---
name: python-add-type-annotations
description: 'Use when the user explicitly asks for the Python type annotation skill, or when they want to make their own Python source type-safe by adding inline type annotations to one file, a set of files, or a package/workspace in bulk — annotating function return types, parameters, module-level and class-level variables/constants (including dataclass and similar fields), validating diagnostics against a baseline, and reporting newly surfaced type errors.'
---

# Python Add Type Annotations

Make a user's own Python source type-safe by writing **inline** type annotations into the `.py` files — return types, parameter types, and variable/constant types (both module-level and class-level, including dataclass and similar fields). This skill owns scope resolution, ordering, edit placement, and validation. It delegates the hard part — determining each correct type — to the `python-type-inference` skill.

This skill annotates source the user owns and can edit. It does not create `.pyi` stub files and does not remove or reorganize symbols; use the stub-writing skill for third-party libraries under `typings/`.

The goal is correctness, not a higher number. A correct annotation removes real type errors and documents a contract the code honors. A wrong annotation is worse than none, because it makes callers and the checker trust something false. Leave a symbol unannotated when its correct type cannot be verified.

Correctness is the ceiling; **coverage is the floor**. Every enumerated symbol in scope must be _attempted_. The most common failure is not a wrong type — it is a slow, deep dive into one hard signature that burns the whole budget and leaves most symbols never even looked at. An unattended easy symbol is a pure loss. Work the whole scope breadth-first: resolve the many clear symbols first, and **time-box** each hard one so a single stubborn signature never starves the rest.

## Public Completeness Gate

When the requested goal is VerifyTypes or public type completeness, this gate is mandatory:

1. Call `getPublicSurface` with `compact=true` for every target module and fully inspect each result **before
   editing**. This is the actionable queue of ambiguous inferred public members. Use the full surface separately
   when you need to freeze every exported name; if a full result is saved to a temporary file because it is
   large, read or search that file rather than ignoring it.
2. Make every incomplete public member a work item, including inferred instance and class attributes omitted
   by `listMissingAnnotations`. A zero-length syntactic queue does not mean the public surface is complete.
   For upstream contribution work, classify each work item before editing: do not add an inline variable or
   field annotation when the repository's supported checkers already infer the same precise type from a simple
   literal, constructor, conversion, or direct typed assignment and the annotation adds no independent API
   contract or checker benefit. Report that residual as an analyzer-completeness limitation instead of creating
   score-only churn. This exception does not apply to `.pyi` files, where declarations must be explicit.
   Package-wide 100% completeness is aspirational, not required for an upstream improvement. Prefer a coherent
   set of independently useful public contracts and report unresolved dynamic or external boundaries honestly.
   Reject a subset that improves only internal helpers while leaving the documented API unchanged. Compare known,
   ambiguous, unknown, and total exports for each plausible scope; a larger denominator is acceptable only when
   it comes from faithfully preserving runtime-visible imports or reexports.
   Never add obvious annotations, cross suppression boundaries, weaken contracts, or introduce checker escapes
   merely to complete the rest of the package.
3. Rerun `getPublicSurface` with `compact=true` after editing. Do not report completion while an item remains
   unless you name that member and give the evidence-backed reason it cannot be annotated honestly.

## Order Of Work

Annotate in dependency order, because later stages read the types settled by earlier ones:

1. **Function/method return types** first.
2. **Parameter types** next.
3. **Variable, constant, and proven field types** last — module-level variables/constants and class-level attributes whose existing field semantics are established under the active framework, version, and configuration.

Within each stage, resolve each symbol's type with the `python-type-inference` skill using `allowHelperDeclarations=false`, then write the annotation. This constraint applies to fields as well as returns, parameters, and module-level values. Do not skip ahead — a resolved return type often pins the parameter and variable types that depend on it.

## Workflow

1. **Resolve scope.**
    - If the user named files, use those.
    - If the user asked for a folder, package, project, or workspace, call `pylanceWorkspaceRoots`, then `pylanceWorkspaceUserFiles`, and filter that list to the requested scope. Prefer this over raw globbing so the target set matches Pylance's user-code view.
2. **Establish compatibility, diagnostic, and public-surface baselines.** For an upstream contribution, first read `CONTRIBUTING`, the pull-request template, and repository automation policies. Stop before authoring when AI-authored code or the proposed scope cannot truthfully satisfy mandatory contribution requirements; never misrepresent authorship or scope. Before measuring or editing, verify that the environment has an authenticated fork, push, and pull-request path to the actual upstream host; do not substitute a mirror when that path is unavailable. Read the project's supported Python range from `requires-python`, package metadata, CI configuration, or the user's explicit target. If no declaration exists, preserve the file's existing syntax and typing-import style rather than assuming the active interpreter is the minimum. Every added annotation, typing name, and syntax form must work on the oldest supported version without adding an undeclared dependency. Then capture current diagnostics for each target file with `pylanceLSP` `textDocument/diagnostic` (or `workspace/diagnostic` for a large set), and capture the exported target modules with `pylanceTypeAuthoring` `getPublicSurface`. These baselines are what "did not introduce wrong types" is measured against. Baseline diagnostics are not independent repair targets, but diagnostics about missing in-scope annotations still identify symbols that belong in the annotation queue. Your job is to add annotations, not to drive the pre-existing error count to zero. A signature that already errors for an unrelated reason before you touch it — a deprecation shim, a sentinel-default (`type[DEPRECATED_DEFAULT]`) pattern, a call site the author knowingly types loosely — is not yours to fix; note that diagnostic and continue the annotation sweep.
   `getPublicSurface` can be large enough that the tool saves its result to a file instead of returning it
   inline. That file is not optional output: inspect it before choosing targets, searching for incomplete,
   ambiguous, unknown, and missing-annotation entries. Never replace this inspection with guesses from the
   source or from `listMissingAnnotations`.
   Trace each ambiguous exported class to its first ambiguous member before editing downstream functions.
   A single incomplete class member also makes the class and every signature that returns it ambiguous, so
   broad parameter edits elsewhere cannot improve those symbols. If the root is a class-body loop target or
   other temporary that is deleted and absent at runtime, do not annotate, rename, or preserve it merely to
   raise completeness; record the static/runtime surface mismatch and reject that score path.
   When the requested goal is VerifyTypes or public type-completeness improvement, define the annotation scope
   from the frozen ambiguous and unknown exports and their type dependencies. Do not expand that scope to
   private caches, metadata dunders, or already-known exports merely because `listMissingAnnotations` reports
   syntactic gaps. A full source-coverage request is a different scope.
3. **Enumerate symbols to annotate.** Call `pylanceTypeAuthoring` with `command="listMissingAnnotations"` and `scope="inline"` for every target file. Use its deterministic priority order for the breadth-first sweep; an item with `reason="explicitAny"` is unresolved work, not a completed annotation. Treat every class-body item as a candidate, not proof that it is already a field. Before annotating it, establish under the active framework, version, and configuration that the declaration is already a field or schema/key entry and that adding the annotation preserves constructor, schema, key, and class-variable behavior. If the annotation would create or reclassify the item, leave it unchanged unless the task explicitly requests restoration and independent evidence proves that intent.
   Union this queue with the incomplete members reported by the public-surface baseline.
   `listMissingAnnotations` can omit inferred instance or class attributes even when VerifyTypes reports
   "Type is missing type annotation" for them. For each such diagnostic, locate the assignment or the
   initialization path and add that field to the queue; do not stop after the syntactic list is empty. Before
   editing, apply the upstream usefulness gate above and leave trivially inferred score-only fields unchanged.
   The queue omits declarations that already have typing meaning, such as `TypeVar(...)` and type-alias assignments. That is correct for ordinary missing-annotation work, but it does not prove an existing declaration qualifier was never removed. Treat otherwise-unused typing imports, compatibility comments, and equivalent declarations in the same package as hypotheses that a qualifier needs restoring, then verify:
    - For `T = TypeVar(...)`, never write `T: TypeVar = ...`; a concrete declared type can destroy TypeVar recognition. A qualifier-only declaration such as `T: Final = TypeVar(...)` can preserve the TypeVar while documenting that the binding is not reassigned. Test the exact candidate with Pylance, confirm a use of `T` still resolves as a TypeVar, and check for new diagnostics before applying it.
    - Do not annotate an inferred type alias merely for coverage. When evidence establishes that the source contract uses an explicit PEP 613 declaration, restore `Alias: TypeAlias = ...` and verify that generic aliases still specialize correctly. If `TypeAlias` is unavailable on the oldest supported Python and the project has no established compatible backport, leave the inferred alias untouched. Never manufacture `TYPE_CHECKING` branches, `try`/`except` fallbacks, helper bindings, or other runtime statements to make an existing alias count as annotated; those are executable code changes and can create new fake annotation targets.
4. **Cheap first pass.** Call `pylanceInvokeRefactoring` with `name="source.addTypeAnnotation"` and `mode="edits"` to preview the annotations Pylance can already infer safely. Treat its output as a starting point, not a finished result — it covers the easy cases and leaves the hard ones. **Audit the preview before applying it; never apply the returned workspace edit wholesale.** Discard every function-local variable annotation because locals are outside this skill's scope. Discard class-body annotations unless the framework-semantic check in step 3 proves that the declaration was already a field and its runtime/static contract is unchanged. Also discard trivially inferred variable/field annotations that fail the upstream usefulness gate. Apply only the approved annotation edits and the import edits those annotations require. The cheap pass can emit Pylance's _synthesized-type display_ — a pseudo-type in angle brackets such as `<subclass of A and B>` (an intersection), `<function>`, or `<class 'X'>` — which is **not valid Python** and will corrupt the file the moment it is saved. Discard annotations that match these synthesized display forms; do not reject valid annotation syntax merely because a string literal contains `<`. Resolve synthesized displays normally in step 5, and never write one into the source.
5. **Resolve the remaining unknowns breadth-first.** Walk the still-unannotated symbols in the order above. For each, invoke the `python-type-inference` skill with `allowHelperDeclarations=false` and follow its canonical evidence and type-selection policy. This invocation is mandatory; do not substitute direct type reasoning for the delegated result. Apply its resolved type and required imports; when it returns `unresolved`, leave the symbol untouched and record the reason. Complete one fast pass across all files before revisiting unresolved symbols so one hard signature cannot starve the rest of the scope.
6. **Write annotations inline.** Edit the source to add each resolved annotation:
    - Return: `def f(...) -> ResolvedType:`
    - Parameter: `def f(x: ResolvedType, ...):`
    - Variable/constant: `NAME: ResolvedType = ...`
    - Proven class field: annotate in place in the class body, `field_name: ResolvedType = default`, only after confirming that this preserves the framework's existing field semantics. Keep the existing default (`= None`, `field(...)`, etc.); annotate the declared type, not the default's type.
      Preserve every function's existing parameter kinds, order, names, defaults, and forwarding behavior. In particular, never replace `*args`/`**kwargs` wrappers with explicit parameters merely to make the wrapper type-complete. Annotate the variadic parameters in place only when their honest element/value types are known. If a third-party compatibility wrapper forwards to a typed callable but cannot express that callable's heterogeneous signature inline, stop inline work for that module and hand it to `python-write-stubs`; a sibling partial stub can describe accepted calls without changing runtime introspection.
      Keep the edit mechanically annotation-only: do not change or split an existing assignment, do not change a type-alias right-hand side, and do not add `cast(...)`, assertions, branches, helper calls, or other function-body expressions to make an annotation type-check. If an annotation would require executable-code changes, leave it unresolved.
      When replacing sidecar stubs at a maintainer's request, perform a fresh inline inference pass over each
      retained contract. Do not mechanically copy declarations from `.pyi` files: inline annotations participate
      in runtime imports, reflection, inheritance, and mutation that a sidecar can hide. Delete a sidecar only after
      its useful contracts are either represented exactly inline or explicitly omitted as unresolved. Keep
      `py.typed` when the resulting distribution publishes inline PEP 561 typing.
      Treat runtime callable introspection and incompatible inherited mutable fields as hard boundaries. If behavior
      branches on declared parameter count, or a subclass replaces a base container with an invariant incompatible
      element type, inline annotations cannot repair the public contract. Leave the surface unresolved or hand a
      separately coherent module to stub work; do not broaden callbacks, drop the real base, or annotate a false
      inherited field type.
      Treat every existing checker-suppression comment (`type: ignore`, `pyright: ignore`, `noqa`, or an
      equivalent tool directive) as an editing boundary. Preserve the declaration and directive exactly; do not
      annotate, reparameterize, remove, retag, or replace it merely to improve completeness. Never add a new
      suppression to make an annotation pass. If a proposed annotation produces a diagnostic that requires a
      suppression, revert the annotation and leave the original code unchanged.
      Never add a standalone declaration merely to annotate an existing value. This includes module variables (`version: str`), class attributes (`value: str`), fields (`self.start: str`), locals, and exception targets. Never rewrite a pre-existing bare annotation (`name: Type` without `= value`), including replacing an existing `Any`; leave it unresolved. Bare module and class declarations change runtime `__annotations__`; bare declarations elsewhere still change the source's executable AST.
      Never introduce a new `TypeVar`, `ParamSpec`, `TypeVarTuple`, type-alias, overload-only, helper-function, or helper-class declaration to express an inline annotation. Those declarations add runtime statements and can add public symbols. If an honest annotation requires a new helper declaration, leave it unresolved or use a stub when the task permits one.
      For fields first created by a chained assignment, keep that chain unchanged. Search for each field's later simple assignments and annotate one in place. For example, keep `self.start = self.join_str = self.operator`, change a later `self.start = ""` to `self.start: str = ""`, and change a later `self.join_str = ","` to `self.join_str: str = ","`. An explicit annotation on any assignment establishes the field type. If no later simple assignment exists, leave inline work unresolved.
      For chained module variables, likewise search for a later simple assignment that can be annotated in place. Do not add bare declarations and do not append an assignment type comment: Pyright's VerifyTypes ambiguity check does not treat that comment as an explicit public declaration. If no later simple assignment exists, leave the variables unresolved and hand them to `python-write-stubs` when a stub is allowed.
      When a module conditionally replaces exported functions with native implementations, identify the branch
      selected in the target environment before editing. If that branch is typed by a sibling `.pyi`, annotations
      in the Python fallback do not change the exported contract; hand the active module to `python-write-stubs`.
      Keep edits minimal and local; do not reformat or reorder surrounding code. When you apply several annotations to one file, make them as separate non-overlapping edits and re-read the affected lines afterward: a later edit that rewrites a line can silently drop an annotation an earlier edit (or the cheap pass) already placed. Confirm the earlier annotations survived before moving on.
7. **Add required imports correctly.** When an annotation needs an import, add it. First check whether the module or its framework evaluates annotations at runtime through `typing.get_type_hints`, `__annotations__`, schema generation, dependency injection, serialization, or similar reflection. Keep every name needed by that runtime evaluation normally imported; postponed or string annotations still need those names available when they are resolved. Only put imports under `if TYPE_CHECKING:` when they are exclusively for static analysis, using a string/forward-reference annotation or `from __future__ import annotations` to avoid runtime import cost and cycles. Do not move an existing runtime import behind `TYPE_CHECKING` merely because ordinary executable code does not reference it. An annotation-only import is allowed; newly added control flow, fallback assignments, compatibility shims, and helper declarations are not.
   During annotation-only work, never remove, reorder, or replace a pre-existing import or other executable statement merely because it appears unused after your edits. Add only the imports required by annotations; preserve every existing statement.
8. **Validate incrementally, then fully.** Don't defer all checking to the end. After each batch of ~5–10 annotations, re-run diagnostics on the changed file and compare against the **baseline set** from step 2 — only a diagnostic that is _new_ relative to that baseline can be evidence your annotation is wrong. Also re-check changed exported symbols against the public-surface baseline. Revert any annotation that turns a baseline-known public symbol unknown or ambiguous, even when diagnostics stay unchanged. For generic annotations, inspect the written type after the edit and require every type argument to remain known; a bare generic such as `SomeGeneric` is not resolved merely because it produces no diagnostic. A diagnostic that was already present in the baseline is never yours to act on, even if it names a symbol you just annotated near. If a genuinely new diagnostic proves an annotation is wrong — the annotated type lacks a member the code uses, with no dynamic mechanism explaining it — revert or fix that one annotation immediately, before it misleads the types you resolve next. Do a final full re-run of diagnostics and public-surface status on every changed file and compare against the baselines. A rise in the raw error count is acceptable **only** when the new diagnostics are correct type errors surfaced by newly-honest types; a regression in a baseline-known public symbol is never acceptable.
    - MCP analysis can lag behind edits made through external file tools. If `getPublicSurface(compact=true)` still lists a symbol whose saved source already contains an explicit annotation, treat that result as stale: re-read the saved line and do **not** add a duplicate class/module declaration, import, or assignment rewrite. One explicit annotation is sufficient.
9. **Verify edits landed; coverage is the win.** Narrating an edit is not making it — after your annotation batches, re-read the lines you changed and re-run `pylanceTypeAuthoring` `listMissingAnnotations`; re-apply any annotation that silently did not land. Coverage is the score: an in-scope symbol left blank is a straight loss, so treat a low annotation count as a signal to keep sweeping, not to stop. Do not, however, pad coverage with heavy re-accounting passes or broad placeholder types — a fast confirm-and-fill beats an elaborate audit. Only report counts you have confirmed against the file.
10. **Save before terminal validation.** In VS Code-backed Copilot Chat, `mode="update"` edits editor buffers, not disk. Save changed files before running terminal type-checks or tests that read from disk.
11. **Run the repository's authoritative validation.** Inspect the project's task configuration and run its exact formatter, linter, type-checker, and targeted test commands. A direct invocation against selected files, a locally ignored rule, or a narrower equivalent is useful during iteration but does not replace the configured task that CI runs. Inspect every failure. Fix failures attributable to the annotations and any minimal annotation-formatting changes required for the PR to pass the configured task; separately reproduce and report failures that also occur on a clean baseline.
12. **Report.** Summarize scope, counts of return/parameter/variable annotations added (only ones verified present on disk), symbols left `unresolved` (with reasons), imports added, baseline-vs-final diagnostics, and files saved before terminal validation.

## Inline-Destination Constraints

Use `python-type-inference` as the canonical source for evidence gathering and type selection. This skill adds only the constraints imposed by writing that resolved type into editable `.py` source:

-   Keep changes to annotations and their required imports only. Do not refactor logic, rename, prune symbols, or add runtime behavior to make an annotation true.
-   Preserve runtime signature shape: parameter kinds, order, names, defaults, decorators, and forwarding calls.
-   Preserve `self` and `cls` without annotations. Add `-> None` to `__init__` only when that matches the file or project's annotation convention.
-   Honor the declared minimum Python version and the file's established typing-import style.
-   Preserve existing checker-suppression directives and their declarations exactly. Never add a suppression to support a new annotation.
-   Never write Pylance synthesized-type displays such as `<subclass of A and B>`, `<function>`, or `<class 'X'>`; they are not valid Python annotations.
-   Treat a class-body assignment as a field only after framework-specific evidence proves that annotating it preserves constructor, schema, key, and class-variable behavior.

## Common Traps

-   Do not treat `source.addTypeAnnotation` output as complete; it intentionally skips symbols it cannot infer.
-   Do not hide an annotation import behind `TYPE_CHECKING` unless the annotation is quoted or postponed and runtime annotation resolution does not require the name; follow step 7's runtime-evaluation check.
-   Do not assume terminal type-check results reflect buffer edits until files are saved.
-   Do not raise completeness by narrowing a return to one observed case when callers rely on a wider type.
-   Do not silently drop a symbol you could not resolve; report it as `unresolved` so the gap is visible.
-   Do not collapse a field to its default's type (`x = None` → `x: None`); a `= None` default almost always means `Optional[...]`, so resolve the wrapped type from usage.
-   Do not report an annotation as added without re-reading the symbol to confirm it is present on disk; a narrated edit that never executed is a silent miss, not a success.
-   Do not sink the budget into one hard symbol. Leaving dozens of easy symbols unattempted to perfect a single overload or deprecation shim is the biggest score loss there is; time-box the hard one and cover the rest.
-   Do not chase an unrelated pre-existing diagnostic. A baseline error — a sentinel-default signature, a deprecation shim, a call site the author types loosely — is a magnet that can swallow an entire run. You did not introduce it and eliminating it is not your task. Keep missing-annotation diagnostics in the annotation queue, but recognize unrelated errors from the step-2 baseline and leave them alone.
-   Do not save the cheap pass's synthesized-type output. `source.addTypeAnnotation` can write `<subclass of ...>`, `<function>`, or similar bracketed pseudo-types for intersections and synthesized types; saving them makes the file un-parseable and zeroes the whole run. Audit and discard these synthesized display forms right after the cheap pass, before writing anything else, without rejecting valid annotations whose string literals contain `<`.
-   Do not declare victory with symbols never attempted. Finishing at "I annotated the obvious ones" while a third of the enumerated set sits untouched is the top score-loss on multi-file packages. A mid-difficulty symbol you dismissed as "needs more investigation" is almost always resolvable with one more evidence call — attempt it before you stop. A low annotation count relative to the step-3 enumeration means keep sweeping, not add placeholders.
-   Do not let a later edit silently revert an earlier annotation. Overlapping edits to the same line — or re-running the cheap pass after hand-edits — can drop annotations already placed; re-read the lines to confirm both survived.

---
name: python-type-inference
description: 'Use when the user explicitly asks for the Python type inference skill, or when a task needs the single correct type for a specific Python symbol — a function return, parameter, module-level value, or class/instance field — and that type must be verified against real code rather than guessed. This is the shared core used by the type-annotation and stub-writing skills.'
---

# Python Type Inference

Resolve the **correct** type for one Python symbol at a time — a function/method return, parameter, module-level variable/constant, or class/instance field — using verified evidence from Pylance tools, code execution, the debugger, and the terminal. For fields, include initialization, constructor/setter assignments, later mutations, and read sites in the evidence. This skill produces a type; it does not decide where the type is written. The annotation and stub-writing skills compose this skill and handle placement.

Correctness is the whole point. A wrong type that raises the completeness of a file is worse than an honest gap, because it makes the code claim a contract the implementation does not honor. Prefer a correct broader type over a plausible-but-wrong narrow one, and leave a symbol unresolved rather than guess.

## What Counts As A Resolved Type

A symbol is resolved only when its type refers to fully known types, per Pyright's type-completeness rules:

-   **Return**: annotated with a known type. `__init__` returns `None`.
-   **Parameters**: each input parameter annotated with a known type. `self`/`cls` need no annotation.
-   **Variables/constants**: annotated with a known type.
-   **Classes** (when relevant to the symbol): visible class/instance variables and methods refer to known types; generic bases have known type arguments.
-   A "known type" refers to concrete, resolvable types — not `Unknown`, not an unresolved import, and not an unintended `Any`.

Do not force annotations where Pyright already treats the type as obvious: simple-literal constants (all-caps or `Final`), enum members, module-level type aliases, and the documented module/class dunders. Adding redundant annotations to these is noise, not completeness.

## Caller Constraints

Before resolving a symbol, the caller must state whether the destination permits new helper type declarations:

-   `allowHelperDeclarations=false` for inline annotation work or any destination where adding a `Protocol`, type alias, or helper class would change the requested source surface.
-   `allowHelperDeclarations=true` only when the destination can faithfully contain a private type-only helper without inventing a runtime API.

Treat an omitted constraint as `false`. If the only correct representation requires a helper declaration and helpers are disallowed, return `unresolved` with that reason instead of prescribing an annotation the caller cannot materialize.

## Evidence Ladder

Use the lightest reliable evidence that settles the type. Escalate only when uncertainty remains. Treat reasoning as a hypothesis until an observation confirms it.

1. **Declared/inferred facts** — `pylanceLSP` `textDocument/hover` and `textDocument/signatureHelp` for the type Pylance already infers at the symbol; `textDocument/definition`/`typeDefinition` to resolve the referenced type.
2. **Structural facts** — `pylanceTypeAuthoring` `getPublicSurface` for the exported module/class contract; `pylanceSemanticContext` for base classes, overrides, related imports, call sites, and usages around the symbol.
3. **Usage facts** — `pylanceTypeAuthoring` `checkSignatureCompatibility` to validate existing calls against the current signature; `pylanceLSP` `textDocument/references` and `callHierarchy/*` to see how a return value is consumed and what arguments callers pass, which pins parameter and return types.
4. **Execution facts** — `pylanceRunCodeSnippet` to observe a concrete return value, attribute set, or input/output case when the type depends on runtime construction.
5. **Debugger facts** — `pylancePythonDebug` when the type depends on a branch, exception, loop iteration, closure, subprocess, or mutable/frame-local state that static inspection cannot settle.
6. **Terminal** — targeted commands (e.g. reading `__all__`, inspecting installed package metadata) when they establish a fact the tools above cannot.

## Strategy Playbook

Concrete techniques for hard symbols. Each is a way to _gather_ evidence for the ladder above; every strategy ends by confirming the type, never adopting it on faith.

### Run the package's own tests to observe real types

The suite exercises symbols with the arguments the author intended, so observed runtime types are strong evidence for parameters and returns.

-   Locate the tests (`tests/`, `test_*.py`, pytest config) and pick the case(s) that reach the symbol.
-   Run them through `pylancePythonDebug`: break at the function entry/return or the assignment, or inject a temporary `reveal_type(x)` / `print(type(x))`, then read the concrete type in the frame.
-   Prefer real tests over synthetic snippets — they reflect supported inputs. Fall back to `pylanceRunCodeSnippet` only when no test covers the symbol.
-   Confirm the observed type is representative across multiple cases/parametrizations, not an artifact of one input, before generalizing it to the parameter/return type.

### Reconstruct a type from its used members (structural / duck typing)

When a value's type is unknown, let the operations performed on it name the type.

-   Enumerate every use of the value in the body and at call sites: attribute reads, method calls (and arity), indexing, iteration, `with`/`await`, arithmetic/comparison operators.
-   Find the type that supplies the whole member set with `pylanceLSP` `workspace/symbol` and `textDocument/references`, plus grep/search over the workspace.
-   If exactly one nominal type fits, use it. If several fit, choose their nearest common base or the documented public type. If no nominal type is a clean fit and `allowHelperDeclarations=true`, define a private `Protocol` capturing exactly the members used. Otherwise return `unresolved`.
-   Confirm the candidate against every observed member — one unsupported access means it is wrong; widen it or switch to a `Protocol`.

### Read docs as a hypothesis, then confirm

-   Read the docstring and any typed markup: `:rtype:`/`:type:`/`:param:` (Sphinx), `Returns:`/`Args:` (Google), numpy-style sections, `# type:` comments, and README or existing stub hints.
-   Treat every documented type as a hypothesis only — docs drift from code.
-   Confirm it like any other candidate (hover, usage/call sites, a runtime observation, or the debugger) and adopt it only after an observation agrees. If the code contradicts the docs, trust the code.

## Resolution Workflow (per symbol)

1. **Read what Pylance already knows.** Get the inferred type at the symbol with hover/signature. If it is already a fully known type, adopt it — do not re-derive.
2. **Follow the referenced types to ground.** If the inferred type references another symbol, resolve that with definition/type-definition so the final type has no unknown parts.
3. **Constrain from usage.** For a return, inspect how callers use the value (attributes accessed, operations applied). For a parameter, inspect what callers pass and how the body uses it. Narrow to the type the code actually requires.
   For `async def`, annotate the value produced after awaiting the call, not the coroutine wrapper. Use `-> T`, not `-> Awaitable[T]` or `-> Coroutine[..., T]`, unless the awaited function intentionally returns another awaitable as its value and usage confirms the double-await contract. For an async generator, use `AsyncIterator[T]` or `AsyncGenerator[T, ...]`.
   For a protocol, abstract base class, or overridable method, the annotation describes the contract for every valid implementation. Inspect the base documentation and multiple implementations before narrowing it. Keep the base return broad enough for all permitted implementations; a concrete override may use a narrower covariant return when all of that override's paths support it.
4. **Escalate for dynamic cases.** If construction is dynamic (factories, `**kwargs`, runtime attribute assignment, conditional returns), run a focused snippet or a debugger session to observe the real type before committing.
5. **Verify the candidate against the implementation.** Confirm the type supports every member access and operation the body and callers perform. If the implementation uses a member the candidate type lacks — and no dynamic mechanism (`__getattr__`, monkeypatching, metaclass magic) explains it — the candidate is wrong; widen or correct it.
6. **Prefer precise-but-correct.** Choose the most specific type that remains correct for all observed uses. Do not over-narrow to one observed case when callers pass more. Do not fall back to `Any` when a real type is knowable.

## Output

For each symbol, report:

-   the resolved type (import-qualified so it is unambiguous),
-   the strongest evidence that settled it (inferred type, call site, runtime value, or debugger frame),
-   any imports the type requires, and
-   `unresolved` with the reason when no correct type can be verified, so the caller can leave the symbol untyped rather than guess.

## Correctness Rules

-   Verify the exact type against the symbol's implementation and its call sites before committing.
-   Prefer a correct supertype over an incorrect narrower type.
-   Do not use `Any` to raise completeness; `Any` is only correct when the value is genuinely dynamic.
-   Do not infer `Any` for a parameter merely because the body forwards it to `Callable[[Any], R]`. That callback annotation places no restriction on its input. Prefer `object` when the function accepts every object but does not itself rely on unchecked dynamic operations.
-   Preserve an existing public `Any` unless independent API and implementation evidence proves a more precise contract. Replacing it with `object` or an object-based container can narrow the API without improving completeness.
-   Classify a proposed `object` as an opaque input, opaque output, correlated relationship, external unknown, or under-specified contract. Use it for opaque values, not as a fallback when `Any` is forbidden or dependency typing is incomplete.
-   Do not use a broad union, cast, suppression, or invented protocol solely to raise completeness. If a protocol is the verified contract, return it only when `allowHelperDeclarations=true`.
-   Do not use `Callable[..., R]` solely as a completeness fallback. If the accepted argument shape cannot be verified and represented without a helper declaration, return `unresolved`.
-   Do not invent generic type arguments; resolve them from usage or leave the generic unresolved.
-   Before narrowing a mutable generic field, return, or override, verify invariance and base-class substitutability. Keep the broader sound contract when the concrete runtime value cannot be exposed through an invariant wrapper without violating the inherited signature.
-   Keep the resolution scoped to the requested symbol; resolve dependencies only as far as needed to make the type known.
-   If a required verification tool is unavailable, return `unresolved` and state what remains uncertain.

## Common Traps

-   Do not treat a plausible name or a familiar pattern as the type; confirm it from inferred type, usage, or runtime.
-   Do not adopt a narrow type from a single call site when other callers pass wider values.
-   Do not annotate an obvious literal constant, enum member, or type alias just to increase a count.
-   Do not infer the editor's Python environment from terminal `python`; use Pylance environment/hover facts.
-   Do not report a type a tool "would" confirm; run the tool or return `unresolved`.
-   Do not trust a docstring `:rtype:`/`:param:` without confirming it against the implementation; documented types go stale.
-   Do not generalize a runtime type seen for one test input into the whole parameter/return type when other tests or callers pass wider values.
-   When reconstructing structurally, do not stop at the first same-named type; verify it provides every member the value is used with.

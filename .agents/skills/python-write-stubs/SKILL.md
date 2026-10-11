---
name: python-write-stubs
description: 'Use when the user explicitly asks for the Python stub-writing skill, wants to create or improve `.pyi` type stubs for a third-party Python package, or needs partial stubs under a workspace `typings/` directory without modifying installed package source. Generates stubs through Pylance, resolves uncertain types with the Python type-inference skill, and validates public API, diagnostics, runtime compatibility, and type completeness.'
---

# Python Write Stubs

Create or improve `.pyi` files for Python code the user does not own, especially installed third-party
packages. Write only to the workspace stub path, normally `typings/`. Never edit `site-packages`.

Use `python-type-inference` for every non-trivial type decision. Pass `allowHelperDeclarations=true` only when a
private type-only helper such as a `Protocol` can be declared without inventing or exporting a runtime symbol;
otherwise pass `false` and leave helper-dependent results unresolved. A stub is correct only when it describes
the runtime API without inventing symbols, changing signatures, or hiding unresolved types behind `Any`.

## Workflow

1. **Resolve the package and output roots.**

    - Call `pylanceWorkspaceRoots` to identify the project that will own the stubs.
    - Use the selected Python environment and import resolution to locate the installed package.
    - Read `stubPath` from `pyrightconfig.json`; when absent, use `<projectRoot>/typings`.
    - Keep every generated file under `<stubPath>/<topLevelPackage>-stubs/`. Reject any plan that writes
      into the installed package or outside the selected workspace.

2. **Prove semantic viability before measuring completeness.**

    - Distinguish the distribution name, discovered import package, authoritative typeshed path, and possible
      `types-*` distribution names. Use the installed wheel and current default-branch source as primary evidence;
      package-coverage datasets and released sdists are discovery inputs only. Re-run live issue, pull-request,
      branch, typeshed, and PyPI stub-package overlap checks before selecting a candidate.
    - Read the oldest supported Python version from the current default branch. In strict Pyright and strict mypy
      at that floor, import every required public stdlib, `typing`, `typing_extensions`, and external nominal
      identity in the smallest representative stub. Use an interpreter at that version when runtime availability
      differs from a checker's synthetic target. Reject the candidate when exact typing requires private
      `_typeshed` identities, an undeclared optional dependency, a duplicate nominal or structural stand-in, or a
      name unavailable to either checker.
    - Probe the full runtime domain before drafting the module. Include arbitrary accepted values; buffer, path,
      numeric-conversion, and callback inputs; actual MRO and mutable inherited fields; override substitutability;
      descriptors and function attributes; monkeypatches; callable arity or introspection; generated aliases; and
      native or external nominal objects. Compile the smallest exact inheritance, callback, and overload skeleton
      plus adversarial values that are structurally plausible but behaviorally invalid. Reject before marker
      creation when the contract requires `Any` or `object` erasure, suppression, false inheritance, omitted
      visible names, or a runtime redesign.
    - Freeze the current-main wheel and sdist package layouts and discover every import root before creating
      `py.typed`. Account for bundled tests, vendored and generated modules, namespace packages, and single-file
      distributions. Do not place a marker under a distribution-name guess or convert a module into a package
      merely to publish PEP 561 metadata.
    - Treat syntactic annotation percentages as candidate-discovery signals, not semantic completeness evidence.
      Results produced with `--ignoreexternal`, filtered tests, or omitted public modules cannot prove a candidate
      viable. Performance benchmarks may add identical-path, repeatable-dependency, warmup, repetition, timeout,
      and memory checks only after semantic acceptance; they never replace strict checker, stubtest, surface, or
      runtime validation.

3. **Freeze the baseline.**

    - For an upstream contribution, read `CONTRIBUTING`, the pull-request template, and repository automation
      policies before authoring. Establish whether AI-authored code is accepted and whether the proposed typing
      change can truthfully satisfy every mandatory checkbox. Stop before implementation when repository policy
      prohibits the contribution; never misrepresent authorship or scope.
      Before measuring or authoring, also verify that the environment has an authenticated fork, push, and
      pull-request path to the actual upstream host. Do not substitute a mirror or spend effort on an unpublished
      candidate when the required host cannot be authenticated.
    - Record the installed package version and supported Python versions.
    - Capture the package's public exports and types with `pylanceTypeAuthoring`
      `command="getPublicSurface"`.
    - Capture diagnostics for the consuming workspace with `pylanceLSP`
      `workspace/diagnostic`.
    - Run `pyright --verifytypes <package> --outputjson` in the selected environment when the package is
      importable there.
    - For every ambiguous or unknown export, record the module that owns it. Generate a partial stub only
      for a module that owns at least one target export; a top-level stub cannot improve an incomplete
      submodule merely by re-exporting it.
    - Before authoring bundled stubs for an untyped distribution, create a disposable package copy with the
      intended `py.typed` marker and run unfiltered VerifyTypes. Freeze the modules and accidental reexports that
      become public under PEP 561. Reject or explicitly scope the candidate before writing stubs if completeness
      would require typing shipped tests, vendored code, or unrelated external-package reexports merely to raise
      the aggregate score.
    - Treat 100% package completeness as an aspirational result, not a prerequisite for a useful upstream
      contribution. When one public module or external boundary cannot be represented faithfully, select a
      coherent subset of modules or inline contracts that can. Every authored `.pyi` must still preserve the
      complete visible surface of its corresponding runtime module; never publish a truncated replacement.
      Leave blocked modules unstubbed, document their remaining unknowns, and require a genuine known-export gain
      with no regression. A `py.typed` marker reports typing support; it does not promise a 100% VerifyTypes score.
      Measure each plausible module subset separately and record known, ambiguous, unknown, and total exports.
      Rescope when a broader candidate increases unknown exports without enough public API value. Accept a larger
      denominator only when it comes from faithfully declaring runtime-visible imports or reexports. Reject a
      helper-only gain that leaves the package's documented API untyped, even when its percentage improves.
    - If an upstream maintainer requests direct inline annotations instead of sidecar stubs, stop expanding the
      `.pyi` implementation and switch to `python-add-type-annotations`. Treat the conversion as a fresh semantic
      pass, not a declaration-by-declaration transcription: inline types affect runtime imports, reflection,
      inheritance, and mutable state. Retain only contracts whose complete runtime domain is proven, omit uncertain
      surfaces instead of using `Any`, `object`, broad unions, casts, suppressions, variadic escapes, or invented
      protocols, and remove superseded `.pyi` files. Keep `py.typed` when the package publishes the resulting
      inline PEP 561 typing.
    - Compile a minimal stub skeleton for the riskiest inheritance and overload relationships before filling the
      package. When a contract requires an incompatible override, overlapping overloads with different returns,
      or another representation that needs suppressions, weakened types, omitted APIs, or a runtime redesign,
      exclude that module or coherent unit and search for unaffected useful modules. Reject the whole package only
      when no independently valuable, surface-complete unit remains.
      Include mutable inherited fields in this skeleton. If the runtime subclass replaces a base field with an
      invariant container whose element type is incompatible with the authoritative base stub, omitting the field
      exposes a false inherited type and redeclaring it is also unsound. Exclude that nominal hierarchy rather than
      dropping the real base class or inventing a replacement.
    - Treat permissive callback or method protocols as hypotheses, not proof. A `ParamSpec` can make checker and
      stubtest validation pass while accepting implementations that violate required call arity, argument
      adaptation, or state relationships. Exercise at least one structurally compatible but behaviorally invalid
      implementation and reject the protocol if the checker accepts it; model the real dependency contract or
      exclude the affected unit instead of using variadics to erase it.
      When runtime behavior branches on `inspect.signature`, declared parameter count, or another callable-shape
      detail, test optional-parameter and variadic callbacks explicitly. Static callable compatibility may accept
      values that runtime introspection routes incorrectly; reject the unit when no type accepts exactly the
      runtime-supported callback set.
    - Preserve the nominal identity of public external classes and modules. If the runtime exports or stores an
      actual constructible class or mutated module from an untyped dependency, a local protocol, duplicate nominal
      class, or hand-written replacement is not faithful even when it exposes the same members. Confirm whether an
      authoritative dependency stub exists; otherwise reject complete unfiltered typing when success would require
      vendoring external stubs, omitting the public value, or replacing its runtime identity.
      Do not treat a dependency's `py.typed` marker as evidence that its public nominal types are usable. Measure
      the exact installed dependency with unfiltered VerifyTypes or inspect its shipped declarations; an empty
      marker, sparse type comments, or exported `Any` can still make a derived public class impossible to type
      faithfully.
    - Record hashes of installed package source files. Stub work must not change them.
    - Run a focused import/runtime smoke check for platform-dependent exports and representative public
      objects.

4. **Generate a non-mutating preview first.**

    - Call `pylanceInvokeRefactoring` with:
        - `name="module.createPartialStub"`
        - a workspace `fileUri`
        - the target `importName`
        - the installed module's `targetFileUri`
        - `mode="string"` or `mode="edits"`
    - Inspect every returned URI before writing. A partial package must include `py.typed` containing
      `partial\n`.
    - Reject a preview whose generated modules do not overlap the modules that own the target ambiguous or
      unknown exports.
    - Treat an auto-generated source module as an ownership boundary. When its incomplete exports are literal
      data tables, do not add annotations to the generated `.py` file; create a stub for that module instead.
      Preserve its complete visible surface, including metadata such as `__version__`, and resolve each table's
      key, value, and nested item types before writing the declarations.
    - Treat native-extension targets (`.pyd`, `.so`, or equivalent) as an explicit boundary. Generation may
      produce a syntactically valid but empty stub because there is no Python parse tree. Never accept that
      output when runtime introspection exposes public names.
    - If a native extension ships a sibling stub package, use it as baseline evidence but do not assume it is
      complete. A workspace overlay replaces that module's stub surface, so preserve every baseline declaration
      and add runtime-public omissions rather than stubbing only the missing name.
    - For a selective module stub intended to reduce analysis cost, inspect `getPublicSurface` before investing
      in completion work. Prefer modules with a supported static `__all__` that authoritatively bounds the
      surface. If publicness falls back to runtime-visible imports, compare the preview immediately and reject
      candidates whose generated stub omits a large part of that surface; deleted APIs are not a performance
      improvement.
    - For a package that already ships `py.typed`, prove the generated partial stubs are consumed by the
      selected analysis environment before relying on them. Do not assume that bypassing the UI code-action
      gate makes the overlay effective.

5. **Write only the approved preview.**

    - Use `mode="update"` only after the preview has the correct root and file inventory.
    - Preserve module names, public names, parameter names, parameter kinds, defaults, decorators, overload
      structure, class bases, and generic parameters.
    - Preserve every pre-existing public annotation from the source or shipped stub unless independent API,
      implementation, or compatibility evidence proves a different contract. In particular, do not replace an
      existing `Any` with `object` or a narrower container merely for completeness or style; that can narrow the
      public API without improving VerifyTypes. Choose `object`, `Any`, or a generic for newly resolved types
      from their semantics.
    - Classify every proposed `object` annotation before writing it:
        - **Opaque input**: the runtime accepts every value and only stores, compares, formats, or passes it through.
        - **Opaque output**: the runtime can genuinely return unrelated values and callers must narrow.
        - **Correlated relationship**: input, output, callback, container, or subclass types are related; prefer a
          `TypeVar`, overload, protocol, or finite union when it preserves that relationship.
        - **External unknown**: an untyped dependency hides a nominal type; do not replace that unknown with
          `object`, a duplicate nominal class, or a structural stand-in.
        - **Under-specified**: runtime operations establish a base class, protocol, finite union, `TypedDict`, or
          recursive alias; write that contract instead.
          `object` is not a suppression-free spelling of `Any`. Keep it only when runtime evidence proves the opaque
          contract or when checker experiments prove the useful relationship cannot be expressed faithfully.
    - Before narrowing a mutable generic return, field, or override, test invariance and base-class
      substitutability in both Pyright and mypy. A runtime value being concrete does not make
      `MutableContainer[Concrete]` a subtype of `MutableContainer[object]`.
    - Validate class-object registries and generated metadata against every runtime member. Prefer an exact
      descriptor union or recursive alias over `object`, but retain a broader class-object contract when
      parameterization disagrees with runtime identity or unflagged stubtest.
    - Treat checker suppressions in source or a shipped stub as uncertainty boundaries. Do not manufacture a
      more precise stub contract solely from a declaration its maintainers explicitly suppressed; require
      independent runtime, documentation, test, or call-site evidence.
    - Treat each generated `.pyi` as a replacement for that module's visible surface. Restore public names
      omitted by generation, including public dunder aliases, before relying on the stub.
    - Do not remove private or public symbols during generation. Public-symbol pruning is a separate,
      explicitly requested operation.

6. **Resolve incomplete generated types.**

    - Work breadth-first across the generated files: clear returns, then parameters, then variables and
      fields.
    - Delegate each uncertain symbol to `python-type-inference`.
    - For native extensions, combine runtime `dir`, `inspect.signature` or `__text_signature__`, focused calls,
      package documentation, shipped stubs, and the package's source or tests when available. A C-level argument
      parser or method flag can establish parameter types and positional-only shape that a docstring omits.
      Leave a symbol unresolved when these sources do not establish a faithful contract.
    - For a compatibility wrapper implemented as `*args, **kwargs`, trace the forwarding call. When it forwards
      unchanged to a typed callable, give the stub the wrapped callable's verified parameter names, kinds, and
      defaults, plus the wrapper's actual runtime return type. Do not copy the imprecise variadic implementation
      signature into the stub, and do not rewrite the runtime wrapper. Preserve every other declaration in that
      module because the sibling `.pyi` replaces the module's complete visible surface.
    - Prefer a verified broader type over a guessed narrow type. Leave a type unresolved rather than write
      placeholder `Any`.
    - Never add `type: ignore`, `pyright: ignore`, `noqa`, or another checker suppression to a generated or
      handwritten stub. If a declaration requires suppression, correct or broaden the contract, or leave it
      unresolved.
    - Keep syntax compatible with the oldest supported Python version. Stub syntax may use constructs
      available to the configured type checker only when the project already establishes that convention.

7. **Prune only when explicitly requested.**

    - Freeze `getPublicSurface` results before deleting anything. Treat supported static `__all__` contents
      as authoritative; otherwise preserve the tool's conservative public surface.
    - Remove a declaration only when it is absent from the frozen public surface and is not required by a
      retained signature, base class, alias, or type expression. Keep private support types when public
      declarations depend on them.
    - After pruning, run `compareStub` against the frozen source copy. Require zero missing, extra, and
      divergent public symbols. Do not widen or weaken faithful annotations merely to suppress a reported
      divergence.
    - Treat pruning as surface reduction, not type-completeness improvement. Never claim a score gain solely
      because symbols were deleted.

8. **Validate the completed stub package.**

    - Re-run `getPublicSurface` and compare the source/runtime surface with the stub. No public export may be
      missing or unexpectedly added, and no baseline-known symbol may become ambiguous or unknown.
    - `compareStub` cannot semantically compare a native binary with a `.pyi`. For that boundary, freeze the
      runtime public-name inventory, compare it with the completed stub's top-level surface, and exercise each
      representative callable or class at runtime. Add a static negative-input check to prove the overlay is
      consumed rather than silently falling back to `Any`.
    - Re-run workspace diagnostics and reject new stub-caused errors.
    - For compatibility wrappers, verify a valid forwarded call, verify one invalid argument is rejected
      statically, and confirm `inspect.signature` on the installed runtime wrapper is unchanged.
    - For generated data tables, inspect every runtime key, value, and nested item rather than a representative
      sample. Confirm that all entries satisfy the declared types and that the generated source hash is unchanged.
    - Re-run `pyright --verifytypes`; require a genuine completeness improvement when improvement was the
      goal, with no known-symbol regression.
    - Do not reject an otherwise faithful contribution solely because aggregate VerifyTypes remains below 100%.
      Report both the resolved coherent unit and every unresolved package boundary. Acceptance depends on useful
      checker/API value, full surface fidelity for each touched module, and no regressions—not score perfection.
    - Use workspace analysis to prove that stubs under `stubPath` are consumed. `pyright --verifytypes`
      does not load the workspace `pyrightconfig.json` or its `stubPath`; an unchanged score alone does not
      show that the workspace ignored the stub.
    - When a VerifyTypes comparison is required, copy the exact controlled stub package into a disposable
      isolated package-search environment, run the comparison there, and remove the copy. Never stage it in
      the selected user environment or modify the installed package source.
    - Repeat the runtime import smoke check and installed-source hash comparison.
    - Confirm the only created or modified files are inside the controlled stub package.
    - When preparing an upstream contribution, inspect the repository's task configuration and run its exact
      formatter, linter, type-checker, and targeted test commands. Narrower direct commands and locally ignored
      rules are iteration aids, not substitutes for the configured tasks that CI runs. Inspect every failure;
      fix stub-attributable failures and reproduce unrelated failures on the clean baseline before reporting
      them. Distinguish a completed failing check from a fork workflow awaiting maintainer approval:
      `action_required`, skipped approval-gated jobs, and absent checks are not successful validation, but they are
      not code failures to "fix" either.
    - For a performance goal, compare interleaved fresh analyzer processes against equivalent pristine package
      copies and use median analyzer timing. Reject the performance claim when the movement is within run noise,
      even if the stub parses fewer files.

9. **Report the result.**
    - List generated files, resolved and unresolved symbols, type-completeness movement, public-surface
      differences, diagnostic movement, runtime checks, and confirmation that installed source was
      unchanged.

## Correctness Rules

-   Never modify installed package source.
-   Never invent exports or implementation-only behavior in a stub.
-   Never change runtime signature shape to make a type easier to express.
-   Never change runtime behavior to make a stub annotation true; record the boundary or leave the module unstubbed.
-   Never use `Any` merely to increase completeness.
-   Never use `object` merely to avoid `Any`, an external unknown, or an unmodeled type relationship.
-   Never rewrite an existing public annotation merely to increase completeness; preserve it unless independent
    contract evidence supports the change.
-   Never add checker suppressions to typing artifacts.
-   Never treat a generated stub as effective until analysis proves it is being consumed.
-   Keep generation, type completion, and public-symbol pruning as separate steps with separate validation.

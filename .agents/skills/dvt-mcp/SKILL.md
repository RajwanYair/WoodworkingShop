---
name: dvt-mcp
description: 'DVT MCP Server is a toolkit which enables efficient work on hardware design and verification projects written in Verilog, SystemVerilog, VHDL, or e Language. Use this skill for any task involving hardware design and verification: understanding project structure (design and verification environments), navigating and exploring the code, fixing compilation errors, generating and validating new code, or debugging and documenting the project. Prefer DVT MCP tools over file reading and grep-based searches whenever possible, as they provide fast, compiler-backed, semantically accurate information. Trigger this skill for tasks like: "find where a module/class is defined", "fix the compilation errors and warnings", "understand the testbench hierarchy", "trace this signal", "connect 2 modules/instances", "what values can this random field take", "write a new UVM test" and other hardware design and verification related tasks.'
compatibility: Requires the DVT MCP Server to be configured and running for the target project.
license: https://eda.amiq.com/end-user-license-agreement
metadata:
  author: AMIQ EDA s.r.l.
  version: '1.4'
---

# Using the DVT MCP Server Efficiently

The DVT MCP Server gives you compiler-backed knowledge of design and verification projects. It understands the language semantics and project structure the same way a compiler does — which means its answers are accurate where grep or file reading would be ambiguous or incomplete.

**Core principle:** reach for DVT MCP tools first. Avoid reading entire files, running complex simulations or grepping for identifiers unless a DVT tool cannot answer the question.

---

## Tool Selection Guide

| Goal | Tool(s) to use |
|---|---|
| Find where a type/symbol (module, interface, class...)  is defined | `dvt_get_symbol_locations` → `dvt_get_symbol_definitions` |
| Read the full source of a type/symbol | `dvt_get_symbol_definitions` |
| Find all usages of a type/symbol | `dvt_get_symbol_references` |
| Find all usages of a local variable or signal | `dvt_get_identifier_references` |
| Understand what a type/symbol depends on | `dvt_get_symbol_dependencies` |
| Get comprehensive info on any identifier (declaration, references, types, inheritance) | `dvt_get_identifier_info` |
| List all identifiers in a file | `dvt_get_file_identifiers` |
| List all compiled files | `dvt_get_compiled_files` |
| Get compilation errors/warnings for files | `dvt_get_problems` |
| Get Verissimo linting failures for files | `dvt_get_linting_failures` |
| Rebuild the whole project and get fresh errors | `dvt_build_project` |
| Recompile specific files after editing them | `dvt_compile_changed_files` |
| Get current file/context & hierarchical scope from cursor position | `dvt_get_cursor_scope` |
| Explore the RTL design hierarchy | `dvt_get_design_top` → `dvt_search_design_hierarchy` |
| Explore the UVM verification hierarchy | `dvt_get_verification_top` → `dvt_search_verification_hierarchy` |
| Find instances with a specific port or parameter | `dvt_search_design_hierarchy` with `port_name_filter` |
| Find constraints on a random field | `dvt_get_field_constraints` |
| Get messages extracted from a simulation log file | `dvt_get_simulation_log_messages` |
| Load a waveform dump file | `dvt_waveform_load_file` |
| Retrieve signals paths from a waveform dump file | `dvt_waveform_search_signals_paths` |
| Retrieve values of signals from a waveform dump file | `dvt_waveform_get_signal_value_changes` |
| Start a Runtime Elaboration session | `dvt_start_runtime_elaboration` |
| Stop a Runtime Elaboration session | `dvt_stop_runtime_elaboration` |
| Wait for debugger to hit breakpoint or finish | `dvt_debugger_wait` |
| Step through code (step_over, step_into, etc.) | `dvt_debugger_step` |
| Evaluate expressions in debugger context | `dvt_debugger_evaluate_expression` |
| Set or remove breakpoints | `dvt_debugger_toggle_breakpoint` |
| List active breakpoints | `dvt_debugger_get_active_breakpoints` |

---

## Workflow: Navigate and Understand Code

When asked to explain, audit, or trace code:

1. **Locate symbol(s) of interest** — use `dvt_get_symbol_locations` with a name or wildcard pattern (e.g., `ahb*`, `*_agent`, `*pkg_*`).
2. **Read definition** — use `dvt_get_symbol_definitions` to get the full source without opening files.
3. **Trace dependencies** — use `dvt_get_symbol_dependencies` to recursively understand what the symbol depends on (e.g. module subinstances, parent classes...). Follow up on interesting dependencies the same way.
4. **Find where it's used throughout the project** — use `dvt_get_symbol_references`.
5. **Drill into local identifiers** — if you need to trace a specific signal, port, or variable inside a file, use `dvt_get_identifier_references` with the surrounding code context and the `<IDENTIFIER>...</IDENTIFIER>` markers wrapping the identifier of interest.

Avoid reading entire files when you only need specific symbols.

---

## Workflow: Fix Compilation Errors

Use this iterative loop until the project is clean:

1. **Get current compilation errors** — call `dvt_build_project` for a full rebuild, or `dvt_get_problems` for specific files if the scope is narrow. Start with `include_warnings: false` to focus on errors first.
2. **Understand each error** — use `dvt_get_symbol_definitions` or `dvt_get_symbol_locations` to understand the types, ports, and interfaces involved. Don't guess — look up the actual definitions.
3. **Fix the files** — edit only what is needed to address the root cause. Avoid cascading, speculative changes.
4. **Recompile the changed files** — call `dvt_compile_changed_files` with the list of files you edited. This is faster than a full rebuild and gives immediate feedback.
5. **Repeat** until `dvt_compile_changed_files` (or `dvt_build_project`) returns no errors.

Once errors are resolved, optionally re-run with `include_warnings: true` to address warnings.

> If a fix introduces a new error, treat it as a new iteration rather than undoing changes speculatively. Compile first, then decide.

---

## Workflow: Fix Linting Failures (Verissimo)

Use this iterative loop until the project is clean:

0. **Assert Verissimo setup** - make sure the current build configuration file (`<project>/.dvt/<name>.build`) contains Verissimo directives (`+dvt_verissimo_lint_on`, `+dvt_verissimo_ruleset`, and `+dvt_verissimo_use_baseline_report`(optional)). If these are not present, stop and inform that the Verissimo linter is not configured.
1. **Get current linting failures** — call `dvt_get_linting_failures` for files under investigation.
2. **Understand each failure** — use `dvt_get_symbol_definitions` or `dvt_get_symbol_locations` to understand the types, ports, and interfaces involved. Don't guess — look up the actual definitions.
3. **Fix the files** — edit only what is needed to address the root cause. Avoid cascading, speculative changes.
4. **Recompile the changed files** — call `dvt_compile_changed_files` with the list of files you edited. This is faster than a full rebuild and gives immediate feedback.
5. **Repeat** until `dvt_get_linting_failures` returns no linting failures.

> If a fix introduces a new failure, treat it as a new iteration rather than undoing changes speculatively. Compile first, then decide.

---

## Workflow: Generate and Validate New Code

When writing new code:

1. **Study the context first** — before writing anything, use `dvt_get_symbol_definitions` and `dvt_get_symbol_dependencies` to understand the interfaces, base classes, and conventions already used in the project. Match the existing style.
2. **Write the new code** — create or edit the file(s).
3. **Compile immediately** — call `dvt_compile_changed_files` on the new file(s). Do not wait until all code is written; compile early and often to catch errors while the context is fresh.
4. **Fix errors iteratively** — follow the **Fix Compilation Errors** workflow above.
5. **Verify integration** — use `dvt_get_symbol_references` on any symbols the new code is expected to be used by, to confirm the integration points are correct.

> `dvt_compile_changed_files` and `dvt_get_problems` gives you compiler-backed errors, warnings, and linting failures instantly — no simulation needed. This is far faster than a sim-based feedback loop.

---

## Workflow: Explore RTL Design Hierarchy

When asked to understand the RTL structure of a project or pinpoint particular module instances:

1. **Get the current design top** — call `dvt_get_design_top`. If no top is set or the wrong one is set, use `dvt_set_design_top` to set the correct top-level module.
2. **Traverse the hierarchy** — call `dvt_search_design_hierarchy` starting from the top (use the full hierarchical path as `start_instance_path`). Start with a shallow `search_max_depth` (2–3) to get an overview, then go deeper on interesting subtrees.
3. **Inspect interesting instances** — use `dvt_get_symbol_definitions` on module or interface names to read their source.
4. **Search for specific instances or ports** — use `instance_name_filter` or `port_name_filter` in `dvt_search_design_hierarchy` to locate specific blocks without traversing the full hierarchy.

---

## Workflow: Connect Instances and Propagate Signals

When asked to wire up modules, connect instances, or propagate signals through the design:

1. **Locate the relevant instances** — follow the "Explore RTL Design Hierarchy" workflow to find the modules and their positions in the hierarchy.
2. **Read port definitions** — use `dvt_get_symbol_definitions` on each module involved to get the exact port names, directions, and types.
3. **Edit the files** — make the necessary port declarations, signal declarations, and connections. Touch only the files that need to change.
4. **Compile and verify** — call `dvt_compile_changed_files` (using `include_warnings: true` to return width mismatch violations) after each edit. Follow the **Fix Compilation Errors** workflow if errors or warnings arise.

---

## Workflow: Explore UVM Hierarchy and Trace TLM Connections

When asked to understand the UVM testbench structure, pinpoint particular verification components, or trace TLM connections through the hierarchy:

1. **Get the current verification top** — call `dvt_get_verification_top`. Use `dvt_set_verification_top` if the top needs to be set.
2. **Traverse the UVM hierarchy** — call `dvt_search_verification_hierarchy` from the top component. Use a moderate `search_max_depth` (3–4) for an initial overview.
3. **Inspect UVM components** — use `dvt_get_symbol_definitions` or `dvt_get_symbol_locations` to read agent, sequencer, driver, monitor, scoreboard, and other component implementations.
4. **OPTIONAL - Search for specific components or TLM ports** — use `component_name_filter` or `port_name_filter` in `dvt_search_verification_hierarchy` to locate specific components without traversing the full hierarchy.

---

## Workflow: Write a New UVM Test

When asked to write a new UVM test:

1. **Study existing tests** — use `dvt_get_symbol_locations` with a wildcard (e.g., `*_test*`) to find existing tests in the project. Use `dvt_get_symbol_definitions` on a representative test and on the base test class to understand the expected structure, configuration pattern, and coding conventions.
2. **Understand the environment** — use `dvt_get_symbol_definitions` on the UVM env class to understand what agents, scoreboards, and config objects are available. Use `dvt_get_symbol_dependencies` to trace the full dependency tree if needed. Alternatively, follow the **Explore UVM Hierarchy and Trace TLM Connections** workflow to understand a test's environment.
3. **Find available sequences** — use `dvt_get_symbol_locations` with a wildcard (e.g., `*_seq`, `*_sequence`) to discover sequences that can be started from the test. Use `dvt_get_symbol_definitions` on the relevant ones to understand their API and knobs.
4. **Write the new test** — create the test file, extending the base test class. Follow the conventions observed in step 1.
5. **Compile and fix** — call `dvt_compile_changed_files` immediately. Follow the **Fix Compilation Errors** workflow for any issues.

> No simulation run is needed to validate the test compiles correctly — `dvt_compile_changed_files` catches type errors, missing imports, and interface mismatches instantly.

---

## Workflow: Trace RTL Signals

When asked to trace a signal, port, or wire through the RTL design:

1. **Get identifier overview** — call `dvt_get_identifier_info` with the hierarchical name of the signal to obtain its declaration, type, width, and all references in a single call.
   - Use `identifier_name` with the module-prefixed path, e.g., `"i_top.i_alu.clk"` or `"i_top.i_alu::clk"`
   - Use `detail_level: "standard"` (default) to include references, or `"full"` to also get the parent type outline
   - Optionally provide `file_path` as a hint if the signal exists in multiple modules
2. **Trace through parent modules** — once you have the signal's declaration and references, read the reference locations, and use the same pattern to trace it upward or downward in the hierarchy by calling `dvt_get_identifier_info` on the connected port at the parent or child level.
3. **Resolve ambiguity** — if a signal name is not unique (e.g., `clk` appears in many modules), narrow the search by:
   - Using a more specific hierarchical path: `"i_top.i_alu.i_adder.clk"`
   - Providing the `file_path` parameter to limit the search to a specific file
4. **Correlate with design hierarchy** — use `dvt_search_design_hierarchy` with `port_name_filter` to find all instances that expose a port with a given name, then use `dvt_get_identifier_info` on the instances of interest.
5. 
> `dvt_get_identifier_info` returns type-aware results backed by the compiler — prefer it over text-search to avoid false positives from comments or string literals.

---

## Workflow: Runtime Elaboration Debugging

Use this flow to debug UVM verification code at runtime using the debugger:

1. **Set breakpoints** — call `dvt_debugger_toggle_breakpoint` with `type: "breakpoint"`, the absolute `file` path, and `line` number. Use `dvt_get_symbol_definitions` to find the correct line numbers. Add a `condition` if you want the breakpoint to only trigger when a specific expression is true.
2. **Verify breakpoints** — call `dvt_debugger_get_active_breakpoints` to confirm breakpoints are set correctly.
3. **Start Runtime Elaboration** — call `dvt_start_runtime_elaboration` with `isDebug: true` and the target `uvmTestName`. Use `argumentsFile` if a .args/.f file exists.
4. **Wait for breakpoint** — call `dvt_debugger_wait` to pause until a breakpoint is hit or elaboration finishes. If suspended, the response includes the call stack.
5. **Inspect state** — while suspended, use `dvt_debugger_evaluate_expression` to check variable values, signal states, or any SystemVerilog expression in the current scope.
6. **Step through code** — use `dvt_debugger_step` to control execution:
   - `step_over`: execute current line, stop at next line in same scope
   - `step_into`: enter the function/task called on the current line
   - `step_return`: run until the current function/task returns
   - `continue`: run until the next breakpoint or finish
7. **Repeat steps 5-6** — evaluate expressions and step through code repeatedly to trace execution flow and identify the root cause.
8. **Stop when done** — call `dvt_stop_runtime_elaboration` to end the session.

> The key debugging loop is: set breakpoints → start elaboration → wait → evaluate + step → repeat. This allows you to trace through UVM code execution and inspect state at each breakpoint.

---

## Pagination

Many DVT tools return paginated results — when more pages are available, keep calling the same tool with an incremented `page` number until all results are collected.

---

## When to Fall Back to File Reading and Grepping

Use standard file reading or grepping tools only for files not compiled by DVT (scripts, Makefiles, config files), to get exact byte content needed for a precise edit, or when a DVT tool returns no results.

---
name: dvt-root-cause-analysis
description: 'DVT Root Cause Analysis is a toolkit which enables efficient debug on hardware design and verification projects written in Verilog, SystemVerilog or VHDL. Use this skill for any task involving debugging the output of a simulation on the project. Prefer DVT Root Cause Analysis tools over file reading and grep-based searches whenever possible, as they provide fast, compiler-backed, semantically accurate information. Trigger this skill for tasks like: "fix failing test", "investigate why the simulation fails", "root cause the test failure", "debug a failed test" and other similar simulation debug related tasks.'
compatibility: Requires the DVT MCP Server to be configured and running for the target project.
license: https://eda.amiq.com/end-user-license-agreement
metadata:
  author: AMIQ EDA s.r.l.
  version: '1.0'
---

# Using the DVT Root Cause Analysis Efficiently

The DVT Root Cause Analysis provides compiler-backed knowledge of design and verification projects backed by DVT MCP Server. It understands the language semantics and project structure the same way a compiler does — which means its answers are accurate where grep or file reading would be ambiguous or incomplete.

**Core principles:**

- Reach for DVT Root Cause Analysis tools first.
- Avoid reading entire files, running complex simulations or grepping for identifiers unless a DVT tool can not answer the question.
- Hard-gate on waveform and log files - if you cannot confirm that either the waveform or the log file exist and the dedicated tools can be used, STOP IMMEDIATELY and ask for guidance
- Use the **dvt_get_simulation_log_messages**, **dvt_waveform_load_file**, **dvt_waveform_search_signals_paths** and **dvt_waveform_get_signal_value_changes** tools
- Provide section references from the log and wave for ANY reasoning about the root cause
- Always prefer DVT tools for code/log/waveform exploration - DO NOT fall back to bash/grep/sed for the same purpose
- Always follow PRIMARY TASK recipe workflows and print out each step
- Typically use the **dvt_waveform_search_signals_paths** tool to firstly identify correct signal paths, then use the **dvt_waveform_get_signal_value_changes** tool to investigate the runtime behavior of those signals

---

## Tool Selection Guide

| Goal                                                                                   | Tool(s) to use                                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Find where a type/symbol (module, interface, class...) is defined                      | `dvt_get_symbol_locations` → `dvt_get_symbol_definitions`        |
| Read the full source of a type/symbol                                                  | `dvt_get_symbol_definitions`                                     |
| Find all usages of a type/symbol                                                       | `dvt_get_symbol_references`                                      |
| Find all usages of a local variable or signal                                          | `dvt_get_identifier_references`                                  |
| Understand what a type/symbol depends on                                               | `dvt_get_symbol_dependencies`                                    |
| Get comprehensive info on any identifier (declaration, references, types, inheritance) | `dvt_get_identifier_info`                                        |
| List all identifiers in a file                                                         | `dvt_get_file_identifiers`                                       |
| List all compiled files                                                                | `dvt_get_compiled_files`                                         |
| Get compilation errors/warnings or Verissimo linting failures for files                | `dvt_get_problems`                                               |
| Rebuild the whole project and get fresh errors                                         | `dvt_build_project`                                              |
| Recompile specific files after editing them                                            | `dvt_compile_changed_files`                                      |
| Explore the RTL design hierarchy                                                       | `dvt_get_design_top` → `dvt_search_design_hierarchy`             |
| Explore the UVM verification hierarchy                                                 | `dvt_get_verification_top` → `dvt_search_verification_hierarchy` |
| Find instances with a specific port or parameter                                       | `dvt_search_design_hierarchy` with `port_name_filter`            |
| Find constraints on a random field                                                     | `dvt_get_field_constraints`                                      |
| Get messages extracted from a simulation log file                                      | `dvt_get_simulation_log_messages`                                |
| Load a waveform dump file                                                              | `dvt_waveform_load_file`                                         |
| Retrieve signals paths from a waveform dump file                                       | `dvt_waveform_search_signals_paths`                              |
| Retrieve values of signals from a waveform dump file                                   | `dvt_waveform_get_signal_value_changes`                          |

---

## Workflow: Root Cause Analysis of a test failure

0. **Essential prerequisites**
   - You MUST positively identify the test — tests are usually placed directly under the project, in a directory with the same name as the test name
   - DO NOT proceed if you do not have confirmed access to BOTH the log file (usually named xrun.log / vcs.log / questa.log) and waveform (.dst / .vcd / .wcfg / .trn / .fsdb / any other format). Ask user for guidance.
   - If the question is ambiguous STOP and ask for clarification before answering

   Mandatory workflow checkpoint: After identifying the test and the log/waveform files, print a checkpoint confirming you have:
   (a) found an error message using the **dvt_get_simulation_log_messages** tool
   (b) successfully loaded the waveform via **dvt_waveform_load_file**

   IF EITHER CONDITION IS NOT MET:
   - Print the checkpoint showing what is missing
   - Ask the user for guidance
   - STOP and WAIT for user response before taking any action
   - DO NOT proceed with the investigation
   - DO NOT make any further tool calls
   - DO NOT attempt alternative analysis

   ONLY IF these mandatory checks pass, you can proceed with the analysis. OTHERWISE, WAIT FOR USER GUIDANCE.

1. Use **dvt_get_simulation_log_messages** to get the full error message and surrounding log messages
   Make efficient tool calls in order to get the relevant messages as quick as possible. Use the following approaches sequentially:
   - **Immediate context** (sort by timestamp in descending(-) order): {'log_file_path': <file_path>, 'timestamp': {'max': <error_timestamp>}, 'sort_by': '-timestamp'}
   - **Forward context** (stack traces, diagnostics after the error): {'log_file_path': <file_path>, 'log_line': {'min': <error_log_line>}, 'sort_by': 'log_line'}
   - **Component history** (trace the failing component's messages throughout the log): {'log_file_path': <file_path>, 'report_object_name': <error_report_object_name>, 'timestamp': {'max': <error_timestamp>}, 'sort_by': '-timestamp'}

2. Explore the code relevant for the error message and surrounding messages - try using dedicated code exploration tools like **dvt_get_identifier_info** before reading portions of files

> e.g.:
> UVM_FATAL path/to/file.sv(86) @ 120550000: uvm_test_top.ve.apb_ss_env.apb_uart0.monitor.tx_scbd FAIL : APB RECEIVED WRONG DATA from uart0
> use `dvt_get_identifier_info` with `identifier_name` = `tx_scbd`

1. Use a subagent to get a high-level understanding of the project with an emphasis on the relevant code _USING DVT MCP TOOLS_
   - Investigate design and verification hierarchies, function call hierarchies
   - Investigate the waveform - search for relevant signals using **dvt_waveform_search_signals_paths**, trace driver/loads for signals, figure out the timestamp where the value changes using **dvt_waveform_get_signal_value_changes**

2. Classify the problem: e.g. assertion failure, scoreboard data mismatch, register model data mismatch, test environment misconfiguration. If uncertain, propose up to 3 potential classifications.

3. Propose up to 5 DISTINCT potential root causes.

4. Use subagents to explore each potential root cause. Each subagent must return a report in the format specified below.

5. Based on the subagent reports, double-check and present to the user the most likely root cause and up to 2 alternatives.

> After the analysis above, if you cannot confidently identify a root cause due to insufficient log detail, or simply if you need to validate a root cause, ask the user which approach to use from the following:
>
> - **Increase UVM verbosity**: ask the user to re-run the simulation with a higher verbosity level (e.g. UVM_LOW → UVM_DEBUG)
> - **Add debug messages**: offer to add targeted debug messages in relevant code sections based on your analysis, then ask the user to re-run the simulation
> - **Both**: firstly add some targeted debug messages, then ask the user to re-run the simulation with a higher verbosity level
>   Once the user decides, proceed accordingly and wait until the user re-runs the simulation. Restart the analysis with the new log.

**"Root cause analysis report" format (markdown):**

```
Failure <source code link> <log link> <waveform link>:
    <failure brief - 10 - 20 words summary>

Chain of events:
    <timestamp> <log message>
    <timestamp> <supporting waveform evidence>

<Step by step detailed root cause analysis based on the previously stated chain of events>
```

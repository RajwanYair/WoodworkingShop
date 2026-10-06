---
name: verdi-assertion-log-debug
description: Investigate RTL coding bugs from assertion failures. Extracts failure info from logs, identifies failing signals, traces RTL fanin, reads design files to find coding bugs, and confirms with waveform evidence. Use when debugging assertion failures, finding RTL bugs, or when user provides a simulation log with assertion errors.
---
# RTL Bug Investigation

Workflow to find RTL coding bugs that caused assertion failures. Show only the Step 4 conclusion to the user as the final response; perform Steps 1-3 internally without displaying their intermediate outputs.

Collateral:
- Assertion failure log file (wmtrun.log or wmtrun.log.gz)
- Verilog FSDB/ZWD waveform: verilog.fsdb, verilog.fsdb.gz, or a readback.ztdb.zwd directory.  If these files are not found, then step back and look for a *.fsdb* file or *.zwd directory in the same directory as the log file

**IMPORTANT: Execute Step 1, Step 2, Step 3, Step 4 sequentially. Do NOT call steps in parallel.**

## Step 1: Log Agent - Extract Failure Info

Input: user-provided log path.

### Step 1.1: Extract Failure Fields

Extract from the **first** assertion failure in the log file:
- Failure timestamp
- Assertion name
- Error message

If no assertion failure is found in the log, stop the workflow, inform the user that no assertion failures were detected, and ask them to verify the log path.

### Step 1.2: Extract Context Lines

Extract the **10 lines before and 10 lines after** the first assertion failure line.

**Output**: Failure Summary with parsed fields + log line numbers + 10 preceding context lines. This output is used by both Step 2 AND Step 3.

**Wait for Step 1 to complete before starting Step 2.**

## Step 2: Assertion Agent - Get Failing Signal

1. Evaluate the assertion from Step 1
2. Analyze assertion using assertion name and failure timestamp from Step 1
3. The assertion correctly detected a design violation - identify the offending signal(s) with full hierarchical names

**Output**: Offending signals list for Step 3.

Step 2 is considered failed if the Assertion Agent tool returns an error OR if it completes but cannot name any offending signal with a full hierarchical path. In either failed case, proceed to Step 3 using only Step 1 output (Path B).

**Wait for Step 2 to complete (or fail) before starting Step 3.**

## Step 3: Design Agent - RTL Read

**THIS STEP IS REQUIRED. DO NOT SKIP.**

Pass the following prompt to the Design Agent:

---

**Design Agent Prompt:**

You are tasked with finding the ROOT CAUSE coding bug that caused an assertion failure.

**Input:**
- Failure timestamp: {from Step 1}
- Assertion name: {from Step 1}
- Error message: {from Step 1}
- Context lines: {10 lines before and 10 lines after the failure, from Step 1.2}
- Offending signals: {from Step 2, if available}

**Critical Rules:**
- Use STATIC ANALYSIS ONLY. Use fanin trace tools and file read tools to analyze the design.
- DO NOT write Python scripts or any code to process trace results or parse files.
- The SVA assertion is CORRECT. Either the RTL code or the test bench has a coding bug - find it. Do NOT suggest the assertion is wrong.
- Find the ROOT CAUSE coding bug, not just any change that makes the assertion pass.
- Do NOT suggest fixes that remove functionality, change design intent, or make two signals identical when they should differ.
- Do not `git add` or `git commit` any files
- Do not try to fix the failure by commenting out the assertion

**Procedure:**

Step 3.1: Get all design file paths from the loaded design first.

Step 3.2: Trace and read files based on available input:

Path A (if offending signals available):
1. Run fanin trace (5 levels) from offending signal(s)
2. Compare trace results with design file paths
3. Use `Read` tool to get entire file content (if cannot read entire file at once, read multiple times)
4. Analyze code for bugs

Path B (if offending signals NOT available):
1. Use design file paths from Step 3.1
2. Use `Grep` to search for signals mentioned in error message
3. Use `Read` tool to get complete file content for matched files
4. Analyze code for bugs

### Step 3.3: Iterative Deepening

Automatically proceed to next iteration without asking user for confirmation.

A bug is considered "found" only when you can name a specific file and line number whose code, as written, produces the value/behavior that violates the assertion expression. If you cannot point to such a line, iterate again.

Run at most **3 additional iterations**. If no bug is identified after 3 iterations, consider if the assertion is correct.  Once you have done this, stop iterating and report the most likely candidate with the available evidence in Step 4.

For each iteration, follow the checklist for the path you are on:

Path A Iteration checklist (per iteration):
1. Look at the list of signals already traced (starts with original offending signals from Step 2).
2. From the most recent fanin results, pick up to 3 NEW suspect signals from deeper in the fanin cone. Do NOT re-trace signals already traced.
3. Run fanin trace (5 levels) on those NEW signals only.
4. Read NEW files not previously read, prioritizing submodule files over top-level.
5. Analyze the new code for a specific buggy line. If found, stop iterating.

Path B Iteration checklist (per iteration):
1. Look at the list of files already read.
2. Identify NEW signal names or keywords from the error message or prior reads.
3. Use `Grep` to search for them in files NOT yet read.
4. Use `Read` tool for NEW matched files only, prioritizing submodule files over top-level.
5. Analyze the new code for a specific buggy line. If found, stop iterating.

**For each suspected bug, provide:**
- The exact code line that contains the bug
- What the code is supposed to do vs what it actually does
- How this bug causes the assertion failure

**Output:**
Suspected RTL coding bug locations with file:line and code snippets (from actual files only).
Show the offending signal to buggy signal path.

---

**Wait for Step 3 to complete before starting Step 4.**

## Step 4: Report Coding Bug

**If multiple bugs found, report ALL of them without asking user for confirmation.**

For each confirmed coding bug, report:
- Exact file:line of the bug
- The buggy code snippet (from actual file, not generated)
- What the coding mistake is
- Suggested code fix (show the corrected line)
- Please show why assertion expression fail and also the signal driver paths to buggy code.

Note: The assertion is probably correct and working as intended - it successfully caught the coding bug.

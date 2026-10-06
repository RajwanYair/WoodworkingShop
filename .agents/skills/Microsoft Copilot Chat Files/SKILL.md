---
name: verdi-agent-debug
description: >
  Debug Synopsys VCS failures with report/log classification, waveform evidence, and compiled
  design tracing. Use the snps_ka, npi_verdi, and verdi_agent MCP servers. The workflow is
  project-agnostic and handles compressed regression artifacts without modifying originals.
---

# VCS Failure Debug

Use this skill to debug a VCS simulation or review a passing VCS test. Classify the failure by the
latest stage reached, prove the required artifacts exist before using waveform/design tools, and
never turn a tool symptom into a root cause without evidence.

## Operating principles

- VCS only. Stop on non-VCS artifacts.
- Logs establish stage and failure evidence; waveforms establish runtime values; compiled design
  data establishes static connectivity and source locations.
- A missing, guessed, mismatched, or still-compressed input is an input-gate failure, not evidence
  that the selected MCP tool is broken.
- Preserve exact paths and raw responses internally. Never expose credentials, tokens, forwarding
  headers, or API keys.
- Keep context-sensitive calls serial. Never overlap `Log` calls that write files or NPI calls that
  mutate active design/waveform state.
- Stop when confidence reaches 90% or all evidence-backed candidates are exhausted.

## Budgets

| Resource | Limit |
|---|---:|
| Waveform calls per iteration | 4 |
| New trace signals per iteration | 2 |
| Log context around a match | 10 lines per side |
| Full-log reads | Only after targeted extraction fails |

## MCP routing

Resolve tools by their generic suffix, not by a hardcoded MCP prefix. The client may register the
same server under names such as `mcp_npi_verdi_*`, `mcp_verdi_mcp_ser_*`, or
`mcp_synopsys_ai_c_*`.

| Server | Role | Required input |
|---|---|---|
| `snps_ka` / `snps_copilot` | VCS and Verdi terminology/options | A real vendor code or generic simulator question. Obtain `product` from `get_product_list()`. |
| `npi_verdi` | FSDB and waveform queries | A real waveform source; design import and trace additionally require a matching uncompressed daidir. |
| `verdi_agent` | Log, waveform, design, protocol, assertion, coverage, and bounded file operations | The exact artifact path and a focused prompt. |

For `snps_ka`, normalize a build tag before querying release-sensitive tools. For example,
`Y-2026.03-BETA-20260807` belongs to release family `Y-2026.03`. Call `get_release_list(product)`
and pass only the exact base or service-pack release returned there. Never pass a `BETA` or
`T<number>` build suffix and never pass a wildcard. Use `copilot_license_check` only with that
same validated product/release pair.

### NPI tools

- `get_active_waveform()` is the path-independent liveness probe.
- `set_active_waveform(waveform_name)` sets the active waveform without loading a design.
- `get_waveform_information(waveform_name?)` returns waveform metadata and time bounds.
- `is_signal_exist`, `search_signal`, `get_signal_information`, `get_signal_value_at_time`, and
  `get_signal_value_range` require a real waveform and their exact signal/pattern/time arguments.
  Run `is_signal_exist` once with all exact candidate paths before value queries.
- `get_signals_in_rc_file(signal_rc_file, output_file?)` requires a readable Verdi RC file.
- `import_design(dbdir, waveform_name?)` requires both a fully uncompressed `*.simv.daidir` and
  its real matching FSDB. Pass the FSDB in the call or activate it immediately after import.
- `trace_driver(signal_name)`, `trace_active_drivers(signal_name, time)`, and `trace_x(signal_name,
  time)` accept no artifact paths. They require session state established by `import_design` with
  the same uncompressed daidir and matching active FSDB, followed by the exact signal and time.

NPI waveform support confirmed without staging: `.fsdb.gz` and `.vf.gz`. Gzip-compressed `.zwd`
support is unconfirmed. Do not generalize FSDB/VF behavior to other formats.

### `verdi_agent` sub-agents

| Agent | Required input and purpose |
|---|---|
| `Log` | Explicit readable report, log, file, or bounded directory; extract named fields, patterns, and context. |
| `Waveform` | Exact real waveform path, preferably an uncompressed FSDB, plus signals and time/window. It does not discover FSDBs by scanning directories. |
| `Design` | Exact fully uncompressed `*.simv.daidir`, plus a signal/module/path and a static or active trace objective. |
| `Protocol` | Exact readable uncompressed FSDB, interface/scope, and one supported protocol or a custom protocol YAML spec. Its waveform session is independent of NPI and Waveform. |
| `Assertion` | A loaded design for aggregate statistics; a concrete assertion/scope for queries; verbatim assertion text for add/evaluate/save. |
| `Coverage` | Exact fully uncompressed `*.vdb`. A valid database must return tests, scopes, metrics, scores, or non-empty items, not merely open successfully. |
| `AppExecute` | An explicit permitted path and bounded read/analyze operation; last resort, never artifact invention or repair. |

## Artifact and compression gate

This is the only decompression point in the workflow. Do not modify regression artifacts.

1. Start from the user-provided absolute test-result directory.
2. Use `Log` to locate reports, the primary VCS run log, FSDB/waveform sources, daidirs, and VDBs.
   Search recursively at least two levels and include `.gz` variants. Require exact paths back.
3. Treat a directory as compressed when required logs are gzipped, daidir internals contain `.gz`,
   a VDB is compressed, or an unconfirmed compressed waveform format is needed.
4. Copy the complete tree to `/tmp/$USER/<test_name>_wrk/` and recursively gunzip the copy:

   ```tcsh
   setenv T <test_name> ; setenv O <original_test_dir>
   mkdir -p /tmp/$USER/${T}_wrk ; cp -r $O/. /tmp/$USER/${T}_wrk/
   find /tmp/$USER/${T}_wrk -name '*.gz' -exec gunzip -f -- {} +
   ```

5. Use only the staged path and record `staging_reason=auto_decompressed` or
   `user_decompressed_to_tmp`. Leave the original untouched. If a daidir resolved later is outside
   the staged tree and remains compressed, return to this gate before loading it.
6. `skip` is acceptable only for confirmed direct-readable NPI waveform formats. It leaves Design,
   Coverage, and any tool requiring an uncompressed FSDB unavailable or lower-confidence.

Required path report:

```text
original_test_dir : <absolute path>
working_dir       : <absolute path>
simulator_type    : VCS | VCS_reduced | Non-VCS
staging_reason    : none | user_decompressed_to_tmp | auto_decompressed | compressed_dir_accepted_as_is
report            : <path or not found>
sim_log           : <path or not found>
daidir            : <path or not found>
fsdb              : <path or not found>
vdb               : <path or not found>
```

## StopIteration recheck

`coroutine raised StopIteration` can be the server's poor validation of missing context. Before
classifying it as a backend or session failure, record:

1. The exact absolute paths passed to the tool.
2. For `import_design` and all three trace APIs, both the exact daidir and matching FSDB, including
   how the FSDB became active.
3. Recursive proof that no required daidir internals remain gzipped. Directory existence alone is
   insufficient.
4. Proof that the FSDB is waveform data, not an `fsdb`-named log, and matches the same test/build.
5. For Design, Protocol, Coverage, or Waveform, proof that the selected tool's compression gate
   has passed; stage a copy when direct compressed support is not confirmed.
6. A single retry with the verified inputs, preserving the raw result.

Mark evidence `inputs_verified=NO` and classify `INPUT_GATE_FAILURE` when any check is missing,
compressed, guessed, mismatched, or unverified. Only after `inputs_verified=YES` may the raw error
support a tool/session conclusion. For NPI, call `get_active_waveform()` before further probing;
if it fails, the session is corrupted and the MCP server must be restarted.

## Workflow

### 1. Health check

Probe `npi_verdi` with `get_active_waveform()`. Probe `snps_ka` with a minimal valid call only
when needed. Use one bounded `Log` discovery call as the `verdi_agent` probe. Recover once when
the environment provides a supported restart operation; otherwise record the server as down.

```text
MCP STATUS: snps_ka=<UP|UP_RECOVERED|DOWN> npi_verdi=<UP|UP_RECOVERED|DOWN> verdi_agent=<UP|DOWN>
```

If both NPI and `verdi_agent` are down, stop. If only NPI is down, use Waveform and Design
fallbacks. A license/permission denial is a capability gap, not test evidence.

### 2. Classify the report

Parse every `TEST NAME` block with `TEST STATUS: FAIL`, retaining every `TEST RESULT` line in
source order. Use the block's own `TEST RES PATH`, not the report directory. For large manifests,
run a deterministic local parser first and use its grouping and representative output before
asking an MCP agent to inspect failures.

Classify by latest stage reached:

| Stage | Category | First route |
|---|---|---|
| Nothing ran | `INFRA` | Orchestration log, permissions, license, host, quota |
| Generation | `GEN` | Generator/config/filelist log |
| Compile/elaboration | `ELAB` | Compiler/elaboration log and `snps_ka` for genuine vendor codes |
| Runtime crash | `SIM_RUNTIME` | Stack, first user frame, object construction |
| Testbench compare | `TB_CHECK` | Checker, sequence, reference model, register model |
| Assertion | `ASSERTION` | Assertion evidence, waveform, RTL trace |
| Protocol | `PROTOCOL` | Protocol agent on one interface and protocol |
| No completion | `TIMEOUT` | Last activity, stalled phase, missing stimulus |
| Post-processing | `POSTPROC` | Post-run/coverage/collection log; do not trace RTL first |
| Transient artifacts gone | `EPHEMERAL` | Infra evidence; skip waveform/design |
| Unknown | `UNKNOWN` | One focused Log read; do not guess |

If the test passed and the user asks to inspect it, use `mode=review`, not a fabricated failure.

### 3. Extract logs

Ask `Log` for the relevant orchestration, generation, elaboration, simulation, and post-run logs.
Capture `fail_time`, error text, source location, offending signals, command/exit status, and
stage. Read a generator's own log before simulator logs for `GEN`/`ELAB`; read TB/reference-model
source before DUT RTL for `TB_CHECK`. Keep Log calls narrow and serialize write-capable calls.

Call `snps_ka.ka` only for genuine VCS/Verdi vocabulary. Normalize the release as described above.
Do not ask it to explain project macros, CI tokens, checker names, or internal task names; its
confident answer is not evidence and may be fabricated.

### 4. Waveform evidence

Skip when no FSDB exists or the simulation never reached waveform generation. Otherwise obtain
metadata/time bounds, activate the preferred waveform once, batch-check exact signal existence,
then query values at the failure time and a small surrounding window. Use explicit time units,
because bare NPI times default to femtoseconds. Use Waveform when NPI is unavailable or cannot
resolve the path. Do not brute-force hierarchy guesses.

### 5. Design evidence

Skip when `verdi_agent` is down, the daidir is ephemeral, absent, or has not passed decompression.
Load the exact daidir with Design, trace at most two new signals per iteration, and read returned
source locations. Raw `file:line` data and source context outweigh a hedged agent summary. For
`TB_CHECK`, inspect checker/sequence/reference-model code before tracing the DUT.

### 6. Coverage evidence

Use Coverage only for an exact VDB path that has passed decompression. Opening a directory or
finding an XML/test record is not positive validation. Require at least one test, scope, metric,
numeric score, or non-empty item list. Search merged or `urg`-named locations when per-test VDBs
are empty.

### 7. Conclude

Use exactly one evidence label:

- `ROOT CAUSE PROVEN:` exact log/waveform/design evidence and source location.
- `ROOT CAUSE ISOLATED TO:` failing stage and exact signature, with unresolved detail named.
- `ROOT CAUSE NOT ISOLATED:` best evidence-backed candidate and missing capability/artifact.

Never claim waveform or design confirmation when its input gate failed. Include the original and
working paths whenever staging was used.

## Known limitations and recoveries

- After a successful real `import_design` followed by one successful `trace_driver`, the NPI
  session may corrupt: subsequent NPI calls can all return `StopIteration`. Restart the NPI MCP
  server; do not treat subsequent calls as independent measurements.
- A compressed daidir can exist and still be unloadable. `Design` and NPI import require its
  internals decompressed. A compressed VDB similarly cannot validate Coverage.
- Protocol analyzes one protocol per session and may not accept compressed FSDB input. Use an
  uncompressed staged FSDB and a narrow scope; an incomplete turn is a tool quirk, not proof that
  no protocol exists.
- Assertion aggregate statistics require a loaded design; a concrete assertion can be evaluated
  directly only when its exact name/scope is supplied.
- Waveform does not analyze assertions or transactions, cannot address individual struct/union
  members, and may place long result lists in an attachment.
- Protocol composite fields require `decoded_fields` in the protocol spec; custom extensions are
  not auto-detected.
- `trace_x` may use XRCA only with an APEX license. Require explicit checkout/denial evidence
  before making a licensing claim; startup text, encrypted payloads, and Qt/FSDB messages do not
  prove a license failure.
- NPI bit-ranged signal information may be returned under the base signal name. Match results by
  base name when interpreting them.

## Output record

```text
simulator_type, mode, category, test_name
original_test_dir, working_dir, staging_reason
report, sim_log, daidir, fsdb, vdb
inputs_verified, daidir_compression, fsdb_match, vdb_content
stage, fail_time, source_location, offending_signals
logs_inspected, MCP status, tools used, raw failure signature
evidence label and conclusion
```

Keep the final response concise. Record only transferable workflow rules in this skill; put
run-specific results in the changelog or investigation record.
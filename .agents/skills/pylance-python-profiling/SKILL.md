---
name: pylance-python-profiling
description: 'Use when the user wants to profile Python code with Pylance: capture CPU time (Tachyon), trace calls (sys.monitoring), or memory (Memray); profile a whole run or a specific region between two source locations; add sub-region markers; and explore the resulting profile (hot functions, call trees, time slices). Also use for the 3.15+ interpreter requirement and related error guidance.'
---

# Pylance Python Profiling

Use this skill to drive the `pylancePythonProfiling` capture tool and the `pylancePythonProfileExplorer`
analysis tool. Capture produces artifacts on disk plus a sidecar metadata JSON; the explorer loads that
metadata and answers paged queries (hot functions, call tree, time-sliced views).

## Tools

-   `pylancePythonProfiling` — start/stop captures and inspect sessions. One `action` per call.
-   `pylancePythonProfileExplorer` — load a capture's metadata JSON and query it.

Run `{"action":"help"}` on either tool to print its full surface.

## Verified Tool Facts

-   Backends: CPU = `profiling.sampling` (Tachyon), Trace = `sys.monitoring`, Memory = Memray.
-   **CPU profiling requires Python 3.15+.** The tool resolves the workspace-selected interpreter (same
    resolution as the other Pylance MCP tools). If it is below 3.15, capture returns a structured error
    naming the selected version. Fix by selecting a 3.15+ interpreter or passing `pythonPath` explicitly.
-   Trace and Memory work on older interpreters (Trace needs 3.12+ for `sys.monitoring`).
-   Every capture returns a `profilingSessionId` immediately and writes artifacts under an `artifactsDir`,
    including a `*.metadata.json` sidecar. Pass that metadata path to the explorer, not the raw binary.
-   Captures own their own session lifecycle; they do not require `pylancePythonDebug`.
-   The injected handshake and sampler wrapper are code **we add on the fly** — the user's source is never
    edited. Region boundaries and markers are expressed as `file:line`.

## Actions (`pylancePythonProfiling`)

| `action`           | Purpose                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| `list`             | Show active/completed sessions.                                        |
| `status`           | Inspect one session (`profilingSessionId`).                            |
| `startCpu`         | CPU capture. `mode:"launch"` (script/module) or `mode:"attach"` (pid). |
| `startCpuRegion`   | CPU capture of one region only (launch mode). See below.               |
| `stopCpu`          | Stop/finalize a CPU session; returns saved artifact paths.             |
| `startTracing`     | `sys.monitoring` trace of a script/module (launch only).               |
| `stopTracing`      | Cooperative stop for a trace session.                                  |
| `takeHeapSnapshot` | One-shot Memray capture.                                               |
| `stop`             | Terminate a session and drop it from the in-memory list.               |
| `help`             | Print full help.                                                       |

CPU sampling options (apply to `startCpu` and `startCpuRegion`): `samplingRate` (e.g. `"1khz"`),
`duration` (seconds), `samplingMode` (`wall|cpu|gil|exception`, default `cpu`), `allThreads`, `native`,
`noGc`, `opcodes`, `blocking`, `subprocesses`.

## Scenario 1 — Profile a whole run

Launch a script under the CPU sampler, then load the result:

```json
{
    "action": "startCpu",
    "mode": "launch",
    "script": "/path/to/app.py",
    "pythonPath": "/path/to/python",
    "samplingRate": "1khz"
}
```

Attach to an already-running process instead:

```json
{ "action": "startCpu", "mode": "attach", "pid": 12345, "pythonPath": "/path/to/python" }
```

Bound an attach by wall-clock time:

```json
{ "action": "startCpu", "mode": "attach", "pid": 12345, "samplingMode": "wall", "duration": 30 }
```

When done (launch captures finalize on their own; attach/duration captures too), retrieve artifacts:

```json
{ "action": "stopCpu", "profilingSessionId": "pyprof-..." }
```

## Scenario 2 — Profile a specific region (`startCpuRegion`)

Use this when only part of a run matters (a hot function, a request handler) and you want the sampler live
from the region's first instruction with no attach-latency contamination. Launch mode only.

```json
{
    "action": "startCpuRegion",
    "mode": "launch",
    "script": "/path/to/app.py",
    "pythonPath": "/path/to/python",
    "regionStartLocation": "app.py:42",
    "regionStopLocation": "app.py:88"
}
```

How it works (no user code edits):

1. The target launches under an injected handshake. When execution first reaches `regionStartLocation`
   the target parks.
2. Tachyon attaches to the parked target, then the target is released — so the region is sampled from its
   first instruction. Attach cost is paid while parked, outside the measured region.
3. When execution reaches `regionStopLocation`, the sampler is detached and its data flushed before the
   target resumes its tail.

Region bounds are recorded in metadata as `region.startTimeMs`/`region.endTimeMs`, so the explorer can
slice CPU views exactly to the region with `startTimeMs`/`endTimeMs`.

Guidance:

-   Locations are `file:line`; relative paths resolve against the target's working directory.
-   The start line must actually execute, or the region never starts (the tool reports the target exited
    before reaching the start location).
-   Use `stopCpu` to fetch artifacts or to stop early.

## Scenario 3 — Sub-region markers

Markers label points **inside** the region without parking or re-attaching. Use them to break one attach
into several labeled sub-regions (cheaper than many tiny `startCpuRegion` calls) and to annotate phases.

Pass `regionMarkers` as `"label@file:line"` (or just `"file:line"`):

```json
{
    "action": "startCpuRegion",
    "mode": "launch",
    "script": "/path/to/app.py",
    "pythonPath": "/path/to/python",
    "regionStartLocation": "app.py:42",
    "regionStopLocation": "app.py:88",
    "regionMarkers": ["load@app.py:50", "compute@app.py:64", "render@app.py:80"]
}
```

Each time execution reaches a marker line inside the region, a labeled timestamp (ms from region start) is
recorded. The explorer surfaces them under `region.markers`; use adjacent marker times as
`startTimeMs`/`endTimeMs` to slice a sub-region.

## Scenario 4 — Trace and memory

```json
{"action":"startTracing","mode":"launch","module":"mypackage.app","pythonPath":"/path/to/python"}
{"action":"stopTracing","profilingSessionId":"pyprof-..."}
```

```json
{
    "action": "takeHeapSnapshot",
    "mode": "launch",
    "script": "/path/to/app.py",
    "pythonPath": "/path/to/python",
    "traceNativeMemory": true
}
```

## Exploring results (`pylancePythonProfileExplorer`)

Load the capture's metadata JSON, then query views with the returned `profileId`:

```json
{"action":"loadCpuProfile","filePath":"/path/to/artifactsDir/cpu.metadata.json"}
{"action":"query","profileId":"cpu-...","view":"summary"}
{"action":"query","profileId":"cpu-...","view":"bottomUp"}
{"action":"query","profileId":"cpu-...","view":"search","queryText":"compute"}
```

-   CPU views: `summary | callTree | bottomUp | eventLog | search | nodeContext`.
-   Trace views: `summary | events | byCategory | byProcessThread | timelineSlices | search`.
-   Heap views: `summary | allocations | search`.
-   For region captures, `loadCpuProfile` returns a `region` block (bounds + markers). Slice a CPU view to
    the region or a sub-region with `startTimeMs`/`endTimeMs` (both are ms from start).
-   `search` `queryText` syntax: space-separated terms OR; `+term` AND; `/regex/`; `"phrase"` exact.
-   `/regex/` format — a common, safe subset, always case-insensitive:
    -   Supported: literals and escaped metacharacters; `.`; character classes `[...]`/`[^...]`/ranges and `\d \D \w \W \s \S`; anchors `^` `$`; groups `( )` and `(?: )`; alternation `|`; quantifiers `* + ? {m} {m,} {m,n}` (a trailing lazy `?` is accepted); control escapes `\n \r \t \f \v \0`.
    -   Not supported (the term degrades to a literal substring match): word boundaries `\b` `\B`, named groups, back-references, look-around `(?=) (?!) (?<=) (?<!)`, hex/Unicode escapes `\xHH`/`\uHHHH`, Unicode property escapes `\p{...}`, and all flags (`i s m g u y`).
-   Use `loadTrace` / `loadHeapSnapshot` for the other backends.

## Working Rules

-   Always pass the `*.metadata.json` sidecar to the explorer loaders, never the raw `.bin`/`.ndjson`.
-   For CPU work, verify or select a 3.15+ interpreter first; surface the version error verbatim if it
    fails rather than guessing.
-   Prefer `startCpuRegion` over `startCpu` + `duration` when the user cares about a specific code range —
    the handshake guarantees the sampler is live at region start instead of racing attach latency.
-   Prefer markers over many tiny region captures when labeling several adjacent phases under one attach.
-   Report the `profilingSessionId`, `artifactsDir`, and (for regions) the resolved start/stop/marker
    locations so the user can re-open the capture later.

## Known limitations and quirks

These are current rough edges. Where the tool returns a structured error, surface it verbatim rather than
guessing a fix.

### Capture

-   **Memray (memory) is unsupported on Windows.** `takeHeapSnapshot` returns a platform-aware error on
    win32 — there is no package to install. Capture memory on Linux/WSL or macOS instead.
-   **`blocking:true` is unsupported on Windows.** It returns a structured error before any sampler starts;
    re-run without `blocking:true`, or capture on Linux/WSL.
-   **Attach/region on a Windows `uv venv` interpreter can fail to produce an artifact.** The uv venv
    trampoline-shim `python.exe` re-execs the real interpreter as a child and then exits, so the launched
    PID is gone before Tachyon can sample it. (A stdlib `python -m venv` does not have this problem — attach
    works there.) Use launch mode, attach to the real `python.exe` child PID, or pass the base interpreter as
    `pythonPath`. The tool surfaces this hint when an attach/region capture on a uv venv yields no artifact.
-   **`samplingMode:"gil"` is near-unusable under GIL contention** — it collects very few samples. For
    GIL-bound workloads prefer `cpu` (or `wall`) and read thread behavior from the call tree.
-   **`samplingRate` saturates around 400–500 Hz.** Requesting a higher rate does not raise the effective
    sample frequency; treat ~500 Hz as the practical ceiling and do not infer precision beyond it.
-   **Region markers force per-line `sys.monitoring` while the region is active**, which slows the target.
    Keep markers out of tight hot loops, or accept the slowdown for the measured region only.
-   **A marker on the exact region-start line folds into `t=0`.** Place markers on lines strictly inside the
    region (after the start line) so their timestamps are distinct.

### Exploring

-   **Pass the `*.metadata.json` sidecar to the loaders, never a raw `.bin`.** Loading a raw capture binary
    returns a friendly hint pointing at the metadata sidecar instead of an opaque parse error.
-   **CPU views summarize a single thread.** `loadCpuProfile` reports the analyzed thread under
    `threads.analyzed` (with its sample count); other threads are not aggregated into the same view. State
    this limitation when reporting multi-threaded results.
-   **`bottomUp` sorted by self can list zero-self bootstrap frames first.** When reading `bottomUp` by
    self time, look past root/bootstrap frames with zero self to find the true hot leaves.
-   **Trace event views scan all events and honor `startTimeMs`/`endTimeMs`.** `events`, `search`,
    `byCategory`, and `byProcessThread` page over the full event set and reconcile with `summary`; use the
    time window to reach later events rather than expecting one page to cover the whole trace.

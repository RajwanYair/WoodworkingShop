# ADR-002: Vitest Browser Project Runtime and Flake Measurement

- Status: Proposed — ten of ten runs recorded
- Date: 2026-10-12
- Issue: [Sprint 421 T4 / #239](https://github.com/RajwanYair/WoodworkingShop/issues/239)
- Measured commit: `fa2749d79954fc0e7fa8e9c1bb84f7439586c2c9` (T2/T3 stack)

## Context

Sprint 421 added a Chromium component-browser project and Playwright ARIA snapshots. Measure their effect using repeated full CI runs on one unchanged commit. The measurement ref is `issue-239-vitest-run-measurements`; runs are dispatched sequentially because the CI concurrency group cancels an in-progress run when another run starts on the same ref.

## Method

- Include each non-cancelled workflow run on the measured SHA, including failed runs; list skipped dependent jobs separately.
- Workflow duration is from the run's `created_at` to its `updated_at` completion time. Job duration is `completed_at - started_at`.
- For ten values, median is the mean of sorted observations 5 and 6. p95 uses nearest rank, `ceil(0.95 × n)`, so it is the maximum for this sample.
- Report workflow-level failures separately from confirmed test flakes. A test failure that passes in a subsequent full CI run on the same SHA is a candidate intermittent failure; confirm its classification with an isolated rerun or root-cause evidence. Infrastructure failures and cancellations are not test flakes.
- The parent T2 issue specifies no numeric runtime budget. Finalize the assessment after all ten runs and record an agreed threshold or state that none exists; do not infer a budget from CI job timeouts.

## Results

| Run | GitHub Actions run                                                                    | SHA       | Workflow | Quality | Browser |              Unit tests |    Compatibility |                                   E2E | Outcome                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------- | --------- | -------- | ------: | ------: | ----------------------: | ---------------: | ------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [38298366569](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38298366569) | `fa2749d` | 4m16s    |     41s |     48s | 3m08s, 1 failure / 5185 | 24: 49s; 26: 44s |                               skipped | Failed in `tests/components/CommandPalette.test.tsx`; 5184 passed. The failing case passed in ten consecutive local runs on this SHA; candidate flake, not yet confirmed.                                         |
| 2   | [38299282155](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38299282155) | `fa2749d` | 7m39s    |     51s |     42s | 6m19s, 1 failure / 5185 | 24: 41s; 26: 54s |                               skipped | The same CommandPalette active-tab assertion failed again; 5184 passed. E2E, visual, and Lighthouse were skipped. The isolated spec passed 10/10 locally; repeated CI-only failure, not yet confirmed as a flake. |
| 3   | [38300637209](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38300637209) | `fa2749d` | 17m38s   |     45s |     40s |       7m11s, all passed | 24: 50s; 26: 52s | shards 1–4, visual, Lighthouse passed | All CI jobs passed on the unchanged SHA; the CommandPalette failure did not recur.                                                                                                                                |
| 4   | [38303021612](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38303021612) | `fa2749d` | 15m29s   |     44s |     55s |       5m32s, all passed | 24: 48s; 26: 57s | shards 1–4, visual, Lighthouse passed | All 13 CI jobs passed on the unchanged SHA; the CommandPalette failure did not recur.                                                                                                                             |
| 5   | [38305225255](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38305225255) | `fa2749d` | 12m51s   |     56s |     42s |       4m45s, all passed | 24: 50s; 26: 56s | shards 1–4, visual, Lighthouse passed | All workflow jobs passed on the unchanged SHA; the CommandPalette failure did not recur.                                                                                                                          |
| 6   | [38306787152](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38306787152) | `fa2749d` | 15m35s   |     59s |     47s |       5m24s, all passed | 24: 48s; 26: 50s | shards 1–4, visual, Lighthouse passed | All workflow jobs passed on the unchanged SHA; the CommandPalette failure did not recur.                                                                                                                          |
| 7   | [38343060356](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38343060356) | `fa2749d` | 16m42s   |     53s |   2m12s |       7m14s, all passed | 24: 48s; 26: 43s | shards 1–4, visual, Lighthouse passed | All workflow jobs passed on the unchanged SHA; the CommandPalette failure did not recur.                                                                                                                          |
| 8   | [38344476659](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38344476659) | `fa2749d` | 16m47s   |   1m05s |     52s |       7m16s, all passed | 24: 33s; 26: 41s | shards 1–4, visual, Lighthouse passed | All jobs passed. Playwright reported 8 flaky test instances that passed on retry: 1 visual, 3 shard 4, 2 shard 3, 2 shard 1.                                                                                      |
| 9   | [38346022436](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38346022436) | `fa2749d` | 39m40s   |     52s |     42s |       5m01s, all passed | 24: 49s; 26: 37s | shards 1–4, visual, Lighthouse passed | All workflow jobs passed. Playwright reported 10 flaky test instances that passed on retry: 1 visual, 3 each in shards 1, 2, and 4.                                                                               |
| 10  | [38349371476](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38349371476) | `fa2749d` | 23m25s   |     56s |     43s |       7m32s, all passed | 24: 54s; 26: 41s | shards 1–4, visual, Lighthouse passed | All workflow jobs passed. Three Playwright test instances in shard 2 failed initially and passed on retry.                                                                                                        |

## Decision

The ten-run sample is complete on the unchanged SHA. These are baseline measurements, not pass/fail thresholds: the parent T2 issue specifies no numeric runtime budget.

Full-workflow duration was 16m08.5s median and 39m40s p95; the browser-component job was 45s median and 2m12s p95.

Two of ten workflows failed (20%) on the same CommandPalette active-tab assertion in runs 1 and 2; runs 3–10 passed. The isolated spec passed 10/10 locally, but the CI-only failure has no established root cause, so it remains a candidate intermittent failure, not a confirmed flake.

Runs 8–10 reported 21 Playwright test instances that failed initially and passed on retry; keep these separate from workflow failures.

## Consequences

Use these results as the runtime and reliability baseline for future browser-project changes. Revisit a numeric budget only when the project owner defines one; do not infer it from CI job timeouts.

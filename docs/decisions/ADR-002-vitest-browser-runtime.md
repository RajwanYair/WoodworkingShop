# ADR-002: Vitest Browser Project Runtime and Flake Measurement

- Status: Proposed — four of ten runs recorded
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

| Run  | GitHub Actions run                                                                    | SHA       | Workflow | Quality | Browser |              Unit tests |    Compatibility |                                   E2E | Outcome                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------- | --------- | -------- | ------: | ------: | ----------------------: | ---------------: | ------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [38298366569](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38298366569) | `fa2749d` | 4m16s    |     41s |     48s | 3m08s, 1 failure / 5185 | 24: 49s; 26: 44s |                               skipped | Failed in `tests/components/CommandPalette.test.tsx`; 5184 passed. The failing case passed in ten consecutive local runs on this SHA; candidate flake, not yet confirmed.                                         |
| 2    | [38299282155](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38299282155) | `fa2749d` | 7m39s    |     51s |     42s | 6m19s, 1 failure / 5185 | 24: 41s; 26: 54s |                               skipped | The same CommandPalette active-tab assertion failed again; 5184 passed. E2E, visual, and Lighthouse were skipped. The isolated spec passed 10/10 locally; repeated CI-only failure, not yet confirmed as a flake. |
| 3    | [38300637209](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38300637209) | `fa2749d` | 17m38s   |     45s |     40s |       7m11s, all passed | 24: 50s; 26: 52s | shards 1–4, visual, Lighthouse passed | All CI jobs passed on the unchanged SHA; the CommandPalette failure did not recur.                                                                                                                                |
| 4    | [38303021612](https://github.com/RajwanYair/WoodworkingShop/actions/runs/38303021612) | `fa2749d` | 15m29s   |     44s |     55s |       5m32s, all passed | 24: 48s; 26: 57s | shards 1–4, visual, Lighthouse passed | All 13 CI jobs passed on the unchanged SHA; the CommandPalette failure did not recur.                                                                                                                             |
| 5–10 | Pending                                                                               | `fa2749d` |          |         |         |                         |                  |                                       |                                                                                                                                                                                                                   |

## Decision

Pending completion of the ten-run sample and confirmation of the applicable browser-project runtime budget. The first two CI runs failed on the same CommandPalette active-tab assertion, while runs 3 and 4 passed on the same SHA. The observed full-workflow test failure rate is 2/4; treat the test as a candidate intermittent failure, with root cause and final classification still open.

## Consequences

Pending measurement results. No numeric runtime budget is specified by the parent T2 issue; do not infer one from CI job timeouts.

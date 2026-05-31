# Governance Policy — Claim Verification & Assertion Rules

> Effective: 2026-05-31 · Phase 52, Sprint 245
> Policy owner: @RajwanYair

## Purpose

This policy establishes rules for when claims in README.md, ARCHITECTURE.md, ROADMAP.md, and copilot-instructions.md may be marked as "verified" or must be flagged as "unverified" or "stale."

## Claim Categories

| Category          | Definition                                                   | Verification Method                                | Review Cadence                 |
| ----------------- | ------------------------------------------------------------ | -------------------------------------------------- | ------------------------------ |
| **Technical**     | Framework versions, feature availability, API contracts      | Compile/test pass; version check in package.json   | Before each release            |
| **Performance**   | Bundle size, test count, memory usage, latency               | Automated gate (npm run bundle:check, bench:check) | Before each release            |
| **Accessibility** | WCAG conformance, a11y audit results                         | Playwright axe-core; manual spot-check             | Before each release            |
| **Quality**       | Test coverage %, lint pass rate, CI gate status              | CI logs; npm run quality:fast                      | Before each release            |
| **Process**       | Sprint count, release frequency, commit policy               | git log; release history                           | Quarterly                      |
| **Capability**    | Feature completeness, export formats, multi-language support | Feature-test; export sample                        | Before feature claim in README |

## Verification Rules

### Rule 1: Version Claims (Technical)

**Definition**: Any claim about package/tool version (React 19, TypeScript 6, Tailwind v4, etc.)

**Verification**:

- ✅ PASS: `package.json` or `tsconfig.json` reflects the claimed version (exact or semver-compatible)
- ❌ FAIL: Version in docs differs from source-of-truth config files

**Corrective Action**: Update docs to match package.json, OR update package.json and rebuild with new version.

**Review**: Every `npm install` that bumps major version; before release.

---

### Rule 2: Feature Claims (Capability)

**Definition**: Any claim that a feature exists and is usable (e.g., "6 views," "RTL support," "MaxRects bin-packing")

**Verification**:

- ✅ PASS: Feature has an automated test (unit or E2E) AND appears in product UI/export
- ✅ PASS: Manual smoke test on live demo validates feature works as described
- ❌ FAIL: Feature mentioned in docs but no test; feature hidden behind feature flag; feature broken on latest build

**Corrective Action**: Add test or E2E smoke; remove claim until fixed; mark with `[WIP]` if partial.

**Review**: Before feature freeze (start of release sprint); before GitHub release artifact published.

---

### Rule 3: Performance Claims (Performance)

**Definition**: Any claim about bundle size, test count, speed, or resource limits (e.g., "< 200 KB gzip," "950+ tests")

**Verification**:

- ✅ PASS: Claim is tracked by `npm run bundle:check` or `npm run bench:check`; gate passes
- ✅ PASS: Test count verified by `npm test` output (e.g., "4244 tests passed")
- ✅ PASS: Lighthouse audit results confirm claim (e.g., TBT < 200 ms)
- ❌ FAIL: Claim exceeds actual measurement; gate does not enforce the claim; no baseline to verify against

**Corrective Action**: Update claim to match reality OR lower the gate threshold; document why gate was relaxed.

**Review**: Every build; before release; quarterly baseline review.

---

### Rule 4: Quality Gates (Quality)

**Definition**: Any claim about test pass rate, lint status, or no suppressed diagnostics

**Verification**:

- ✅ PASS: `npm run quality:fast` passes without warnings
- ✅ PASS: `npm test` shows 100% pass rate
- ✅ PASS: `grep -r "eslint-disable\|@ts-ignore\|@ts-nocheck\|as any" src/` returns 0 matches
- ❌ FAIL: Any suppression found; any test fails; any quality gate soft-fails with `|| true`

**Corrective Action**: Fix root cause (no suppressions allowed). Add test or refactor type if needed.

**Review**: Every commit (pre-commit gate via `npm run check`); before release via `npm run ci`.

---

### Rule 5: Accessibility Claims (Accessibility)

**Definition**: Any claim about WCAG conformance (e.g., "WCAG 2.2 AA audited")

**Verification**:

- ✅ PASS: `npm run test:e2e` includes axe-core audits; no WCAG AA violations reported
- ✅ PASS: Keyboard navigation tested for tab order, focus traps, shortcuts
- ✅ PASS: Screen reader tested on real AT (manual spot-check)
- ❌ FAIL: Violations reported; test skipped; claim unverified by any test

**Corrective Action**: Add E2E test with axe-core; fix violations; escalate manual test requirement to release criteria.

**Review**: Before release; quarterly manual audit with accessibility tool (e.g., WAVE, axe DevTools).

---

### Rule 6: Process Claims (Process)

**Definition**: Claims about how work is organized (e.g., "5 sprints per phase," "GH release every 5 sprints," "Commit after each sprint")

**Verification**:

- ✅ PASS: `git log --oneline | head -20` shows commits aligned with claim (one per sprint or per release)
- ✅ PASS: GitHub Releases page shows tags matching claim frequency
- ✅ PASS: ROADMAP.md phase/sprint structure matches actual tag history
- ❌ FAIL: Random or undocumented commits; releases without tags; phase skipped

**Corrective Action**: Enforce in CI (fail if commit message missing); document waiver in git tag body; update ROADMAP if plan changes.

**Review**: Before release; phase transition; quarterly retrospective.

---

## Claim Assessment Matrix

| Claim Location                      | Assessment                                                         | Owner    | Frequency                  |
| ----------------------------------- | ------------------------------------------------------------------ | -------- | -------------------------- |
| README badges                       | Automated (CI badge links to workflow; test count from `npm test`) | CI/CD    | Every commit               |
| README feature table                | Manual verification (feature test)                                 | Dev + QA | Before feature claim added |
| ARCHITECTURE.md data flow           | Manual verification (code review; module trace)                    | Dev      | Before release             |
| ARCHITECTURE.md performance numbers | Automated (benchmark gates)                                        | CI/CD    | Every commit               |
| ROADMAP.md sprint definition        | Manual verification (acceptance criteria review)                   | PM/Dev   | Phase start                |
| copilot-instructions.md tech stack  | Automated (package.json version check)                             | Lint/CI  | Before release             |

---

## Escalation & Exception Process

### Unverifiable Claims (Cannot Test)

Examples: "best-in-class," "most flexible," "trusted by professionals"

**Policy**: Mark with `✧ subjective claim` tag in docs. Do NOT include in CI/CD gates. Update quarterly based on user feedback.

**Example Revision**:

```markdown
- **Before**: Cabinet Planner is the best-in-class cabinet planner.
- **After**: Cabinet Planner provides [specific measurable features: MaxRects bin-packing, 6-language i18n, WCAG 2.2 AA accessibility].
```

### Known Limitations (Cannot Meet Gate)

Examples: "100% offline-first" (but sync feature requires network), "Zero cloud" (optional Supabase integration)

**Policy**: Mark with `✧ optional feature` or `✧ requires network` tag. Document condition under which claim applies.

**Example**:

```markdown
- Full offline-first mode ✧ (core workflows; sync requires network)
```

### Technical Debt (Claim Deferred)

Examples: "Golden-file export contract tests" (planned Phase 52, not Phase 51)

**Policy**: Mark with `[Sprint NNN]` tag in ROADMAP.md. Move to ROADMAP once implemented.

---

## Implementation Checklist

For this sprint (245), audit and tag all existing claims:

- [ ] README.md: mark claims verified/unverified/subjective
- [ ] ARCHITECTURE.md: verify data flow and performance numbers against code
- [ ] ROADMAP.md: verify phase/sprint definitions against git history
- [ ] copilot-instructions.md: verify tech stack against package.json
- [ ] Create this policy document (GOVERNANCE-POLICY.md) ← **THIS SPRINT**
- [ ] Add CI check: `grep -r "eslint-disable\|@ts-ignore" src/` must return 0 (optional: add to lint gate)
- [ ] Add CI check: feature claim count matches actual test count (optional: before Phase 53)

---

## References

- [ROADMAP.md](../ROADMAP.md) — Product direction and sprint definitions
- [CHANGELOG.md](../CHANGELOG.md) — Release history (source of truth for version claims)
- [.github/workflows/ci.yml](../workflows/ci.yml) — CI gates (source of truth for quality claims)
- [copilot-instructions.md](../copilot-instructions.md) — Tech stack and conventions

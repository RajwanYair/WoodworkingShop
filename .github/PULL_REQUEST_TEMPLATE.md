# Pull Request

## Description

<!-- Brief description of what this PR changes and why. -->

## Type of Change

- [ ] Feature / enhancement
- [ ] Bug fix
- [ ] Refactor / code quality
- [ ] CI / workflow change
- [ ] Documentation update
- [ ] Dependency update

## Quality Gate

- [ ] `npm run check` passes — typecheck + lint + format + test (0 errors, 0 warnings)
- [ ] `npm run build` succeeds with 0 warnings
- [ ] `npm run dead:check` — no new orphaned exports
- [ ] `npm run bundle:check` — bundle within budget (≤ 1.8 MB gzipped)

## Scope Checklist

- [ ] **i18n parity** — every new `t('key')` added to both `en.json` and `he.json`
- [ ] **No suppression** — no `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `as any`
- [ ] **No new deps** added without removing one (prod deps limit: 7)
- [ ] **RTL layout** — Tailwind logical props used (`ms-*`, `me-*`), never `ml-*`/`mr-*`
- [ ] **Engine purity** — `src/engine/` changes have no React/DOM imports

## Accessibility

- [ ] New interactive elements have visible focus indicators
- [ ] Inputs have associated `<label>` or `aria-label`
- [ ] Dynamic regions use `aria-live` where needed
- [ ] No `role="list"` on `<ul>` / no `onKeyDown` on non-interactive `<div>`

## Documentation

- [ ] `CHANGELOG.md [Unreleased]` entry added
- [ ] ROADMAP sprint item marked DONE (if applicable)
- [ ] Browser-visible feature tested in Chrome + Firefox

## Related Issues / Sprints

<!-- Closes #XX | Part of Sprint XX -->

## Release Notes (if user-facing)

<!-- One sentence summarising the user-facing change for CHANGELOG. -->

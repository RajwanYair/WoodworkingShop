---
mode: agent
description: Audit the app for WCAG 2.2 AA accessibility issues and remediate every violation found.
---

# Accessibility Audit (WCAG 2.2 AA)

You are auditing and fixing accessibility issues in the Cabinet Planner project.

## Scope

All interactive and visible UI surfaces: configurator, optimizer, assembly guide, PDF preview, layout panels.

## Steps

### 1 — Automated scan (axe-core)

```bash
npm run test:e2e
```

Review the axe accessibility violations in Playwright test output. Every `critical` and `serious` violation must be fixed.

### 2 — Manual checklist

For each panel, verify:

| Check                   | Criterion           | How to verify                              |
| ----------------------- | ------------------- | ------------------------------------------ |
| Keyboard navigation     | WCAG 2.1.1          | Tab through the entire UI — no focus traps |
| Visible focus indicator | WCAG 2.4.7 / 2.4.11 | Focus ring visible on every interactive el |
| Color contrast          | WCAG 1.4.3 (4.5:1)  | Inspect with DevTools contrast checker     |
| Form labels             | WCAG 1.3.1          | Every input has `<label>` or `aria-label`  |
| Error messages          | WCAG 1.3.1 / 3.3.1  | `role="alert"` or `aria-live`              |
| Images with text        | WCAG 1.4.5          | Use SVG text or provide `aria-label`       |
| RTL mirroring           | WCAG 1.3.4          | Test with `dir="rtl"` (HE / AR locales)    |
| Reduced motion          | WCAG 2.3.3          | `prefers-reduced-motion` media query used  |

### 3 — Common fixes for this codebase

- **Missing label**: wrap `<input>` in `<label>` or add `aria-labelledby` pointing to visible heading
- **Redundant ARIA**: remove `role="list"` from `<ul>` / `role="listitem"` from `<li>` — implicit semantics are sufficient
- **`<div>` as button**: replace with `<button type="button">` — never attach `onClick` + `onKeyDown` to a `<div>`
- **Focus trap in modal**: use `useFocusTrap(ref, isOpen, onEscape?)` from `src/hooks/`
- **Toast dismissal**: toast container must have `aria-live="polite"` and a visible close button
- **SVG icons**: decorative icons → `aria-hidden="true"`; informative icons → `aria-label` on the button

### 4 — Constraints

- **Never add** `role="presentation"` to hide real content from screen readers
- **Never suppress** `jsx-a11y` lint rules — fix the root cause
- **RTL-safe**: use Tailwind logical props (`ms-*`, `me-*`, `ps-*`, `pe-*`) — never `ml-*`/`mr-*`

### 5 — Validate

```bash
npm run quality    # jsx-a11y lint must be 0 warnings
npm run test:e2e   # axe violations must be 0
```

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.

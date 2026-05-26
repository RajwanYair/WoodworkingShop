---
applyTo: 'src/components/**/*.tsx'
---

# React Component Instructions

These instructions apply to all `.tsx` files under `src/components/`.

## Exports

- **Named exports only** — no default exports (satisfies `react-refresh/only-export-components`)
- If a `.tsx` file needs utility functions or constants, extract them to a sibling `.ts` file

## Styling

- Use Tailwind CSS utility classes only — no inline styles, no `style={{}}` with pixel values
- Use `wood-*` design tokens for semantic colours — no hardcoded hex/rgb values
- **Logical properties only**: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`
- Never use `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*` (breaks RTL layouts)

## ARIA & Accessibility

- All form inputs must have an associated `<label>` or `aria-label`
- Dynamic regions must use `aria-live="polite"` (or `"assertive"` for critical alerts)
- Do NOT add `role="list"` to `<ul>` or `role="listitem"` to `<li>` — they already have implicit roles
- Do NOT add `onClick` to non-interactive elements (`<div>`, `<span>`) — use `<button>` instead
- Use `useFocusTrap(ref, active, onEscape?)` for modal/drawer focus trapping — 3 params

## i18n

- All user-visible strings must use `t('key')` from `useTranslation()`
- Key must exist in both `src/i18n/en.json` AND `src/i18n/he.json` before committing

## Size limit

- Components should be ≤ 600 lines
- If a component exceeds 600 lines, split it into sub-components using the `split-component` prompt

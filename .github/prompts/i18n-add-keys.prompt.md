---
mode: agent
description: Add i18n keys to en.json + he.json with full parity — validates JSON after editing.
---

# Add i18n Keys

You are adding localization keys to the Cabinet Planner project.

## Rules

1. **Always** add keys to BOTH `src/i18n/en.json` AND `src/i18n/he.json`.
2. Keys use **dot-namespaced** format matching existing sections (e.g. `finish.title`, `buildLog.add`).
3. Hebrew values should be real translations, not transliterations.
4. JSON must remain valid after edits — no trailing commas, no JS comments.
5. Run `npm run i18n:coverage` to confirm 100% parity.

## Input

Add these keys:

```
${keys}
```

## Steps

1. Read `src/i18n/en.json` to find the correct insertion point (maintain alphabetical section order).
2. Add the English keys as a new section or append to an existing section.
3. Read `src/i18n/he.json` and add corresponding Hebrew translations.
4. Validate both files: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/en.json','utf8'))"` (repeat for he.json).
5. Run `npm run i18n:coverage` → must show 100% parity.
6. Run `npx prettier --write src/i18n/en.json src/i18n/he.json`.

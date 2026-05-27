---
mode: agent
tools:
  - read_file
  - replace_string_in_file
  - create_file
  - run_in_terminal
  - grep_search
  - file_search
---

# PWA Audit & Enhancement

## Goal

Ensure the Cabinet Planner PWA passes all Lighthouse PWA checks and provides
a reliable offline experience.

## Checklist

### Manifest (`public/manifest.json`)

- [ ] `name`, `short_name`, `description` present and non-empty
- [ ] `icons` includes 192×192 and 512×512 maskable icons
- [ ] `display: "standalone"` set
- [ ] `theme_color` and `background_color` match the app palette
- [ ] `start_url: "/"` with `?source=pwa` (optional analytics tag)
- [ ] `categories: ["productivity", "utilities"]` (optional but good)
- [ ] `screenshots` array for richer install UI (optional)

### Service Worker (`public/sw.js` / Workbox config in `vite.config.ts`)

- [ ] App shell (HTML, JS, CSS) pre-cached on install
- [ ] Navigation fallback to `/index.html` for SPA routes
- [ ] Cache strategy: network-first for JSON APIs; cache-first for assets
- [ ] Old caches cleaned on activate
- [ ] No cross-origin resources cached without explicit allow-list
- [ ] SW version bumped via `scripts/sync-sw-version.js` — verify it runs in build

### Install prompt

- [ ] `beforeinstallprompt` event captured and deferred
- [ ] Install button shown in the header / settings panel (using `usePwaInstall` hook)
- [ ] Not shown again for 30 days after dismissal (localStorage flag)
- [ ] i18n key `pwa.installPrompt` present in `en.json` and `he.json`

### Offline experience

- [ ] App loads without network (cached shell + last-good data)
- [ ] A toast / banner shown when offline: `t('pwa.offlineNotice')`
- [ ] Export actions disabled with tooltip when offline (G-code, PDF, BOM)

## Steps

1. Read `vite.config.ts` → locate Workbox / `vite-plugin-pwa` config.
2. Read `public/manifest.json`.
3. Run `npm run build && node scripts/lighthouse.js` — check PWA category.
4. Fix each failing checklist item.
5. Run `npm run quality && npm test`.
6. Update `CHANGELOG.md [Unreleased]` with PWA delta.

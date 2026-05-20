# Migration Guide

This document covers breaking changes and migration steps for each major version boundary of **Cabinet Planner**.

## Versioning Policy

Cabinet Planner uses [Semantic Versioning](https://semver.org/):

- **Patch** (`3.x.y → 3.x.(y+1)`) — new features, bug fixes, no breaking changes.
- **Minor** (`3.x.0 → 3.(x+1).0`) — significant feature additions; backwards-compatible.
- **Major** (`3.x.x → 4.0.0`) — breaking changes to the public API surface, stored data schema, or URL state format.

---

## v3 → v4 (planned)

> **Status**: Not yet released. These are planned breaking changes for the v4 major.

### Planned breaking changes

| Area             | Change                                                                                        | Migration action                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **URL state**    | `?c=<base64>` config parameter encoded with new Zstandard compression (smaller URLs)          | Old URLs remain readable via a compatibility shim; no user action needed |
| **Project JSON** | Schema version bumped from `1` to `2`; `customShelfPositions` renamed to `shelfPositions`     | Run `migrateProject()` — it handles v1→v2 automatically                  |
| **Room layout**  | `room-layouts` localStorage key added; format not backwards-compatible with v3 store state    | First load in v4 starts with an empty room layout                        |
| **CSP**          | `script-src 'unsafe-inline'` removed; inline SW registration moved to `public/sw-register.js` | No user action; build artifact change only                               |

---

## v3.53 series — notable migration notes

### v3.53.28 — Project JSON import/export (`migrateProject`)

**Feature**: `exportProjectJson` / `importProjectJson` / `migrateProject` functions added to `src/utils/project-storage.ts`.

**Stored format**: JSON with `schemaVersion: 1`. All fields spread over `DEFAULT_CONFIG` on import, so new config keys added in future patches have safe default fallbacks.

**Breaking change**: None — feature is additive.

---

### v3.53.32 — `RoomLayout` + `room-store`

**Feature**: New Zustand store `useRoomStore` (persisted under the key `room-layouts`) with `RoomLayout` / `RoomCabinet` types.

**Breaking change**: None — completely new store; existing cabinet state unaffected.

---

### v3.53.33 — Content Security Policy

**Feature**: CSP `<meta http-equiv="Content-Security-Policy">` added to `index.html`. Inline SW registration script extracted to `public/sw-register.js`.

**Breaking change for self-hosters**: If you serve the app with an HTTP `Content-Security-Policy` header that conflicts with the meta tag, the stricter policy wins. Ensure your server headers include `worker-src 'self' blob:` for web workers to function.

---

### v3.53.34 — SharedArrayBuffer detection

**Feature**: `trySharedArrayBuffer(size)` in `src/workers/shared-buffer.ts`.

**Breaking change**: None — utility returns `null` on non-isolated contexts; no behaviour change to existing worker pipeline.

---

### v3.53.31 — ERP/MRP CSV export (`generateErpCsv`)

**Feature**: `generateErpCsv` / `downloadErpCsv` added to `src/utils/bom-export.ts`. Schema version pinned to `bom-erp-csv-v1`.

**Breaking change**: None — additive export function.

---

## URL State Format

The URL state (`?c=…`) encodes a `CabinetConfig` as a base64-encoded JSON string. The format is **not** guaranteed stable across major versions.

For persistent project storage, use **Project JSON** (`exportProjectJson`) which is versioned and migrated.

---

## localStorage Keys

| Key                | Owner                       | Notes                                      |
| ------------------ | --------------------------- | ------------------------------------------ |
| `cabinet-planner`  | `cabinet-store.ts`          | Main cabinet config + undo stack           |
| `custom-materials` | `custom-materials-store.ts` | User-defined materials                     |
| `room-layouts`     | `room-store.ts`             | Multi-cabinet room layout (added v3.53.32) |
| `onboarding-seen`  | `OnboardingOverlay.tsx`     | Set to `'1'` once tour is dismissed        |

---

## Data Migration Functions

All migration utilities live in `src/utils/project-storage.ts`:

```ts
// Export current project as versioned JSON
exportProjectJson(cabinets, projectName): ProjectJson

// Import (merges stored config with DEFAULT_CONFIG for forward compatibility)
importProjectJson(json: unknown): ProjectJson

// Upgrade persisted JSON to latest schema version
migrateProject(raw: unknown): ProjectJson
```

Any JSON with `schemaVersion < CURRENT_SCHEMA_VERSION` is automatically upgraded in-place by `migrateProject`.

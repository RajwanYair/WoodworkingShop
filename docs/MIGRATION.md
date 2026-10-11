# Migration Guide

This document describes the current project-file and browser-storage migration contracts for **WoodworkingShop v5.35.0**. The next release target is v5.36.0.

## Versioning Policy

WoodworkingShop uses [Semantic Versioning](https://semver.org/):

- **Patch** (`5.x.y → 5.x.(y+1)`) — fixes and compatible changes.
- **Minor** (`5.x.0 → 5.(x+1).0`) — compatible feature additions.
- **Major** (`5.x.x → 6.0.0`) — breaking changes to public APIs, stored data, or URL state.

---

## Current Project Files

Individual project files use schema `1.0`; multi-project bundles use format version `1`.
`src/utils/project-storage.ts` owns validation and migration.

- Imports without `schemaVersion` are treated as current `1.0` files.
- Legacy `0.9` files using `projectName` are migrated to the `1.0` `name` field.
- Unsupported future project schema versions are rejected; unknown versions are not silently downgraded.
- Cabinet and project data is stored in IndexedDB. On first access, the app migrates legacy project,
  saved-config, and snapshot arrays from their old localStorage keys when the corresponding IndexedDB
  store is empty. Legacy keys are left in place.
- Use the app's JSON project and bundle exports for backups; browser storage is not a substitute for a backup.

Current IndexedDB databases/object stores are `cabinet-planner-projects/projects`,
`cabinet-planner-configs/saved-configs`, and `cabinet-planner-snapshots/snapshots`.

---

## Historical v3.53 Notes

The entries below describe the legacy v3.53 implementation and are retained as migration history,
not as the current project-file or storage contract.

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

Shareable URLs encode only non-default configuration values as compact query parameters, with optional
`tab`, cabinet index, template, and project-name parameters. The format is **not** guaranteed stable
across major versions.

For persistent project storage, use versioned Project JSON or a project bundle.

---

## Browser Storage

Projects, saved configurations, and snapshots use IndexedDB. These localStorage keys remain active
for preferences and feature state:

| Key                                                            | Owner                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| `woodworkingshop:session`                                      | `cabinet-store.ts`                                           |
| `woodworkingshop:prefs`                                        | `store/slices/uiSlice.ts`                                    |
| `woodworkingshop:buildlog`                                     | `store/slices/uiSlice.ts`                                    |
| `woodworkingshop:cutchecklist`                                 | `store/slices/uiSlice.ts`                                    |
| `woodworkingshop:snapshots`                                    | `store/slices/snapshotSlice.ts` (also migrated to IndexedDB) |
| `woodworkingshop:namedExpressions`                             | `store/slices/namedExpressionsSlice.ts`                      |
| `custom-materials`, `custom-hardware`, `room-layouts`          | Corresponding Zustand stores                                 |
| `woodworkingshop:stocktracker`, `woodworkingshop:costvariance` | Corresponding persisted Zustand stores                       |

One-time legacy IndexedDB migrations read `cabinet-planner-projects-v1` (projects),
`cabinet-planner-saved-configs` (saved configurations), and `woodworkingshop:snapshots` (snapshots).

---

## Data Migration Functions

All migration utilities live in `src/utils/project-storage.ts`:

```ts
// Download a versioned project JSON file
exportProjectJson(project: SavedProject, snapshots?: ProjectSnapshot[]): void

// Import a project file and migrate its supported schema
importProjectJson(file: File): Promise<SavedProject>

migrateProject(raw: unknown): SavedProject
```

`PROJECT_SCHEMA_REGISTRY` currently supports `0.9` and `1.0`; only the defined legacy `0.9` shape
is migrated. Project-bundle format version is `1`.

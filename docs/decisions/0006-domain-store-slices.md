# ADR-0006: Keep Satellite Stores Separate

- Status: Accepted
- Date: 2026-10-14

## Context

Sprint 429 asks the cabinet store to be composed from domain slices and to replace full cabinet snapshots with structural undo patches.
It also asks whether custom materials, custom hardware, stock, cost variance, and room layouts should fold into that store.
Those stores already persist under their own keys and have lifecycles that are independent of a cabinet edit.
See [cabinet store](../../src/store/cabinet-store.ts), [cabinet history](../../src/store/slices/cabinetHistory.ts), and [versioned persist](../../src/store/slices/versionedPersist.ts).

## Decision

Compose cabinet, project, catalog, optimizer, and UI behavior as slices of the main store. Keep the satellite stores separate:

- Custom materials and custom hardware are catalog data. Editing them must not create a cabinet undo step.
- Stock tracker and cost variance belong to later shop workflows and persist independently.
- Room layouts are a later room domain, not a cabinet-list mutation.
- Toast state is ephemeral and is not persisted.

Each persisted satellite uses persist version 1 and migrates version 0 data in place. Cabinet session persistence goes through `StorageAdapter`, stores a version field per slice, and still writes the legacy flat session fields so existing readers keep working. Undo history stores structural field operations, capped at 50 steps. Slider drags remain one step.

## Consequences

Cabinet undo no longer retains full cabinet arrays. A measured 50-cabinet project with 50 width edits uses 6,301 bytes of structural history, against 45,401 bytes for changed-entry snapshots and 1,137,151 bytes for full-array snapshots. Satellite data is not rolled back with cabinet undo. Reconsider folding a satellite only when its edits must share the cabinet history stack or a single persistence transaction.

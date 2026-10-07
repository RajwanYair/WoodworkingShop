# API Capability Boundaries

This document captures integration boundaries and the runtime guarantees for each capability.

Source of truth: src/services/capability-contracts.ts

The following engine barrels are supported module boundaries for internal and downstream consumers:

- `src/engine/assembly/index.ts`
- `src/engine/export/index.ts`
- `src/engine/geometry/index.ts`
- `src/engine/hardware/index.ts`
- `src/engine/materials/index.ts`
- `src/engine/optimizer/index.ts`
- `src/engine/stock/index.ts`
- `src/engine/inventory/index.ts`
- `src/engine/inventory/waste/index.ts`
- `src/engine/inventory/comparison/index.ts`
- `src/engine/templates/index.ts`

## Boundary Rules

1. Network-dependent capabilities are never on the critical path.
2. Every capability has an explicit owner and source file.
3. Experimental capabilities must be behind an explicit feature flag.
4. Core workflows must remain functional when optional capabilities are unavailable.

## Same-Name Module Ownership

Matching filenames do not imply interchangeable APIs. Keep these owners
separate until a versioned migration proves their schemas and consumers align.

| Modules                                                   | Ownership boundary                                                                                                                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine/ai-assistant.ts` / `utils/ai-assistant.ts`        | Deterministic constraint ranking versus user-configured external AI provider requests and key storage.                                                                                    |
| `engine/batch-export.ts` / `utils/batch-export.ts`        | Immutable project export-job state and manifest versus concurrent execution of caller-supplied browser export tasks.                                                                      |
| `engine/crdt-sync.ts` / `utils/crdt-sync.ts`              | Immutable configuration/presence state using stamped operations versus mutable path documents, tombstones, and serialized document snapshots. Their wire schemas are not interchangeable. |
| `engine/erp-export.ts` / `utils/erp-export.ts`            | ERP-system payloads derived from engine config and optimization data versus the separate `erp-v1` project export payload and download adapter.                                            |
| `engine/export/ifc-export.ts` / `utils/ifc-download.ts`   | Pure IFC content generation versus browser Blob and download handling.                                                                                                                    |
| `engine/export/gltf-export.ts` / `utils/gltf-download.ts` | Pure glTF content generation versus browser Blob and download handling.                                                                                                                   |
| `engine/webserial-v2.ts` / `utils/webserial-cnc.ts`       | Pure stream-session lifecycle versus browser serial port I/O. The assembly panel uses the utility; the engine API is a deprecated compatibility adapter through v5.35.x.                  |

## Capability Matrix

| Capability ID  | Name                  | Status | Requires Network | Critical Path | Feature Flag |
| -------------- | --------------------- | ------ | ---------------- | ------------- | ------------ |
| error-reporter | Client Error Reporter | active | no               | no            | -            |

There is no cloud-sync adapter in the application. Any future network-backed
sync requires an approved architecture decision and must remain optional to
local-first workflows.

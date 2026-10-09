# Project File Format

## Canonical Export

Single-project JSON exports follow [the version 1 JSON Schema](../config/schemas/project-v1.schema.json). The stable envelope contains `id`, `name`, `savedAt`, `schemaVersion`, `generatedAt`, and `cabinets`; `snapshots` is optional. Every exported document sets `schemaVersion` to the string `"1.0"` and includes an export timestamp.

Each cabinet contains a name and a complete configuration. Cabinet notes are optional. Configuration fields listed by the schema are the supported inputs to cabinet calculations; newly introduced configuration keys remain permitted for forward compatibility. Snapshot records preserve the same cabinet input data at a point in time.

## Field Policy

| Category              | Fields                                                                                                               | Compatibility policy                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Stable envelope       | `id`, `name`, `savedAt`, `schemaVersion`, `cabinets`                                                                 | Required by schema version 1.0; changes that rename or remove these fields require a new schema version and migration. |
| Export metadata       | `generatedAt`                                                                                                        | Required on downloaded canonical exports; describes the export, not the project save time.                             |
| Optional history      | `snapshots`                                                                                                          | May be omitted; each snapshot contains its own id, name, timestamp, and cabinet records.                               |
| Optional cabinet data | `notes` and optional configuration fields                                                                            | May be omitted when the corresponding default or absence is meaningful.                                                |
| Derived/runtime state | Dimensions, generated parts, optimizer and assembly results, pending flags, undo history, worker state, and UI state | Not part of the project file. Recomputed from cabinet inputs after load.                                               |

At the root, unknown fields are ignored during migration and are not copied to the normalized `SavedProject`. Unknown cabinet and configuration properties are currently preserved; consumers should ignore fields they do not understand. The schema allows those nested properties so adding a field does not invalidate older readers.

## Import Compatibility

The canonical export schema is not the complete import validator. Runtime import currently accepts schema version `1.0`, legacy `0.9`, and unversioned records, normalizing them to `1.0`. Legacy records may use `projectName` in place of `name`. Unknown or future schema versions are rejected. Structural validation and normalization are performed by `migrateProject` before a project is applied.

Field type and enum requirements are described by the JSON Schema. Semantic dimension ranges and construction constraints remain enforced by the application’s existing validation and calculation layers; a schema-valid file is not a manufacturing approval.

The schema describes the current serialization boundary. Migration steps and historical fixtures are maintained separately as part of Sprint 319 T2/T3.

/**
 * Sprint 299 — Export Schema Versioning
 *
 * Central registry of schema identifiers for every export format.
 * Each schema identifier follows the pattern:
 *   `<format>-v<major>` e.g. `dxf-ac1015-v2`, `gcode-v1`, `bom-csv-v1`.
 *
 * Incrementing the major version signals to downstream tools (CAM software,
 * importers, CI golden-file checks) that the structure has changed in a
 * breaking way.  Minor layout changes that remain backward-compatible do NOT
 * require a version bump — only structural changes that break existing parsers.
 */

/** Schema identifier for DXF exports (AutoCAD R2000 entity model). */
export const DXF_SCHEMA_VERSION = 'dxf-ac1015-v2' as const;

/** Schema identifier for G-code exports (LinuxCNC / grbl dialect). */
export const GCODE_SCHEMA_VERSION = 'gcode-v1' as const;

/** Schema identifier for BOM CSV exports (ERP-compatible flat format). */
export const BOM_CSV_SCHEMA_VERSION = 'bom-csv-v1' as const;

/** Schema identifier for PDF build-plan exports. */
export const PDF_SCHEMA_VERSION = 'pdf-plan-v1' as const;

/** Schema identifier for JSON project file exports. */
export const PROJECT_JSON_SCHEMA_VERSION = 'project-json-v2' as const;

/** Union of all known export schema version identifiers. */
export type ExportSchemaVersion =
  | typeof DXF_SCHEMA_VERSION
  | typeof GCODE_SCHEMA_VERSION
  | typeof BOM_CSV_SCHEMA_VERSION
  | typeof PDF_SCHEMA_VERSION
  | typeof PROJECT_JSON_SCHEMA_VERSION;

/**
 * Return the schema version for a named export format.
 *
 * @param format - The export format key.
 * @returns The schema version string for that format.
 * @throws RangeError When the format is not recognised.
 */
export function getExportSchemaVersion(
  format: 'dxf' | 'gcode' | 'bom-csv' | 'pdf' | 'project-json',
): ExportSchemaVersion {
  switch (format) {
    case 'dxf':
      return DXF_SCHEMA_VERSION;
    case 'gcode':
      return GCODE_SCHEMA_VERSION;
    case 'bom-csv':
      return BOM_CSV_SCHEMA_VERSION;
    case 'pdf':
      return PDF_SCHEMA_VERSION;
    case 'project-json':
      return PROJECT_JSON_SCHEMA_VERSION;
  }
}

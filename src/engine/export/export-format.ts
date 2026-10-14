/**
 * Sprint 41 — Export format selector engine.
 *
 * Provides a registry of all available export formats and helper functions
 * for filtering, validating, and describing them.
 *
 * Formats registered:
 *   BOM exports  : csv-bom, xlsx-bom, pdf-bom
 *   Cut plans    : svg-cutplan, dxf-cutplan, pdf-cutplan
 *   CNC          : gcode, dxf-parts
 *   ERP          : json-erp, xml-erp
 *   Project      : json-project (full project save)
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormatId =
  | 'csv-bom'
  | 'xlsx-bom'
  | 'pdf-bom'
  | 'svg-cutplan'
  | 'dxf-cutplan'
  | 'pdf-cutplan'
  | 'gcode'
  | 'dxf-parts'
  | 'json-erp'
  | 'xml-erp'
  | 'json-project';

export type ExportCategory = 'bom' | 'cutplan' | 'cnc' | 'erp' | 'project';

export interface ExportFormat {
  id: ExportFormatId;
  category: ExportCategory;
  fileExtension: string;
  mimeType: string;
  name: { en: string; he: string };
  description: { en: string; he: string };
  /** True when this format requires an active CNC profile. */
  requiresCncProfile: boolean;
  /** True when this format requires at least one sheet layout result. */
  requiresCutLayout: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/** Registry of all supported export formats, keyed by {@link ExportFormatId}. */
export const EXPORT_FORMATS: Record<ExportFormatId, ExportFormat> = {
  'csv-bom': {
    id: 'csv-bom',
    category: 'bom',
    fileExtension: '.csv',
    mimeType: 'text/csv',
    name: { en: 'BOM — CSV', he: 'חומרים — CSV' },
    description: { en: 'Bill of materials as a comma-separated file.', he: 'רשימת חומרים בפורמט CSV.' },
    requiresCncProfile: false,
    requiresCutLayout: false,
  },
  'xlsx-bom': {
    id: 'xlsx-bom',
    category: 'bom',
    fileExtension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    name: { en: 'BOM — Excel', he: 'חומרים — Excel' },
    description: { en: 'Bill of materials as an Excel workbook.', he: 'רשימת חומרים כקובץ Excel.' },
    requiresCncProfile: false,
    requiresCutLayout: false,
  },
  'pdf-bom': {
    id: 'pdf-bom',
    category: 'bom',
    fileExtension: '.pdf',
    mimeType: 'application/pdf',
    name: { en: 'BOM — PDF', he: 'חומרים — PDF' },
    description: { en: 'Printable bill of materials.', he: 'רשימת חומרים להדפסה.' },
    requiresCncProfile: false,
    requiresCutLayout: false,
  },
  'svg-cutplan': {
    id: 'svg-cutplan',
    category: 'cutplan',
    fileExtension: '.svg',
    mimeType: 'image/svg+xml',
    name: { en: 'Cut Plan — SVG', he: 'תוכנית חיתוך — SVG' },
    description: { en: 'Vector cut plan diagram (SVG).', he: 'תרשים חיתוך וקטורי (SVG).' },
    requiresCncProfile: false,
    requiresCutLayout: true,
  },
  'dxf-cutplan': {
    id: 'dxf-cutplan',
    category: 'cutplan',
    fileExtension: '.dxf',
    mimeType: 'application/dxf',
    name: { en: 'Cut Plan — DXF', he: 'תוכנית חיתוך — DXF' },
    description: { en: 'DXF cut plan for CAD import.', he: 'תוכנית חיתוך DXF לייבוא CAD.' },
    requiresCncProfile: false,
    requiresCutLayout: true,
  },
  'pdf-cutplan': {
    id: 'pdf-cutplan',
    category: 'cutplan',
    fileExtension: '.pdf',
    mimeType: 'application/pdf',
    name: { en: 'Cut Plan — PDF', he: 'תוכנית חיתוך — PDF' },
    description: { en: 'Printable cut plan PDF.', he: 'PDF תוכנית חיתוך להדפסה.' },
    requiresCncProfile: false,
    requiresCutLayout: true,
  },
  gcode: {
    id: 'gcode',
    category: 'cnc',
    fileExtension: '.nc',
    mimeType: 'text/plain',
    name: { en: 'G-code (CNC)', he: 'G-code (CNC)' },
    description: { en: 'CNC toolpath G-code for router/mill.', he: 'קוד G לנתב CNC.' },
    requiresCncProfile: true,
    requiresCutLayout: true,
  },
  'dxf-parts': {
    id: 'dxf-parts',
    category: 'cnc',
    fileExtension: '.dxf',
    mimeType: 'application/dxf',
    name: { en: 'Parts — DXF', he: 'חלקים — DXF' },
    description: { en: 'Individual part outlines as DXF files.', he: 'קווי מתאר של חלקים בפורמט DXF.' },
    requiresCncProfile: false,
    requiresCutLayout: false,
  },
  'json-erp': {
    id: 'json-erp',
    category: 'erp',
    fileExtension: '.json',
    mimeType: 'application/json',
    name: { en: 'ERP Export — JSON', he: 'ייצוא ERP — JSON' },
    description: { en: 'Structured ERP data as JSON.', he: 'נתוני ERP מובנים כ-JSON.' },
    requiresCncProfile: false,
    requiresCutLayout: false,
  },
  'xml-erp': {
    id: 'xml-erp',
    category: 'erp',
    fileExtension: '.xml',
    mimeType: 'application/xml',
    name: { en: 'ERP Export — XML', he: 'ייצוא ERP — XML' },
    description: { en: 'Structured ERP data as XML.', he: 'נתוני ERP מובנים כ-XML.' },
    requiresCncProfile: false,
    requiresCutLayout: false,
  },
  'json-project': {
    id: 'json-project',
    category: 'project',
    fileExtension: '.cabinet.json',
    mimeType: 'application/json',
    name: { en: 'Project file', he: 'קובץ פרויקט' },
    description: { en: 'Full project save file (JSON).', he: 'שמירת פרויקט מלאה (JSON).' },
    requiresCncProfile: false,
    requiresCutLayout: false,
  },
};

// ─── Core ─────────────────────────────────────────────────────────────────────

/** Return all formats in a given category. */
export function getFormatsByCategory(category: ExportCategory): ExportFormat[] {
  return Object.values(EXPORT_FORMATS).filter((f) => f.category === category);
}

/** Return all formats available given current project state. */
export function getAvailableFormats(hasCutLayout: boolean, hasCncProfile: boolean): ExportFormat[] {
  return Object.values(EXPORT_FORMATS).filter((f) => {
    if (f.requiresCutLayout && !hasCutLayout) return false;
    if (f.requiresCncProfile && !hasCncProfile) return false;
    return true;
  });
}

/** Look up a single format by id. */
export function getExportFormat(id: ExportFormatId): ExportFormat {
  return EXPORT_FORMATS[id];
}

/** Return a human-readable format description. */
export function describeFormat(id: ExportFormatId): string {
  const f = EXPORT_FORMATS[id];
  return `${f.name.en} (${f.fileExtension}) — ${f.description.en}`;
}

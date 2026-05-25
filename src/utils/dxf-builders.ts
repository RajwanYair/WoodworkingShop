/**
 * dxf-builders.ts — Phase 17.3 / E6
 *
 * Extracted from dxf-export.ts: all internal DXF geometry builder functions.
 */
import type { CutRect } from '../engine/types';

/** Build the DXF HEADER section. Appends optional extra `$VAR/value` pairs. */
export function buildDxfHeader(extraVars: string[] = []): string[] {
  return [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$ACADVER',
    '1',
    'AC1015',
    '9',
    '$DWGCODEPAGE',
    '3',
    'ANSI_1252',
    '9',
    '$INSUNITS',
    '70',
    '4', // 4 = millimetres
    '9',
    '$MEASUREMENT',
    '70',
    '1', // 1 = metric
    ...extraVars,
    '0',
    'ENDSEC',
  ];
}

/** Build an empty CLASSES section (required for AC1015+). */
export function buildDxfClasses(): string[] {
  return ['0', 'SECTION', '2', 'CLASSES', '0', 'ENDSEC'];
}

/** Build a full TABLES section with all required sub-tables. */
export function buildDxfTables(layerDefs: Array<[string, number]>): string[] {
  const lines: string[] = ['0', 'SECTION', '2', 'TABLES'];

  // VPORT ΓÇö one active viewport (*Active)
  lines.push('0', 'TABLE', '2', 'VPORT', '70', '1');
  lines.push('0', 'VPORT', '2', '*Active', '70', '0');
  lines.push('0', 'ENDTAB');

  // LTYPE ΓÇö CONTINUOUS line type
  lines.push('0', 'TABLE', '2', 'LTYPE', '70', '1');
  lines.push('0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0');
  lines.push('0', 'ENDTAB');

  // LAYER
  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(layerDefs.length));
  for (const [name, color] of layerDefs) {
    addLayer(lines, name, color);
  }
  lines.push('0', 'ENDTAB');

  // STYLE ΓÇö Standard text style
  lines.push('0', 'TABLE', '2', 'STYLE', '70', '1');
  lines.push(
    '0',
    'STYLE',
    '2',
    'Standard',
    '70',
    '0',
    '40',
    '0.0',
    '41',
    '1.0',
    '50',
    '0.0',
    '71',
    '0',
    '42',
    '0.2',
    '3',
    'arial.shx',
    '4',
    '',
  );
  lines.push('0', 'ENDTAB');

  // VIEW ΓÇö empty
  lines.push('0', 'TABLE', '2', 'VIEW', '70', '0');
  lines.push('0', 'ENDTAB');

  // UCS ΓÇö empty
  lines.push('0', 'TABLE', '2', 'UCS', '70', '0');
  lines.push('0', 'ENDTAB');

  // APPID ΓÇö ACAD application ID (required for R2000+)
  lines.push('0', 'TABLE', '2', 'APPID', '70', '1');
  lines.push('0', 'APPID', '2', 'ACAD', '70', '0');
  lines.push('0', 'ENDTAB');

  // DIMSTYLE ΓÇö Standard dimension style
  lines.push('0', 'TABLE', '2', 'DIMSTYLE', '70', '1');
  lines.push(
    '0',
    'DIMSTYLE',
    '2',
    'Standard',
    '70',
    '0',
    '3',
    '',
    '4',
    '',
    '40',
    '1.0',
    '41',
    '3.0',
    '42',
    '1.0',
    '43',
    '9.0',
    '44',
    '1.0',
    '140',
    '3.0',
    '147',
    '1.0',
    '73',
    '0',
    '74',
    '0',
    '77',
    '0',
    '78',
    '0',
    '170',
    '0',
    '171',
    '2',
    '172',
    '0',
    '173',
    '0',
    '174',
    '0',
    '175',
    '0',
    '176',
    '0',
    '177',
    '0',
    '178',
    '0',
  );
  lines.push('0', 'ENDTAB');

  // BLOCK_RECORD ΓÇö required for R2000+ (references MODEL_SPACE and PAPER_SPACE)
  lines.push('0', 'TABLE', '2', 'BLOCK_RECORD', '70', '2');
  lines.push('0', 'BLOCK_RECORD', '2', '*Model_Space');
  lines.push('0', 'BLOCK_RECORD', '2', '*Paper_Space');
  lines.push('0', 'ENDTAB');

  lines.push('0', 'ENDSEC');
  return lines;
}

/** Build a minimal BLOCKS section (MODEL_SPACE + PAPER_SPACE required in R2000+). */
export function buildDxfBlocks(): string[] {
  return [
    '0',
    'SECTION',
    '2',
    'BLOCKS',
    '0',
    'BLOCK',
    '8',
    '0',
    '2',
    '*Model_Space',
    '70',
    '0',
    '10',
    '0.0',
    '20',
    '0.0',
    '30',
    '0.0',
    '3',
    '*Model_Space',
    '1',
    '',
    '0',
    'ENDBLK',
    '0',
    'BLOCK',
    '8',
    '0',
    '2',
    '*Paper_Space',
    '70',
    '0',
    '10',
    '0.0',
    '20',
    '0.0',
    '30',
    '0.0',
    '3',
    '*Paper_Space',
    '1',
    '',
    '0',
    'ENDBLK',
    '0',
    'ENDSEC',
  ];
}

/** Build a minimal OBJECTS section (required for AC1015+). */
export function buildDxfObjects(): string[] {
  return ['0', 'SECTION', '2', 'OBJECTS', '0', 'DICTIONARY', '3', 'ACAD_GROUP', '350', '0', '0', 'ENDSEC'];
}

/**
 * Add linear DIMENSION entities for a part's width (horizontal) and height
 * (vertical) on the DIMENSIONS layer. Uses AC1015 AcDbAlignedDimension.
 *
 * @param dimOffset  Extra offset (mm) for multi-sheet stacking (y-offset).
 */
export function addPartDimensions(lines: string[], part: CutRect, dimOffset = 0): void {
  const x = part.x;
  const y = part.y + dimOffset;
  const w = part.width;
  const h = part.length;
  const dimGap = 8; // mm between part edge and dimension line

  // ΓöÇΓöÇ Horizontal dimension (width) ΓÇö below the part ΓöÇΓöÇ
  const hdY = y - dimGap; // dimension line y (below, since y grows upward in DXF)
  lines.push(
    '0',
    'DIMENSION',
    '8',
    'DIMENSIONS',
    '2',
    '*Model_Space',
    '10',
    String(x + w),
    '20',
    String(hdY),
    '30',
    '0.0', // def point (2nd ext)
    '11',
    String(x + w / 2),
    '21',
    String(hdY - 3),
    '31',
    '0.0', // text midpoint
    '70',
    '0', // 0 = rotated (horizontal)
    '1',
    '', // empty = auto measurement
    '3',
    'Standard',
    '100',
    'AcDbAlignedDimension',
    '13',
    String(x),
    '23',
    String(y),
    '33',
    '0.0', // 1st ext line origin
    '14',
    String(x + w),
    '24',
    String(y),
    '34',
    '0.0', // 2nd ext line origin
    '50',
    '0.0', // rotation angle = 0┬░ (horizontal)
  );

  // ΓöÇΓöÇ Vertical dimension (height) ΓÇö to the right of the part ΓöÇΓöÇ
  const vdX = x + w + dimGap;
  lines.push(
    '0',
    'DIMENSION',
    '8',
    'DIMENSIONS',
    '2',
    '*Model_Space',
    '10',
    String(vdX),
    '20',
    String(y + h),
    '30',
    '0.0', // def point (2nd ext)
    '11',
    String(vdX + 3),
    '21',
    String(y + h / 2),
    '31',
    '0.0', // text midpoint
    '70',
    '1', // 1 = aligned
    '1',
    '', // empty = auto measurement
    '3',
    'Standard',
    '100',
    'AcDbAlignedDimension',
    '13',
    String(x + w),
    '23',
    String(y),
    '33',
    '0.0', // 1st ext line origin
    '14',
    String(x + w),
    '24',
    String(y + h),
    '34',
    '0.0', // 2nd ext line origin
    '50',
    '90.0', // rotation angle = 90┬░ (vertical)
  );
}

/**
 * Generate a DXF (AutoCAD 2000 / AC1015) string for a cut sheet.
 * Each part is drawn as a LWPOLYLINE rectangle with TEXT label and
 * linear DIMENSION entities for width and height.
 * Sheet outline on layer "SHEET", labels on "LABELS", parts on a
 * per-material layer (e.g. "MAT_PLYWOOD-17").
 * All units are millimeters.
 */

/** Append a LAYER table entry to `lines`. Color is an AutoCAD colour index (1–255). */
export function addLayer(lines: string[], name: string, color: number) {
  lines.push('0', 'LAYER', '2', name, '70', '0', '62', String(color), '6', 'CONTINUOUS');
}

/** Append a closed LWPOLYLINE rectangle to `lines` on the given layer. */
export function addRect(lines: string[], x: number, y: number, w: number, h: number, layer: string) {
  lines.push(
    '0',
    'LWPOLYLINE',
    '8',
    layer,
    '90',
    '4', // vertex count
    '70',
    '1', // closed polyline
    '10',
    String(x),
    '20',
    String(y),
    '10',
    String(x + w),
    '20',
    String(y),
    '10',
    String(x + w),
    '20',
    String(y + h),
    '10',
    String(x),
    '20',
    String(y + h),
  );
}

/** Append a TEXT label for a cut part (label text = part label or index). */
export function addLabel(lines: string[], part: CutRect, layer: string) {
  const cx = part.x + part.width / 2;
  const cy = part.y + part.length / 2;
  const fontSize = Math.min(20, Math.min(part.width, part.length) * 0.25);
  lines.push(
    '0',
    'TEXT',
    '8',
    layer,
    '10',
    String(cx),
    '20',
    String(cy),
    '30',
    '0',
    '40',
    String(fontSize), // text height
    '1',
    `${part.partId} ${part.width}x${part.length}`,
    '72',
    '1', // horizontal center
    '73',
    '2', // vertical center
    '11',
    String(cx),
    '21',
    String(cy),
    '31',
    '0',
  );
}

/** Trigger DXF download for a single sheet, embedding a SHA-256 checksum comment. */

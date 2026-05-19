import type { Part, HardwareItem, Lang } from '../engine/types';
import { getMaterial, computePartWeightKg } from '../engine/materials';
import { triggerDownload } from './download';

/**
 * Generate a full Bill of Materials CSV for all cabinets in the project.
 */
export function generateBomCsv(
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[]; notes?: string }[],
  lang: Lang,
): string {
  const rows: string[] = [];

  // ── File metadata header ───────────────────────────────────────────────────
  const generatedAt = new Date().toISOString();
  const totalParts = cabinets.reduce((sum, c) => sum + c.parts.reduce((s, p) => s + p.qty, 0), 0);
  const totalHardware = cabinets.reduce((sum, c) => sum + c.hardware.reduce((s, h) => s + h.qty, 0), 0);
  rows.push(csvRow(['# Cabinet Planner BOM Export', '', '', '', '', '', '', '', '', '', '']));
  rows.push(csvRow([`# Version: ${__APP_VERSION__}  Schema: bom-csv-v1`, '', '', '', '', '', '', '', '', '', '']));
  rows.push(csvRow([`# Generated: ${generatedAt}`, '', '', '', '', '', '', '', '', '', '']));
  rows.push(csvRow([`# Cabinets: ${cabinets.length}  Parts: ${totalParts}  Hardware: ${totalHardware}`, '', '', '', '', '', '', '', '', '', '']));
  rows.push('');

  // ── Material area summary section ─────────────────────────────────────────
  // Group all parts across all cabinets by material key and total their area.
  const areaMm2ByMat = new Map<string, number>();
  const weightKgByMat = new Map<string, number>(); // Sprint 162
  for (const cab of cabinets) {
    for (const p of cab.parts) {
      const area = p.qty * p.length * p.width;
      areaMm2ByMat.set(p.material, (areaMm2ByMat.get(p.material) ?? 0) + area);
      // Sprint 162: accumulate weight
      try {
        const density = getMaterial(p.material).densityKgM3;
        const wKg = computePartWeightKg(p.length, p.width, p.thickness, p.qty, density);
        weightKgByMat.set(p.material, (weightKgByMat.get(p.material) ?? 0) + wKg);
      } catch {
        /* unknown material — skip */
      }
    }
  }
  rows.push('Material Summary,,,,,,,,,,');
  rows.push('Material,Total Area (m²),Board-Feet (nominal 1 inch),Weight (kg),,,,,,,');
  for (const [matKey, areaMm2] of areaMm2ByMat) {
    const matName = safeGetMaterialName(matKey, lang);
    const areaM2 = (areaMm2 / 1e6).toFixed(3);
    const boardFeet = ((areaMm2 * 1.076391e-5) / 1).toFixed(2);
    const weightKg = (weightKgByMat.get(matKey) ?? 0).toFixed(2);
    rows.push(csvRow([matName, areaM2, boardFeet, weightKg, '', '', '', '', '', '', '']));
  }
  rows.push('');

  // Header
  rows.push(
    'Cabinet,Part ID,Part Name,Qty,Material,Thickness (mm),Length (mm),Width (mm),Edge Banding,Weight (kg),Grain Direction',
  );

  const isMultiCabinet = cabinets.length > 1;

  // Parts section
  for (let cabIdx = 0; cabIdx < cabinets.length; cabIdx++) {
    const cab = cabinets[cabIdx];
    // Sprint 135 — emit cabinet notes as a comment row if present
    if (cab.notes && cab.notes.trim()) {
      rows.push(csvRow([`# ${cab.name} notes: ${cab.notes.trim()}`, '', '', '', '', '', '', '', '', '', '']));
    }
    for (const p of cab.parts) {
      const matName = safeGetMaterialName(p.material, lang);
      let partWeight = '';
      try {
        const density = getMaterial(p.material).densityKgM3;
        partWeight = computePartWeightKg(p.length, p.width, p.thickness, p.qty, density).toFixed(3);
      } catch {
        /* skip */
      }
      // Sprint 167 — grain direction: 'Along length' for grain materials, '—' otherwise
      let grainDir = '\u2014';
      try {
        grainDir = getMaterial(p.material).hasGrain ? 'Along length' : '\u2014';
      } catch {
        /* skip */
      }
      // Sprint 20 — prefix Part ID with cabinet index in multi-cabinet BOMs
      const partId = isMultiCabinet ? `C${cabIdx + 1}-${p.id}` : p.id;
      rows.push(
        csvRow([
          cab.name,
          partId,
          p.name[lang],
          String(p.qty),
          matName,
          String(p.thickness),
          String(p.length),
          String(p.width),
          p.edgeBanding[lang],
          partWeight,
          grainDir,
        ]),
      );
    }
  }

  // Blank separator + hardware section
  rows.push('');
  rows.push('Cabinet,Hardware ID,Hardware Name,Qty,Unit,,,,,, ');
  for (const cab of cabinets) {
    for (const hw of cab.hardware) {
      rows.push(csvRow([cab.name, hw.id, hw.name[lang], String(hw.qty), hw.unit[lang], '', '', '', '', '', '']));
    }
  }

  return rows.join('\n');
}

function safeGetMaterialName(key: string, lang: Lang): string {
  try {
    return getMaterial(key).name[lang];
  } catch {
    return key;
  }
}

function csvRow(fields: string[]): string {
  return fields
    .map((f) => {
      if (f.includes(',') || f.includes('"') || f.includes('\n')) {
        return `"${f.replace(/"/g, '""')}"`;
      }
      return f;
    })
    .join(',');
}

export function downloadBomCsv(
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[]; notes?: string }[],
  lang: Lang,
  filename = 'bill-of-materials.csv',
) {
  const csv = generateBomCsv(cabinets, lang);
  triggerDownload('\uFEFF' + csv, 'text/csv;charset=utf-8', filename);
}

/**
 * Sprint 137 — standalone hardware-only CSV for procurement.
 * Aggregates quantities across all cabinets so the buyer sees a single
 * consolidated shopping list.
 */
export function generateHardwareCsv(cabinets: { name: string; hardware: HardwareItem[] }[], lang: Lang): string {
  const rows: string[] = [];
  rows.push('Hardware ID,Hardware Name,Cabinet,Qty,Unit');
  for (const cab of cabinets) {
    for (const hw of cab.hardware) {
      rows.push(csvRow([hw.id, hw.name[lang], cab.name, String(hw.qty), hw.unit[lang]]));
    }
  }
  return rows.join('\n');
}

export function downloadHardwareCsv(
  cabinets: { name: string; hardware: HardwareItem[] }[],
  lang: Lang,
  filename = 'hardware-list.csv',
) {
  const csv = generateHardwareCsv(cabinets, lang);
  triggerDownload('\uFEFF' + csv, 'text/csv;charset=utf-8', filename);
}

// ── ERP / MRP / CAM normalised export (Phase 6) ───────────────────────────
// Schema version pinned so downstream systems can detect changes.
const ERP_SCHEMA_VERSION = '1';

/**
 * Generate a normalised, machine-readable CSV intended for ERP/MRP/CAM ingestion.
 * Column names are stable snake_case identifiers; no localised text in data cells.
 * Grain direction is encoded as the enum string 'along_length' | 'none'.
 */
export function generateErpCsv(
  cabinets: { name: string; parts: Part[] }[],
  meta?: { projectName?: string; revision?: string },
): string {
  const rows: string[] = [];

  // ── File header (comment rows, stripped by most ERP importers) ────────────
  rows.push(erpRow(['#schema', `bom-erp-csv-v${ERP_SCHEMA_VERSION}`]));
  rows.push(erpRow(['#generated', new Date().toISOString()]));
  if (meta?.projectName) rows.push(erpRow(['#project', meta.projectName]));
  if (meta?.revision) rows.push(erpRow(['#revision', meta.revision]));

  // ── Column header ─────────────────────────────────────────────────────────
  rows.push(
    erpRow([
      'part_no',
      'cabinet',
      'description',
      'qty',
      'material_key',
      'material_name_en',
      'thickness_mm',
      'length_mm',
      'width_mm',
      'area_m2',
      'grain_direction',
      'unit_weight_kg',
      'total_weight_kg',
    ]),
  );

  const isMultiCabinet = cabinets.length > 1;

  for (let ci = 0; ci < cabinets.length; ci++) {
    const cab = cabinets[ci];
    for (const p of cab.parts) {
      const areaM2 = ((p.qty * p.length * p.width) / 1e6).toFixed(4);
      const partNo = isMultiCabinet ? `C${ci + 1}-${p.id}` : p.id;

      let matNameEn = p.material;
      let grainDirection = 'none';
      let unitWeightKg = '';
      let totalWeightKg = '';
      try {
        const mat = getMaterial(p.material);
        matNameEn = mat.name.en;
        grainDirection = mat.hasGrain ? 'along_length' : 'none';
        const uW = computePartWeightKg(p.length, p.width, p.thickness, 1, mat.densityKgM3);
        unitWeightKg = uW.toFixed(4);
        totalWeightKg = (uW * p.qty).toFixed(4);
      } catch {
        /* unknown material — leave weight blank */
      }

      rows.push(
        erpRow([
          partNo,
          cab.name,
          p.name.en,
          String(p.qty),
          p.material,
          matNameEn,
          String(p.thickness),
          String(p.length),
          String(p.width),
          areaM2,
          grainDirection,
          unitWeightKg,
          totalWeightKg,
        ]),
      );
    }
  }

  return rows.join('\n');
}

export function downloadErpCsv(
  cabinets: { name: string; parts: Part[] }[],
  meta?: { projectName?: string; revision?: string },
  filename = 'bom-erp.csv',
) {
  const csv = generateErpCsv(cabinets, meta);
  triggerDownload('\uFEFF' + csv, 'text/csv;charset=utf-8', filename);
}

/** Minimal CSV row encoder for ERP output (no blank padding). */
function erpRow(fields: string[]): string {
  return fields
    .map((f) => {
      if (f.includes(',') || f.includes('"') || f.includes('\n')) {
        return `"${f.replace(/"/g, '""')}"`;
      }
      return f;
    })
    .join(',');
}

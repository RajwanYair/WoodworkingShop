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
      } catch { /* unknown material — skip */ }
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
  rows.push('Cabinet,Part ID,Part Name,Qty,Material,Thickness (mm),Length (mm),Width (mm),Edge Banding,Weight (kg),Grain Direction');

  // Parts section
  for (const cab of cabinets) {
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
      } catch { /* skip */ }
      // Sprint 167 — grain direction: 'Along length' for grain materials, '—' otherwise
      let grainDir = '\u2014';
      try {
        grainDir = getMaterial(p.material).hasGrain ? 'Along length' : '\u2014';
      } catch { /* skip */ }
      rows.push(
        csvRow([
          cab.name,
          p.id,
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
export function generateHardwareCsv(
  cabinets: { name: string; hardware: HardwareItem[] }[],
  lang: Lang,
): string {
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

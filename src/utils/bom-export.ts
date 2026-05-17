import type { Part, HardwareItem, Lang } from '../engine/types';
import { getMaterial } from '../engine/materials';
import { triggerDownload } from './download';

/**
 * Generate a full Bill of Materials CSV for all cabinets in the project.
 */
export function generateBomCsv(
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[] }[],
  lang: Lang,
): string {
  const rows: string[] = [];

  // ── Material area summary section ─────────────────────────────────────────
  // Group all parts across all cabinets by material key and total their area.
  const areaMm2ByMat = new Map<string, number>();
  for (const cab of cabinets) {
    for (const p of cab.parts) {
      const area = p.qty * p.length * p.width;
      areaMm2ByMat.set(p.material, (areaMm2ByMat.get(p.material) ?? 0) + area);
    }
  }
  rows.push('Material Summary,,,,,,,,');
  rows.push('Material,Total Area (m²),Board-Feet (nominal 1 inch),,,,,,');
  for (const [matKey, areaMm2] of areaMm2ByMat) {
    const matName = safeGetMaterialName(matKey, lang);
    const areaM2 = (areaMm2 / 1e6).toFixed(3);
    // 1 mm² = 1.076391e-5 ft²; board-feet = ft² (at nominal 1 inch thickness)
    const boardFeet = ((areaMm2 * 1.076391e-5) / 1).toFixed(2);
    rows.push(csvRow([matName, areaM2, boardFeet, '', '', '', '', '', '']));
  }
  rows.push('');

  // Header
  rows.push('Cabinet,Part ID,Part Name,Qty,Material,Thickness (mm),Length (mm),Width (mm),Edge Banding');

  // Parts section
  for (const cab of cabinets) {
    for (const p of cab.parts) {
      const matName = safeGetMaterialName(p.material, lang);
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
        ]),
      );
    }
  }

  // Blank separator + hardware section
  rows.push('');
  rows.push('Cabinet,Hardware ID,Hardware Name,Qty,Unit,,,, ');
  for (const cab of cabinets) {
    for (const hw of cab.hardware) {
      rows.push(csvRow([cab.name, hw.id, hw.name[lang], String(hw.qty), hw.unit[lang], '', '', '', '']));
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
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[] }[],
  lang: Lang,
  filename = 'bill-of-materials.csv',
) {
  const csv = generateBomCsv(cabinets, lang);
  triggerDownload('\uFEFF' + csv, 'text/csv;charset=utf-8', filename);
}

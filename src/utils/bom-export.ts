import type { Part, HardwareItem, Lang } from '../engine/types';
import { getMaterial } from '../engine/materials';

interface BomRow {
  cabinet: string;
  partId: string;
  name: string;
  qty: number;
  material: string;
  thickness: number;
  length: number;
  width: number;
  edgeBanding: string;
}

/**
 * Generate a full Bill of Materials CSV for all cabinets in the project.
 */
export function generateBomCsv(
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[] }[],
  lang: Lang,
): string {
  const rows: string[] = [];

  // Header
  rows.push('Cabinet,Part ID,Part Name,Qty,Material,Thickness (mm),Length (mm),Width (mm),Edge Banding');

  // Parts section
  for (const cab of cabinets) {
    for (const p of cab.parts) {
      const matName = safeGetMaterialName(p.material, lang);
      rows.push(csvRow([
        cab.name,
        p.id,
        p.name[lang],
        String(p.qty),
        matName,
        String(p.thickness),
        String(p.length),
        String(p.width),
        p.edgeBanding[lang],
      ]));
    }
  }

  // Blank separator + hardware section
  rows.push('');
  rows.push('Cabinet,Hardware ID,Hardware Name,Qty,Unit,,,, ');
  for (const cab of cabinets) {
    for (const hw of cab.hardware) {
      rows.push(csvRow([
        cab.name,
        hw.id,
        hw.name[lang],
        String(hw.qty),
        hw.unit[lang],
        '', '', '', '',
      ]));
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
  return fields.map(f => {
    if (f.includes(',') || f.includes('"') || f.includes('\n')) {
      return `"${f.replace(/"/g, '""')}"`;
    }
    return f;
  }).join(',');
}

export function downloadBomCsv(
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[] }[],
  lang: Lang,
  filename = 'bill-of-materials.csv',
) {
  const csv = generateBomCsv(cabinets, lang);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

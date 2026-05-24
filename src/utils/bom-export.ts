import type { Part, HardwareItem, Lang, Material } from '../engine/types';
import { getMaterial, computePartWeightKg } from '../engine/materials';
import { triggerDownload } from './download';

// ── Sprint 15 — Localized BOM column headers ──────────────────────────────────

interface BomHeaders {
  materialSummary: string;
  matCol: string;
  areaCol: string;
  boardFeetCol: string;
  weightCol: string;
  /** Phase 13 / Sprint 18 — price per sheet column header */
  pricePerSheetCol: string;
  /** Phase 13 / Sprint 18 — estimated material cost column header */
  estCostCol: string;
  partsHeader: string;
  hwHeader: string;
  grainAlong: string;
}

const BOM_HEADERS: Record<string, BomHeaders> = {
  en: {
    materialSummary: 'Material Summary',
    matCol: 'Material',
    areaCol: 'Total Area (m\u00b2)',
    boardFeetCol: 'Board-Feet (nominal 1 inch)',
    weightCol: 'Weight (kg)',
    pricePerSheetCol: 'Price/Sheet',
    estCostCol: 'Est. Material Cost',
    partsHeader:
      '#,Cabinet,Part ID,Part Name,Qty,Material,Thickness (mm),Length (mm),Width (mm),Area (m\u00b2),Edge Banding,Weight (kg),Grain Direction',
    hwHeader: '#,Cabinet,Hardware ID,Hardware Name,Qty,Unit',
    grainAlong: 'Along length',
  },
  he: {
    materialSummary: '\u05e1\u05d9\u05db\u05d5\u05dd \u05d7\u05d5\u05de\u05e8\u05d9\u05dd',
    matCol: '\u05d7\u05d5\u05de\u05e8',
    areaCol: '\u05e9\u05d8\u05d7 \u05db\u05d5\u05dc\u05dc (m\u00b2)',
    boardFeetCol: '\u05e8\u05d2\u05dc\u05d9 \u05dc\u05d5\u05d7',
    weightCol: '\u05de\u05e9\u05e7\u05dc (kg)',
    pricePerSheetCol: '\u05de\u05d7\u05d9\u05e8/\u05d2\u05d9\u05dc\u05d9\u05d5\u05df',
    estCostCol: '\u05e2\u05dc\u05d5\u05ea \u05d7\u05d5\u05de\u05e8\u05d9\u05dd \u05de\u05e9\u05d5\u05e2\u05e8\u05ea',
    partsHeader:
      '#,\u05d0\u05e8\u05d5\u05df,\u05de\u05d6\u05d4\u05d4,\u05e9\u05dd \u05d7\u05dc\u05e7,\u05db\u05de\u05d5\u05ea,\u05d7\u05d5\u05de\u05e8,\u05e2\u05d5\u05d1\u05d9 (\u05de"\u05de),\u05d0\u05d5\u05e8\u05da (\u05de"\u05de),\u05e8\u05d5\u05d7\u05d1 (\u05de"\u05de),\u05e9\u05d8\u05d7 (m\u00b2),\u05d7\u05d9\u05d6\u05d5\u05e7 \u05e7\u05e6\u05d5\u05ea,\u05de\u05e9\u05e7\u05dc (kg),\u05db\u05d9\u05d5\u05d5\u05df \u05d2\u05d9\u05d3',
    hwHeader:
      '#,\u05d0\u05e8\u05d5\u05df,\u05de\u05d6\u05d4\u05d4,\u05e9\u05dd \u05d7\u05d5\u05de\u05e8\u05d4,\u05db\u05de\u05d5\u05ea,\u05d9\u05d7\u05d9\u05d3\u05d4',
    grainAlong: '\u05dc\u05d0\u05d5\u05e8\u05da \u05d4\u05d2\u05d9\u05d3',
  },
  es: {
    materialSummary: 'Resumen de materiales',
    matCol: 'Material',
    areaCol: '\u00c1rea total (m\u00b2)',
    boardFeetCol: 'Pies tabla (1 pulgada nominal)',
    weightCol: 'Peso (kg)',
    pricePerSheetCol: 'Precio/Hoja',
    estCostCol: 'Coste material est.',
    partsHeader:
      '#,Armario,ID Pieza,Nombre pieza,Cant.,Material,Espesor (mm),Largo (mm),Ancho (mm),\u00c1rea (m\u00b2),Canteado,Peso (kg),Direcci\u00f3n veta',
    hwHeader: '#,Armario,ID Herraje,Nombre herraje,Cant.,Unidad',
    grainAlong: 'A lo largo',
  },
  de: {
    materialSummary: 'Materialzusammenfassung',
    matCol: 'Material',
    areaCol: 'Gesamtfl\u00e4che (m\u00b2)',
    boardFeetCol: 'Brettfu\u00df (nominal 1 Zoll)',
    weightCol: 'Gewicht (kg)',
    pricePerSheetCol: 'Preis/Platte',
    estCostCol: 'Gesch\u00e4tzter Materialpreis',
    partsHeader:
      '#,Korpus,Teile-ID,Teilename,Menge,Material,Dicke (mm),L\u00e4nge (mm),Breite (mm),Fl\u00e4che (m\u00b2),Kantenanleimer,Gewicht (kg),Faserrichtung',
    hwHeader: '#,Korpus,Beschlag-ID,Beschlagname,Menge,Einheit',
    grainAlong: 'L\u00e4ngs der Faser',
  },
  fr: {
    materialSummary: 'R\u00e9sum\u00e9 mat\u00e9riaux',
    matCol: 'Mat\u00e9riau',
    areaCol: 'Surface totale (m\u00b2)',
    boardFeetCol: 'Pieds-planche (nominal 1 pouce)',
    weightCol: 'Poids (kg)',
    pricePerSheetCol: 'Prix/Feuille',
    estCostCol: 'Co\u00fbt mat\u00e9riaux est.',
    partsHeader:
      '#,Meuble,ID Pi\u00e8ce,Nom pi\u00e8ce,Qte,Mat\u00e9riau,\u00c9paisseur (mm),Longueur (mm),Largeur (mm),Surface (m\u00b2),Chant,Poids (kg),Sens du fil',
    hwHeader: '#,Meuble,ID Quincaillerie,Nom quincaillerie,Qte,Unit\u00e9',
    grainAlong: 'Dans la longueur',
  },
  ar: {
    materialSummary: '\u0645\u0644\u062e\u0635 \u0627\u0644\u0645\u0648\u0627\u062f',
    matCol: '\u0627\u0644\u0645\u0627\u062f\u0629',
    areaCol: '\u0627\u0644\u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u0643\u0644\u064a\u0629 (m\u00b2)',
    boardFeetCol: '\u0623\u0642\u062f\u0627\u0645 \u0644\u0648\u062d',
    weightCol: '\u0627\u0644\u0648\u0632\u0646 (kg)',
    pricePerSheetCol: '\u0633\u0639\u0631/\u0644\u0648\u062d',
    estCostCol:
      '\u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u0645\u0642\u062f\u0631\u0629',
    partsHeader:
      '#,\u062e\u0632\u0627\u0646\u0629,\u0645\u0639\u0631\u0641 \u0627\u0644\u062c\u0632\u0621,\u0627\u0633\u0645 \u0627\u0644\u062c\u0632\u0621,\u0627\u0644\u0643\u0645\u064a\u0629,\u0627\u0644\u0645\u0627\u062f\u0629,\u0627\u0644\u0633\u0645\u0643 (mm),\u0627\u0644\u0637\u0648\u0644 (mm),\u0627\u0644\u0639\u0631\u0636 (mm),\u0627\u0644\u0645\u0633\u0627\u062d\u0629 (m\u00b2),\u062a\u0634\u0637\u064a\u0628 \u0627\u0644\u062d\u0648\u0627\u0641,\u0627\u0644\u0648\u0632\u0646 (kg),\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u062d\u0628\u0648\u0628',
    hwHeader:
      '#,\u062e\u0632\u0627\u0646\u0629,\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u062a\u0627\u062f,\u0627\u0633\u0645 \u0627\u0644\u0639\u062a\u0627\u062f,\u0627\u0644\u0643\u0645\u064a\u0629,\u0627\u0644\u0648\u062d\u062f\u0629',
    grainAlong: '\u0628\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u062d\u0628\u0648\u0628',
  },
};

function getBomHeaders(locale: string): BomHeaders {
  return BOM_HEADERS[locale] ?? BOM_HEADERS['en'];
}

/** Phase 13 / Sprint 18 — safe material lookup; returns undefined instead of throwing. */
function safeGetMaterialData(key: string): Material | undefined {
  try {
    return getMaterial(key);
  } catch {
    return undefined;
  }
}

/**
 * Phase 13 / Sprint 18 — Format a monetary amount using the Intl API.
 * Falls back to plain toFixed(2) if the currency code is invalid.
 */
function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

/**
 * Generate a full Bill of Materials CSV for all cabinets in the project.
 *
 * @param cabinets  List of cabinet entries with parts and hardware.
 * @param lang      Engine language for part/material names ('en' | 'he').
 * @param locale    Full i18next locale code used for column header translation.
 *                  Defaults to `lang`. Supports 'en', 'he', 'es', 'de', 'fr', 'ar'.
 */
export function generateBomCsv(
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[]; notes?: string }[],
  lang: Lang,
  locale?: string,
): string {
  const h = getBomHeaders(locale ?? lang);
  const rows: string[] = [];

  // ── File metadata header ───────────────────────────────────────────────────
  const generatedAt = new Date().toISOString();
  const totalParts = cabinets.reduce((sum, c) => sum + c.parts.reduce((s, p) => s + p.qty, 0), 0);
  const totalHardware = cabinets.reduce((sum, c) => sum + c.hardware.reduce((s, h) => s + h.qty, 0), 0);
  rows.push(csvRow(['# Cabinet Planner BOM Export', '', '', '', '', '', '', '', '', '', '']));
  rows.push(csvRow([`# Version: ${__APP_VERSION__}  Schema: bom-csv-v1`, '', '', '', '', '', '', '', '', '', '']));
  rows.push(csvRow([`# Generated: ${generatedAt}`, '', '', '', '', '', '', '', '', '', '']));
  rows.push(
    csvRow([
      `# Cabinets: ${cabinets.length}  Parts: ${totalParts}  Hardware: ${totalHardware}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]),
  );
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
  rows.push(`${h.materialSummary},,,,,,,,,,,,`);
  rows.push(`${h.matCol},${h.areaCol},${h.boardFeetCol},${h.weightCol},${h.pricePerSheetCol},${h.estCostCol},,,,,`);
  for (const [matKey, areaMm2] of areaMm2ByMat) {
    const matName = safeGetMaterialName(matKey, lang);
    const areaM2 = (areaMm2 / 1e6).toFixed(3);
    const boardFeet = ((areaMm2 * 1.076391e-5) / 1).toFixed(2);
    const weightKg = (weightKgByMat.get(matKey) ?? 0).toFixed(2);

    // Phase 13 / Sprint 18 — currency-aware cost columns
    let priceStr = '\u2014';
    let estCostStr = '\u2014';
    const matData = safeGetMaterialData(matKey);
    if (matData?.pricePerSheet !== undefined && matData.currencyCode) {
      const sheetAreaMm2 = matData.sheetWidth * matData.sheetLength;
      const sheetsNeeded = Math.ceil(areaMm2 / sheetAreaMm2);
      const resolvedLocale = locale ?? lang;
      priceStr = formatCurrency(matData.pricePerSheet, matData.currencyCode, resolvedLocale);
      estCostStr = formatCurrency(matData.pricePerSheet * sheetsNeeded, matData.currencyCode, resolvedLocale);
    }

    rows.push(csvRow([matName, areaM2, boardFeet, weightKg, priceStr, estCostStr, '', '', '', '', '']));
  }
  rows.push('');

  // Parts header
  rows.push(h.partsHeader);

  const isMultiCabinet = cabinets.length > 1;
  let partRowNum = 0;

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
      // Sprint 167 — grain direction
      let grainDir = '\u2014';
      try {
        grainDir = getMaterial(p.material).hasGrain ? h.grainAlong : '\u2014';
      } catch {
        /* skip */
      }
      // Sprint 20 — prefix Part ID with cabinet index in multi-cabinet BOMs
      const partId = isMultiCabinet ? `C${cabIdx + 1}-${p.id}` : p.id;
      partRowNum += 1;
      // Sprint 87 — part face area in m²
      const partArea = ((p.length * p.width * p.qty) / 1_000_000).toFixed(6);
      rows.push(
        csvRow([
          String(partRowNum),
          cab.name,
          partId,
          p.name[lang],
          String(p.qty),
          matName,
          String(p.thickness),
          String(p.length),
          String(p.width),
          partArea,
          p.edgeBanding[lang],
          partWeight,
          grainDir,
        ]),
      );
    }
  }

  // Blank separator + hardware section
  rows.push('');
  // Hardware header
  rows.push(`${h.hwHeader},,,,, `);
  let hwRowNum = 0;
  for (const cab of cabinets) {
    for (const hw of cab.hardware) {
      hwRowNum += 1;
      rows.push(
        csvRow([
          String(hwRowNum),
          cab.name,
          hw.id,
          hw.name[lang],
          String(hw.qty),
          hw.unit[lang],
          '',
          '',
          '',
          '',
          '',
          '',
        ]),
      );
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
  locale?: string,
) {
  const csv = generateBomCsv(cabinets, lang, locale);
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

/** Minimal CSV row encoder for ERP output — delegates to shared csvRow. */
function erpRow(fields: string[]): string {
  return csvRow(fields);
}

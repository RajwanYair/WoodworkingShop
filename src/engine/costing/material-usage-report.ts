/**
 * Material Usage Report — Sprint 187
 *
 * Analyzes material consumption across a project's parts,
 * computes waste percentages, cost breakdown by material,
 * and generates summary data for reporting.
 */

/** A part with material assignment and dimensions. */
export interface UsagePart {
  readonly partId: string;
  readonly label: string;
  readonly material: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly thicknessMm: number;
  readonly quantity: number;
}

/** Sheet stock used for cutting. */
export interface SheetStock {
  readonly material: string;
  readonly sheetWidthMm: number;
  readonly sheetHeightMm: number;
  readonly thicknessMm: number;
  /** Cost per full sheet. */
  readonly costPerSheet: number;
}

/** Per-material usage breakdown. */
export interface MaterialUsage {
  readonly material: string;
  /** Total part area in mm². */
  readonly partAreaMm2: number;
  /** Total sheet area consumed in mm². */
  readonly sheetAreaMm2: number;
  /** Number of sheets required. */
  readonly sheetsRequired: number;
  /** Waste area in mm². */
  readonly wasteAreaMm2: number;
  /** Waste as percentage of total sheet area. */
  readonly wastePercent: number;
  /** Total cost based on sheets required. */
  readonly totalCost: number;
  /** Number of parts using this material. */
  readonly partCount: number;
  /** Total volume in mm³. */
  readonly volumeMm3: number;
}

/** Full usage report result. */
export interface UsageReport {
  readonly materials: readonly MaterialUsage[];
  readonly totalPartAreaMm2: number;
  readonly totalSheetAreaMm2: number;
  readonly totalWasteAreaMm2: number;
  readonly overallWastePercent: number;
  readonly totalCost: number;
  readonly totalPartCount: number;
  readonly totalSheetsRequired: number;
}

/**
 * Generate a material usage report for a set of parts against available stock.
 *
 * @param parts - Parts with material assignments and dimensions.
 * @param stock - Available sheet stock definitions.
 * @throws {RangeError} If a part references a material not in stock.
 * @throws {RangeError} If any dimension is non-positive.
 */
export function generateUsageReport(parts: readonly UsagePart[], stock: readonly SheetStock[]): UsageReport {
  if (parts.length === 0) {
    return {
      materials: [],
      totalPartAreaMm2: 0,
      totalSheetAreaMm2: 0,
      totalWasteAreaMm2: 0,
      overallWastePercent: 0,
      totalCost: 0,
      totalPartCount: 0,
      totalSheetsRequired: 0,
    };
  }

  const stockMap = new Map(stock.map((s) => [s.material, s]));

  for (const part of parts) {
    if (!stockMap.has(part.material)) {
      throw new RangeError(`unknown material: "${part.material}"`);
    }
    if (part.widthMm <= 0 || part.heightMm <= 0 || part.thicknessMm <= 0) {
      throw new RangeError(`part "${part.partId}" has non-positive dimensions`);
    }
    if (part.quantity <= 0) {
      throw new RangeError(`part "${part.partId}" has non-positive quantity`);
    }
  }

  const grouped = new Map<string, UsagePart[]>();
  for (const part of parts) {
    const existing = grouped.get(part.material) ?? [];
    existing.push(part);
    grouped.set(part.material, existing);
  }

  const materials: MaterialUsage[] = [];

  for (const [material, materialParts] of grouped) {
    const sheet = stockMap.get(material)!;
    const sheetArea = sheet.sheetWidthMm * sheet.sheetHeightMm;

    let totalPartArea = 0;
    let totalVolume = 0;
    let partCount = 0;

    for (const part of materialParts) {
      const area = part.widthMm * part.heightMm * part.quantity;
      totalPartArea += area;
      totalVolume += area * part.thicknessMm;
      partCount += part.quantity;
    }

    const sheetsRequired = Math.ceil(totalPartArea / sheetArea);
    const totalSheetArea = sheetsRequired * sheetArea;
    const wasteArea = totalSheetArea - totalPartArea;
    const wastePercent = totalSheetArea > 0 ? Math.round((wasteArea / totalSheetArea) * 10000) / 100 : 0;
    const totalCost = sheetsRequired * sheet.costPerSheet;

    materials.push({
      material,
      partAreaMm2: totalPartArea,
      sheetAreaMm2: totalSheetArea,
      sheetsRequired,
      wasteAreaMm2: wasteArea,
      wastePercent,
      totalCost: Math.round(totalCost * 100) / 100,
      partCount,
      volumeMm3: totalVolume,
    });
  }

  materials.sort((a, b) => b.totalCost - a.totalCost);

  const totalPartAreaMm2 = materials.reduce((s, m) => s + m.partAreaMm2, 0);
  const totalSheetAreaMm2 = materials.reduce((s, m) => s + m.sheetAreaMm2, 0);
  const totalWasteAreaMm2 = materials.reduce((s, m) => s + m.wasteAreaMm2, 0);
  const overallWastePercent =
    totalSheetAreaMm2 > 0 ? Math.round((totalWasteAreaMm2 / totalSheetAreaMm2) * 10000) / 100 : 0;
  const totalCost = materials.reduce((s, m) => s + m.totalCost, 0);
  const totalPartCount = materials.reduce((s, m) => s + m.partCount, 0);
  const totalSheetsRequired = materials.reduce((s, m) => s + m.sheetsRequired, 0);

  return {
    materials,
    totalPartAreaMm2,
    totalSheetAreaMm2,
    totalWasteAreaMm2,
    overallWastePercent,
    totalCost: Math.round(totalCost * 100) / 100,
    totalPartCount,
    totalSheetsRequired,
  };
}

/**
 * Compute cost per square metre for a material based on sheet stock.
 */
export function costPerSquareMetre(sheet: SheetStock): number {
  const sheetAreaM2 = (sheet.sheetWidthMm * sheet.sheetHeightMm) / 1000000;
  if (sheetAreaM2 <= 0) return 0;
  return Math.round((sheet.costPerSheet / sheetAreaM2) * 100) / 100;
}

/**
 * Find the most wasteful material in a report.
 */
export function mostWastefulMaterial(report: UsageReport): MaterialUsage | undefined {
  if (report.materials.length === 0) return undefined;
  return report.materials.reduce((max, m) => (m.wastePercent > max.wastePercent ? m : max));
}

/**
 * Find the most expensive material in a report.
 */
export function mostExpensiveMaterial(report: UsageReport): MaterialUsage | undefined {
  if (report.materials.length === 0) return undefined;
  return report.materials.reduce((max, m) => (m.totalCost > max.totalCost ? m : max));
}

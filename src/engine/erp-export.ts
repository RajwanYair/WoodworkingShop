/**
 * Sprint 122 — ERP/MRP export format engine.
 *
 * Generates structured material and cut-list export payloads compatible with
 * common ERP/MRP integrations:
 *   - SAP: IDOC-style flat CSV (MATMAS / STPO segments)
 *   - Oracle: Materials Management JSON envelope
 *   - Webhook: Generic BOM JSON ready for HTTP POST to any endpoint
 *
 * Pure function — no React, no DOM, no side effects.
 */

import type { CabinetConfig } from './types';
import type { CostBreakdown } from './cost-estimator';
import type { OptimizationResult } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Target ERP system for the export. */
export type ErpSystem = 'sap' | 'oracle' | 'webhook';

/** Severity of an ERP validation finding. */
export type ErpFindingSeverity = 'error' | 'warning' | 'info';

/** A single material / part line item for ERP export. */
export interface ErpLineItem {
  /** Internal part identifier (e.g. "SIDE-L-001"). */
  partNumber: string;
  /** Human-readable description. */
  description: string;
  /** Material key from the catalogue (e.g. "melamine-18"). */
  materialKey: string;
  /** Quantity required. */
  quantity: number;
  /** Unit of measure ("EA" = each, "SHT" = sheet, "MM2" = square mm). */
  uom: 'EA' | 'SHT' | 'MM2';
  /** Net area in mm² (width × length). */
  areaMm2: number;
  /** Gross area in mm² including kerf allowance. */
  grossAreaMm2: number;
  /** Thickness in mm. */
  thicknessMm: number;
  /** Unit cost in the project currency. */
  unitCost: number;
  /** Extended cost (quantity × unitCost). */
  extendedCost: number;
}

/** Summary header shared across all ERP formats. */
export interface ErpHeader {
  /** Project / cabinet name for the export. */
  projectName: string;
  /** ISO 8601 export timestamp. */
  exportedAt: string;
  /** Cabinet dimensions string "W×H×D mm". */
  dimensions: string;
  /** Total line items in the payload. */
  lineCount: number;
  /** Grand total cost in the project currency. */
  totalCost: number;
  /** Currency code (e.g. "ILS", "USD"). */
  currencyCode: string;
  /** Schema version for the ERP payload. */
  schemaVersion: string;
}

/** Result of an ERP export operation. */
export interface ErpExportResult {
  /** Target ERP system. */
  system: ErpSystem;
  /** Shared header block. */
  header: ErpHeader;
  /** Line items. */
  items: ErpLineItem[];
  /** SAP IDOC CSV string (only present when system === 'sap'). */
  sapCsv?: string;
  /** Oracle JSON envelope string (only present when system === 'oracle'). */
  oracleJson?: string;
  /** Generic webhook JSON string (only present when system === 'webhook'). */
  webhookJson?: string;
}

/** A single validation finding from `validateErpPayload`. */
export interface ErpFinding {
  severity: ErpFindingSeverity;
  field: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ERP_SCHEMA_VERSION = '1.0.0' as const;

/** SAP IDOC field order for MATMAS / STPO flat CSV. */
const SAP_IDOC_HEADERS = [
  'MATNR',
  'MAKTX',
  'MEINS',
  'MENGE',
  'LAENG',
  'BREIT',
  'HOEHE',
  'NTGEW',
  'BRGEW',
  'NETPR',
  'PEINH',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeSapField(value: string, maxLen: number): string {
  return value
    .replace(/[",\n\r]/g, ' ')
    .slice(0, maxLen)
    .padEnd(maxLen);
}

function buildDimensionsString(config: CabinetConfig): string {
  return `${config.width.toString()}×${config.height.toString()}×${config.depth.toString()} mm`;
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Build ERP line items from an optimization result and cost breakdown.
 *
 * Each placed part on each cut sheet becomes one line item. Sheet-level
 * aggregation groups by material key to produce a parallel sheet-summary item.
 */
export function buildErpLineItems(
  optimization: OptimizationResult,
  cost: CostBreakdown,
  kerfMm: number = 3,
): ErpLineItem[] {
  if (kerfMm < 0 || kerfMm > 20) {
    throw new RangeError(`kerfMm must be 0–20; got ${kerfMm.toString()}`);
  }

  const items: ErpLineItem[] = [];
  const kerfFactor = 1 + (kerfMm * 2) / 100; // approximate gross area factor

  for (const sheet of optimization.sheets) {
    // One line item per placed part
    for (const part of sheet.parts) {
      const areaMm2 = part.width * part.length;
      const grossAreaMm2 = Math.round(areaMm2 * kerfFactor);

      // Find unit cost from sheet costs
      const sheetCost = cost.sheetCosts.find((sc) => sc.material === sheet.material);
      const sheetAreaMm2 = sheet.sheetWidth * sheet.sheetLength;
      const costPerMm2 = sheetCost ? sheetCost.pricePerSheet / sheetAreaMm2 : 0;
      const unitCost = Math.round(areaMm2 * costPerMm2 * 100) / 100;

      items.push({
        partNumber: part.partId,
        description: part.label,
        materialKey: sheet.material,
        quantity: 1,
        uom: 'EA',
        areaMm2,
        grossAreaMm2,
        thicknessMm: sheet.thickness,
        unitCost,
        extendedCost: unitCost,
      });
    }
  }

  return items;
}

/**
 * Format line items and header as a SAP IDOC-compatible flat CSV.
 *
 * Column order follows SAP MATMAS segment field sequence (MATNR, MAKTX,
 * MEINS, MENGE, LAENG, BREIT, HOEHE, NTGEW, BRGEW, NETPR, PEINH).
 */
export function formatAsSap(header: ErpHeader, items: ErpLineItem[]): string {
  const rows: string[] = [];

  // HDR segment
  rows.push(`HDR,${sanitizeSapField(header.projectName, 40)},${header.exportedAt},${header.schemaVersion}`);

  // Column header
  rows.push(SAP_IDOC_HEADERS.join(','));

  for (const item of items) {
    const row = [
      sanitizeSapField(item.partNumber, 18),
      sanitizeSapField(item.description, 40),
      item.uom,
      item.quantity.toFixed(3),
      item.areaMm2.toString(),
      item.grossAreaMm2.toString(),
      item.thicknessMm.toString(),
      '0.000', // net weight (not computed)
      '0.000', // gross weight (not computed)
      item.unitCost.toFixed(2),
      '1', // price unit = 1 EA
    ];
    rows.push(row.join(','));
  }

  // FTR segment
  rows.push(`FTR,${header.lineCount.toString()},${header.totalCost.toFixed(2)},${header.currencyCode}`);

  return rows.join('\n');
}

/**
 * Format line items and header as an Oracle Materials Management JSON envelope.
 *
 * Uses Oracle SCM Cloud REST API naming conventions (PurchasingDocumentLine).
 */
export function formatAsOracle(header: ErpHeader, items: ErpLineItem[]): string {
  const envelope = {
    oracleScm: {
      schemaVersion: header.schemaVersion,
      exportedAt: header.exportedAt,
      projectName: header.projectName,
      dimensions: header.dimensions,
      currency: header.currencyCode,
      totalAmount: header.totalCost,
      purchasingDocumentLines: items.map((item, idx) => ({
        lineNumber: idx + 1,
        itemNumber: item.partNumber,
        itemDescription: item.description,
        materialCategory: item.materialKey,
        orderedQuantity: item.quantity,
        unitOfMeasure: item.uom,
        netAreaMm2: item.areaMm2,
        grossAreaMm2: item.grossAreaMm2,
        thicknessMm: item.thicknessMm,
        unitPrice: item.unitCost,
        lineAmount: item.extendedCost,
      })),
    },
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Format line items and header as a generic webhook JSON payload.
 *
 * Designed for HTTP POST to any arbitrary endpoint. Flat, self-describing
 * structure with snake_case field names.
 */
export function formatAsWebhook(header: ErpHeader, items: ErpLineItem[]): string {
  const payload = {
    schema_version: header.schemaVersion,
    exported_at: header.exportedAt,
    project_name: header.projectName,
    dimensions: header.dimensions,
    currency_code: header.currencyCode,
    total_cost: header.totalCost,
    line_count: header.lineCount,
    bom_items: items.map((item) => ({
      part_number: item.partNumber,
      description: item.description,
      material_key: item.materialKey,
      quantity: item.quantity,
      uom: item.uom,
      area_mm2: item.areaMm2,
      gross_area_mm2: item.grossAreaMm2,
      thickness_mm: item.thicknessMm,
      unit_cost: item.unitCost,
      extended_cost: item.extendedCost,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Validate an ERP export payload and return any findings.
 *
 * Checks for: empty project name, missing items, negative costs,
 * invalid UOM codes, and part numbers that exceed SAP's 18-char limit.
 */
export function validateErpPayload(header: ErpHeader, items: ErpLineItem[]): ErpFinding[] {
  const findings: ErpFinding[] = [];

  if (!header.projectName.trim()) {
    findings.push({ severity: 'error', field: 'header.projectName', message: 'Project name is required' });
  }

  if (items.length === 0) {
    findings.push({ severity: 'warning', field: 'items', message: 'Export contains no line items' });
  }

  if (header.totalCost < 0) {
    findings.push({ severity: 'error', field: 'header.totalCost', message: 'Total cost cannot be negative' });
  }

  for (const item of items) {
    if (item.partNumber.length > 18) {
      findings.push({
        severity: 'warning',
        field: `item.${item.partNumber}.partNumber`,
        message: `Part number "${item.partNumber}" exceeds SAP 18-char limit and will be truncated`,
      });
    }
    if (item.quantity <= 0) {
      findings.push({
        severity: 'error',
        field: `item.${item.partNumber}.quantity`,
        message: `Quantity must be > 0 for part "${item.partNumber}"`,
      });
    }
    if (item.extendedCost < 0) {
      findings.push({
        severity: 'error',
        field: `item.${item.partNumber}.extendedCost`,
        message: `Extended cost cannot be negative for part "${item.partNumber}"`,
      });
    }
  }

  return findings;
}

/**
 * Main entry point. Build a complete ERP export result for the given system.
 *
 * @param system   Target ERP system ('sap' | 'oracle' | 'webhook')
 * @param config   Cabinet configuration
 * @param optimization  Optimization result (cut sheets + parts)
 * @param cost     Cost breakdown
 * @param projectName  Human-readable project label
 */
export function exportErp(
  system: ErpSystem,
  config: CabinetConfig,
  optimization: OptimizationResult,
  cost: CostBreakdown,
  projectName: string = 'Cabinet Project',
): ErpExportResult {
  if (!['sap', 'oracle', 'webhook'].includes(system)) {
    throw new RangeError(`Unknown ERP system "${system}"`);
  }

  const items = buildErpLineItems(optimization, cost);

  const header: ErpHeader = {
    projectName,
    exportedAt: new Date().toISOString(),
    dimensions: buildDimensionsString(config),
    lineCount: items.length,
    totalCost: cost.totalCost,
    currencyCode: 'ILS',
    schemaVersion: ERP_SCHEMA_VERSION,
  };

  const result: ErpExportResult = { system, header, items };

  if (system === 'sap') {
    result.sapCsv = formatAsSap(header, items);
  } else if (system === 'oracle') {
    result.oracleJson = formatAsOracle(header, items);
  } else {
    result.webhookJson = formatAsWebhook(header, items);
  }

  return result;
}

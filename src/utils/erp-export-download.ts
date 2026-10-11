/**
 * erp-export.ts — Sprint 13 (v3.56.3)
 *
 * Generates a machine-readable ERP/MRP JSON payload describing a cabinet
 * project's parts, materials, hardware, and cost summary.
 *
 * The schema is versioned ('erp-v1') so downstream consumers can guard on
 * schemaVersion and apply migrations as the format evolves.
 *
 * Pure function — no React, no side effects.
 */

import type { Part, HardwareItem, OptimizationResult, CabinetConfig } from '../engine/types';
import { getMaterial } from '../engine/materials';
import { triggerDownload } from './download';

// ── Schema types ─────────────────────────────────────────────────────────────

export interface ErpPartLine {
  id: string;
  label: string;
  material: string;
  materialDisplayName: string;
  qty: number;
  thicknessMm: number;
  lengthMm: number;
  widthMm: number;
  areaMm2: number;
  edgeBanding: string;
}

export interface ErpHardwareLine {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice?: number;
  lineCost?: number;
}

export interface ErpMaterialSummaryLine {
  materialKey: string;
  displayName: string;
  sheetsRequired: number;
  thicknessMm: number;
  totalAreaMm2: number;
  pricePerSheet?: number;
  estimatedCost?: number;
}

export interface ErpPayload {
  schemaVersion: 'erp-v1';
  generatedAt: string;
  appVersion: string;
  project: {
    name: string;
    cabinetWidth: number;
    cabinetHeight: number;
    cabinetDepth: number;
    units: 'mm';
    joineryType?: string;
  };
  parts: ErpPartLine[];
  hardware: ErpHardwareLine[];
  materialSummary: ErpMaterialSummaryLine[];
  totals: {
    totalParts: number;
    totalSheets: number;
    overallYieldPercent: number;
    estimatedMaterialCost?: number;
  };
}

// ── Generator ────────────────────────────────────────────────────────────────

/**
 * Build the ERP/MRP JSON payload for the current project.
 *
 * @param projectName  Human-readable project name.
 * @param config       Current cabinet configuration.
 * @param parts        Bill of materials parts list.
 * @param hardware     Hardware items list.
 * @param optimization Cut optimizer result (for sheet counts and yield).
 * @returns            Structured ErpPayload ready for JSON serialization.
 */
export function generateErpPayload(
  projectName: string,
  config: CabinetConfig,
  parts: Part[],
  hardware: HardwareItem[],
  optimization: OptimizationResult,
): ErpPayload {
  const now = new Date().toISOString();

  // ── Parts ──
  const erpParts: ErpPartLine[] = parts.map((p) => {
    let materialDisplayName = p.material;
    try {
      const mat = getMaterial(p.material);
      materialDisplayName = mat.name.en;
    } catch {
      // unknown custom material — keep key as fallback
    }

    return {
      id: p.id,
      label: p.name.en,
      material: p.material,
      materialDisplayName,
      qty: p.qty,
      thicknessMm: p.thickness,
      lengthMm: p.length,
      widthMm: p.width,
      areaMm2: p.qty * p.length * p.width,
      edgeBanding: p.edgeBanding.en,
    };
  });

  // ── Hardware ──
  const erpHardware: ErpHardwareLine[] = hardware.map((h) => ({
    id: h.id,
    name: h.name.en,
    qty: h.qty,
    unit: h.unit.en,
    unitPrice: h.unitPrice,
    lineCost: h.unitPrice != null ? +(h.unitPrice * h.qty).toFixed(2) : undefined,
  }));

  // ── Material summary (one row per unique material key) ──
  const areaByMat = new Map<string, number>();
  for (const p of parts) {
    areaByMat.set(p.material, (areaByMat.get(p.material) ?? 0) + p.qty * p.length * p.width);
  }

  const materialSummary: ErpMaterialSummaryLine[] = [];
  for (const [key, totalArea] of areaByMat) {
    let displayName = key;
    let sheetArea = 1;
    let pricePerSheet: number | undefined;
    let thicknessMm = 18;

    try {
      const mat = getMaterial(key);
      displayName = mat.name.en;
      sheetArea = mat.sheetWidth * mat.sheetLength;
      pricePerSheet = mat.pricePerSheet;
      thicknessMm = mat.thickness;
    } catch {
      // unknown custom material
    }

    const sheetsRequired = sheetArea > 0 ? Math.ceil(totalArea / sheetArea) : 0;
    const estimatedCost = pricePerSheet != null ? +(pricePerSheet * sheetsRequired).toFixed(2) : undefined;

    materialSummary.push({
      materialKey: key,
      displayName,
      sheetsRequired,
      thicknessMm,
      totalAreaMm2: totalArea,
      pricePerSheet,
      estimatedCost,
    });
  }

  // ── Totals ──
  const estimatedMaterialCost = materialSummary.every((m) => m.estimatedCost != null)
    ? +materialSummary.reduce((sum, m) => sum + (m.estimatedCost ?? 0), 0).toFixed(2)
    : undefined;

  return {
    schemaVersion: 'erp-v1',
    generatedAt: now,
    appVersion: __APP_VERSION__,
    project: {
      name: projectName || 'Unnamed Project',
      cabinetWidth: config.width,
      cabinetHeight: config.height,
      cabinetDepth: config.depth,
      units: 'mm',
      joineryType: config.joineryType,
    },
    parts: erpParts,
    hardware: erpHardware,
    materialSummary,
    totals: {
      totalParts: parts.reduce((s, p) => s + p.qty, 0),
      totalSheets: optimization.totalSheets,
      overallYieldPercent: optimization.overallYield,
      estimatedMaterialCost,
    },
  };
}

// ── Download helper ───────────────────────────────────────────────────────────

/**
 * Serialize an ErpPayload to JSON and trigger a browser download.
 */
export function downloadErpJson(payload: ErpPayload, filename: string): void {
  const json = JSON.stringify(payload, null, 2);
  triggerDownload(json, 'application/json', filename);
}

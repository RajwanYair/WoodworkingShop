/**
 * Grain Direction Report — Sprint 17
 *
 * Builds a structured grain-direction report from a cabinet's cut-list.
 * The report groups parts by material and summarises how many require
 * grain-aligned placement, making it easy to communicate constraints to
 * a CNC operator or to include in a `@react-pdf/renderer` PDF.
 *
 * Pure TypeScript — no React, no side-effects.
 */

import type { Part } from '../engine/types';
import { getMaterial } from '../engine/materials';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single part entry in the grain report. */
export interface GrainReportPart {
  /** Part ID, e.g. 'P01'. */
  partId: string;
  /** Bilingual name. */
  name: { en: string; he: string };
  /** Quantity of this part. */
  qty: number;
  /** Part length (grain direction), mm. */
  length: number;
  /** Part width, mm. */
  width: number;
  /** Material key. */
  material: string;
  /**
   * Whether the material has a grain direction that must be preserved.
   * Sourced from `Material.hasGrain`.
   */
  hasGrain: boolean;
  /**
   * When true the cut-optimizer must not rotate this part 90°
   * (`Part.rotationLocked`).
   */
  rotationLocked: boolean;
}

/** Per-material summary within the report. */
export interface GrainMaterialGroup {
  materialKey: string;
  /** Human-readable material name (English). */
  materialName: string;
  /** True when the material itself has grain. */
  hasGrain: boolean;
  /** All parts using this material (includes qty-expanded virtual entries). */
  parts: GrainReportPart[];
  /** Parts that are grain-sensitive (hasGrain && !rotatable). */
  grainSensitiveParts: GrainReportPart[];
  /** Parts where rotation is explicitly locked. */
  rotationLockedParts: GrainReportPart[];
  /** Total part instances (sum of qty). */
  totalInstances: number;
  /** Instances that cannot be freely rotated. */
  constrainedInstances: number;
}

/** Top-level grain direction report. */
export interface GrainReport {
  /** ISO timestamp when the report was generated. */
  generatedAt: string;
  /** Material groups, sorted by materialKey. */
  groups: GrainMaterialGroup[];
  /** Total parts (sum of qty across all groups). */
  totalParts: number;
  /** Total grain-constrained parts (sum of constrained instances). */
  totalConstrained: number;
  /** True when at least one part in the report is grain-sensitive. */
  hasAnyGrainConstraint: boolean;
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Build a `GrainReport` from a flat array of `Part` objects.
 *
 * @param parts  Parts from `generateParts()`.
 * @param generatedAt  Override the report timestamp (useful in tests).
 */
export function buildGrainReport(parts: Part[], generatedAt?: Date): GrainReport {
  const ts = (generatedAt ?? new Date()).toISOString();

  // Group parts by material key
  const byMaterial = new Map<string, Part[]>();
  for (const part of parts) {
    const key = part.material;
    if (!byMaterial.has(key)) byMaterial.set(key, []);
    byMaterial.get(key)!.push(part);
  }

  const groups: GrainMaterialGroup[] = [];

  for (const [materialKey, matParts] of byMaterial) {
    let mat: { hasGrain: boolean; name: { en: string; he: string } };
    try {
      const m = getMaterial(materialKey);
      mat = { hasGrain: m.hasGrain, name: m.name };
    } catch {
      mat = { hasGrain: false, name: { en: materialKey, he: materialKey } };
    }

    const reportParts: GrainReportPart[] = matParts.map((p) => ({
      partId: p.id,
      name: p.name,
      qty: p.qty,
      length: p.length,
      width: p.width,
      material: p.material,
      hasGrain: mat.hasGrain,
      rotationLocked: p.rotationLocked ?? false,
    }));

    const grainSensitiveParts = reportParts.filter((p) => p.hasGrain);
    const rotationLockedParts = reportParts.filter((p) => p.rotationLocked);
    const totalInstances = reportParts.reduce((s, p) => s + p.qty, 0);
    const constrainedInstances = reportParts
      .filter((p) => p.hasGrain || p.rotationLocked)
      .reduce((s, p) => s + p.qty, 0);

    groups.push({
      materialKey,
      materialName: mat.name.en,
      hasGrain: mat.hasGrain,
      parts: reportParts,
      grainSensitiveParts,
      rotationLockedParts,
      totalInstances,
      constrainedInstances,
    });
  }

  // Sort groups by materialKey for deterministic output
  groups.sort((a, b) => a.materialKey.localeCompare(b.materialKey));

  const totalParts = groups.reduce((s, g) => s + g.totalInstances, 0);
  const totalConstrained = groups.reduce((s, g) => s + g.constrainedInstances, 0);

  return {
    generatedAt: ts,
    groups,
    totalParts,
    totalConstrained,
    hasAnyGrainConstraint: totalConstrained > 0,
  };
}

/**
 * Return a flat summary suitable for CSV/text export.
 * Columns: Material, PartId, Name, Qty, Length, Width, HasGrain, RotationLocked
 */
export function grainReportToCsv(report: GrainReport): string {
  const header = 'Material,PartId,Name,Qty,LengthMm,WidthMm,HasGrain,RotationLocked';
  const rows: string[] = [header];
  for (const group of report.groups) {
    for (const p of group.parts) {
      rows.push(
        [
          group.materialKey,
          p.partId,
          `"${p.name.en.replace(/"/g, '""')}"`,
          p.qty,
          p.length,
          p.width,
          p.hasGrain ? 'true' : 'false',
          p.rotationLocked ? 'true' : 'false',
        ].join(','),
      );
    }
  }
  return rows.join('\n');
}

/**
 * Grain Direction Report — Sprint 17
 *
 * Tests for src/engine/grain-report.ts
 */
import { describe, it, expect } from 'vitest';
import { buildGrainReport, grainReportToCsv } from '../../src/engine/grain-report';
import type { Part } from '../../src/engine/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePart(id: string, material: string, opts: Partial<Part> = {}): Part {
  return {
    id,
    name: { en: `Part ${id}`, he: `חלק ${id}` },
    qty: opts.qty ?? 1,
    material,
    thickness: 18,
    length: opts.length ?? 600,
    width: opts.width ?? 400,
    edgeBanding: { en: 'none', he: 'ללא' },
    rotationLocked: opts.rotationLocked,
    ...opts,
  };
}

const TS = new Date('2025-01-01T00:00:00Z');

// ── buildGrainReport ──────────────────────────────────────────────────────────

describe('buildGrainReport', () => {
  it('returns empty groups for no parts', () => {
    const report = buildGrainReport([], TS);
    expect(report.groups).toHaveLength(0);
    expect(report.totalParts).toBe(0);
    expect(report.totalConstrained).toBe(0);
    expect(report.hasAnyGrainConstraint).toBe(false);
  });

  it('sets generatedAt from provided date', () => {
    const report = buildGrainReport([], TS);
    expect(report.generatedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('groups parts by material', () => {
    const parts = [makePart('P01', 'plywood-18mm'), makePart('P02', 'plywood-18mm'), makePart('P03', 'mdf-18mm')];
    const report = buildGrainReport(parts, TS);
    expect(report.groups).toHaveLength(2);
  });

  it('sorts groups alphabetically by materialKey', () => {
    const parts = [makePart('P01', 'z-mat'), makePart('P02', 'a-mat')];
    const report = buildGrainReport(parts, TS);
    expect(report.groups[0].materialKey).toBe('a-mat');
    expect(report.groups[1].materialKey).toBe('z-mat');
  });

  it('sums totalParts across all groups', () => {
    const parts = [makePart('P01', 'a', { qty: 2 }), makePart('P02', 'b', { qty: 3 })];
    const report = buildGrainReport(parts, TS);
    expect(report.totalParts).toBe(5);
  });

  it('correctly classifies rotationLocked parts', () => {
    const parts = [makePart('P01', 'mat', { rotationLocked: true }), makePart('P02', 'mat', { rotationLocked: false })];
    const report = buildGrainReport(parts, TS);
    const group = report.groups[0];
    expect(group.rotationLockedParts).toHaveLength(1);
    expect(group.rotationLockedParts[0].partId).toBe('P01');
  });

  it('hasAnyGrainConstraint is false when no parts are constrained', () => {
    const parts = [makePart('P01', 'unknown-mat')];
    const report = buildGrainReport(parts, TS);
    expect(report.hasAnyGrainConstraint).toBe(false);
  });

  it('hasAnyGrainConstraint is true when any part is rotationLocked', () => {
    const parts = [makePart('P01', 'unknown-mat', { rotationLocked: true })];
    const report = buildGrainReport(parts, TS);
    expect(report.hasAnyGrainConstraint).toBe(true);
  });

  it('handles unknown material gracefully', () => {
    const parts = [makePart('P01', 'unknown-exotic-xyz')];
    const report = buildGrainReport(parts, TS);
    expect(report.groups[0].hasGrain).toBe(false);
    expect(report.groups[0].materialName).toBe('unknown-exotic-xyz');
  });

  it('includes part dimensions in report', () => {
    const parts = [makePart('P01', 'mat', { length: 800, width: 300 })];
    const report = buildGrainReport(parts, TS);
    const part = report.groups[0].parts[0];
    expect(part.length).toBe(800);
    expect(part.width).toBe(300);
  });

  it('constrainedInstances counts qty correctly', () => {
    const parts = [makePart('P01', 'mat', { qty: 4, rotationLocked: true })];
    const report = buildGrainReport(parts, TS);
    expect(report.totalConstrained).toBe(4);
  });

  it('totalInstances matches sum of part qty in group', () => {
    const parts = [makePart('P01', 'mat', { qty: 2 }), makePart('P02', 'mat', { qty: 3 })];
    const report = buildGrainReport(parts, TS);
    expect(report.groups[0].totalInstances).toBe(5);
  });
});

// ── grainReportToCsv ──────────────────────────────────────────────────────────

describe('grainReportToCsv', () => {
  it('emits a header row', () => {
    const report = buildGrainReport([], TS);
    const csv = grainReportToCsv(report);
    expect(csv).toContain('Material,PartId,Name,Qty');
  });

  it('emits one data row per part', () => {
    const parts = [makePart('P01', 'mat1'), makePart('P02', 'mat2')];
    const report = buildGrainReport(parts, TS);
    const csv = grainReportToCsv(report);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 data
  });

  it('quotes part names with commas', () => {
    const parts: Part[] = [
      {
        id: 'P01',
        name: { en: 'Side, inner', he: '' },
        qty: 1,
        material: 'mat',
        thickness: 18,
        length: 600,
        width: 400,
        edgeBanding: { en: 'none', he: 'ללא' },
      },
    ];
    const report = buildGrainReport(parts, TS);
    const csv = grainReportToCsv(report);
    expect(csv).toContain('"Side, inner"');
  });

  it('includes HasGrain and RotationLocked columns', () => {
    const parts = [makePart('P01', 'mat', { rotationLocked: true })];
    const report = buildGrainReport(parts, TS);
    const csv = grainReportToCsv(report);
    expect(csv).toContain('false');
    expect(csv).toContain('true');
  });
});

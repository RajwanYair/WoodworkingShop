/**
 * Smoke tests that import each engine sub-module barrel.
 * These tests ensure the barrel re-exports resolve correctly
 * and provide line/statement coverage for the index.ts files.
 */
import { describe, it, expect } from 'vitest';
import * as GeometryBarrel from '../../src/engine/geometry/index.ts';
import * as HardwareBarrel from '../../src/engine/hardware/index.ts';
import * as MaterialsBarrel from '../../src/engine/materials/index.ts';
import * as OptimizerBarrel from '../../src/engine/optimizer/index.ts';
import * as AssemblyBarrel from '../../src/engine/assembly/index.ts';

describe('engine/geometry barrel', () => {
  it('re-exports dimension and part functions', () => {
    expect(typeof GeometryBarrel.computeDimensions).toBe('function');
    expect(typeof GeometryBarrel.computeHingesPerDoor).toBe('function');
    expect(typeof GeometryBarrel.computeHingePositions).toBe('function');
    expect(typeof GeometryBarrel.computeEqualShelfPositions).toBe('function');
    expect(typeof GeometryBarrel.generateParts).toBe('function');
    expect(typeof GeometryBarrel.computeEdgeBandingTotal).toBe('function');
    expect(typeof GeometryBarrel.computePartsWeight).toBe('function');
  });
});

describe('engine/hardware barrel', () => {
  it('re-exports hardware and substitution functions', () => {
    expect(typeof HardwareBarrel.generateHardware).toBe('function');
    expect(HardwareBarrel.VENDOR_HINGE_PROFILES).toBeDefined();
    expect(typeof HardwareBarrel.findSubstitutions).toBe('function');
  });
});

describe('engine/materials barrel', () => {
  it('re-exports material catalog and cost functions', () => {
    expect(typeof MaterialsBarrel.getMaterial).toBe('function');
    expect(typeof MaterialsBarrel.getMaterialResult).toBe('function');
    expect(typeof MaterialsBarrel.panelMaterials).toBe('function');
    expect(typeof MaterialsBarrel.backMaterials).toBe('function');
    expect(MaterialsBarrel.DEFAULT_CONFIG).toBeDefined();
    expect(MaterialsBarrel.MATERIALS).toBeDefined();
    expect(MaterialsBarrel.CONSTRAINTS).toBeDefined();
    expect(MaterialsBarrel.HARD_LIMITS).toBeDefined();
    expect(typeof MaterialsBarrel.computePartWeightKg).toBe('function');
    expect(MaterialsBarrel.TEMPLATES).toBeDefined();
    expect(typeof MaterialsBarrel.getTemplate).toBe('function');
    expect(typeof MaterialsBarrel.getTemplateDefaults).toBe('function');
    expect(typeof MaterialsBarrel.estimateCost).toBe('function');
    expect(typeof MaterialsBarrel.DEFAULT_LABOUR_RATE).toBe('number');
  });
});

describe('engine/optimizer barrel', () => {
  it('re-exports cut optimizer and smart optimizer functions', () => {
    expect(typeof OptimizerBarrel.optimizeCutSheets).toBe('function');
    expect(typeof OptimizerBarrel.optimizeCutSheetsResult).toBe('function');
    expect(typeof OptimizerBarrel.findOptimizations).toBe('function');
  });
});

describe('engine/assembly barrel', () => {
  it('re-exports assembly, snapshot, and memo functions', () => {
    expect(typeof AssemblyBarrel.generateAssemblySteps).toBe('function');
    expect(typeof AssemblyBarrel.buildAssemblyDAG).toBe('function');
    expect(typeof AssemblyBarrel.diffSnapshots).toBe('function');
    expect(typeof AssemblyBarrel.createJsonMemo).toBe('function');
  });
});

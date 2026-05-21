/**
 * Phase 12 / Sprint 8 — Engine sub-module barrel contract tests.
 *
 * Each test imports the public symbol from its domain sub-barrel and asserts
 * that the export is callable/defined.  This prevents accidental breakage when
 * the barrel files are later updated.
 */
import { describe, it, expect } from 'vitest';

describe('engine/geometry barrel', () => {
  it('re-exports computeDimensions', async () => {
    const { computeDimensions } = await import('../../src/engine/geometry');
    expect(typeof computeDimensions).toBe('function');
  });

  it('re-exports generateParts', async () => {
    const { generateParts } = await import('../../src/engine/geometry');
    expect(typeof generateParts).toBe('function');
  });
});

describe('engine/optimizer barrel', () => {
  it('re-exports optimizeCutSheets', async () => {
    const { optimizeCutSheets } = await import('../../src/engine/optimizer');
    expect(typeof optimizeCutSheets).toBe('function');
  });

  it('re-exports optimizeCutSheetsResult', async () => {
    const { optimizeCutSheetsResult } = await import('../../src/engine/optimizer');
    expect(typeof optimizeCutSheetsResult).toBe('function');
  });

  it('re-exports findOptimizations', async () => {
    const { findOptimizations } = await import('../../src/engine/optimizer');
    expect(typeof findOptimizations).toBe('function');
  });
});

// NOTE: engine/hardware.ts and engine/hardware/ coexist; use explicit index.ts so
// Vite resolves the barrel directory rather than the same-named source file.
describe('engine/hardware barrel', () => {
  it('re-exports generateHardware', async () => {
    const { generateHardware } = await import('../../src/engine/hardware/index.ts');
    expect(typeof generateHardware).toBe('function');
  });

  it('re-exports findSubstitutions', async () => {
    const { findSubstitutions } = await import('../../src/engine/hardware/index.ts');
    expect(typeof findSubstitutions).toBe('function');
  });
});

// NOTE: engine/materials.ts and engine/materials/ coexist; use explicit index.ts so
// Vite resolves the barrel directory rather than the same-named source file.
describe('engine/materials barrel', () => {
  it('re-exports getMaterial', async () => {
    const { getMaterial } = await import('../../src/engine/materials/index.ts');
    expect(typeof getMaterial).toBe('function');
  });

  it('re-exports DEFAULT_CONFIG', async () => {
    const { DEFAULT_CONFIG } = await import('../../src/engine/materials/index.ts');
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(typeof DEFAULT_CONFIG.width).toBe('number');
  });

  it('re-exports estimateCost', async () => {
    const { estimateCost } = await import('../../src/engine/materials/index.ts');
    expect(typeof estimateCost).toBe('function');
  });

  it('re-exports getTemplate', async () => {
    const { getTemplate } = await import('../../src/engine/materials/index.ts');
    expect(typeof getTemplate).toBe('function');
  });
});

describe('engine/export barrel', () => {
  it('re-exports parseToolpath', async () => {
    const { parseToolpath } = await import('../../src/engine/export');
    expect(typeof parseToolpath).toBe('function');
  });

  it('re-exports validateGcode', async () => {
    const { validateGcode } = await import('../../src/engine/export');
    expect(typeof validateGcode).toBe('function');
  });
});

describe('engine/validation barrel', () => {
  it('re-exports validateConfig', async () => {
    const { validateConfig } = await import('../../src/engine/validation');
    expect(typeof validateConfig).toBe('function');
  });
});

describe('engine/plugin barrel', () => {
  it('re-exports registerPlugin', async () => {
    const { registerPlugin } = await import('../../src/engine/plugin');
    expect(typeof registerPlugin).toBe('function');
  });

  it('re-exports getPluginContract', async () => {
    const { getPluginContract } = await import('../../src/engine/plugin');
    expect(typeof getPluginContract).toBe('function');
  });
});

// NOTE: engine/assembly.ts and engine/assembly/ coexist; use explicit index.ts so
// Vite resolves the barrel directory rather than the same-named source file.
describe('engine/assembly barrel', () => {
  it('re-exports generateAssemblySteps', async () => {
    const { generateAssemblySteps } = await import('../../src/engine/assembly/index.ts');
    expect(typeof generateAssemblySteps).toBe('function');
  });

  it('re-exports diffSnapshots', async () => {
    const { diffSnapshots } = await import('../../src/engine/assembly/index.ts');
    expect(typeof diffSnapshots).toBe('function');
  });

  it('re-exports createJsonMemo', async () => {
    const { createJsonMemo } = await import('../../src/engine/assembly/index.ts');
    expect(typeof createJsonMemo).toBe('function');
  });
});

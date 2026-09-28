import { describe, expect, it } from 'vitest';
import {
  makeCabinetEntry,
  makeCutSheet,
  makeExportOutput,
  makeHardwareItem,
  makeMaterial,
  makeOptimizationResult,
  makeSavedProject,
  mockSheet,
} from './helpers';

describe('test fixture builders', () => {
  it('returns independent nested data for each fixture', () => {
    const firstCabinet = makeCabinetEntry();
    const secondCabinet = makeCabinetEntry();
    firstCabinet.config.width += 10;

    const firstMaterial = makeMaterial();
    const secondMaterial = makeMaterial();
    firstMaterial.name.en = 'Changed';

    const firstHardware = makeHardwareItem();
    const secondHardware = makeHardwareItem();
    firstHardware.name.en = 'Changed';

    const firstSheet = makeCutSheet();
    const secondSheet = makeCutSheet();
    firstSheet.parts.push({ ...firstSheet.parts[0], partId: 'P02' });

    const firstOptimization = makeOptimizationResult();
    const secondOptimization = makeOptimizationResult();
    firstOptimization.sheets[0].parts[0].label = 'Changed';

    const firstProject = makeSavedProject();
    const secondProject = makeSavedProject();
    firstProject.cabinets[0].name = 'Changed';

    const firstOutput = makeExportOutput();
    const secondOutput = makeExportOutput();
    firstOutput.content = 'Changed';

    expect(secondCabinet.config.width).not.toBe(firstCabinet.config.width);
    expect(secondMaterial.name.en).toBe('Melamine 18 mm');
    expect(secondHardware.name.en).toBe('Hinge');
    expect(secondSheet.parts).toHaveLength(1);
    expect(secondOptimization.sheets[0].parts[0].label).toBe('Side Panel');
    expect(secondProject.cabinets[0].name).toBe('Cabinet 1');
    expect(secondOutput.content).toBe('test export');
  });

  it('keeps the shared legacy sheet fixture immutable', () => {
    expect(Object.isFrozen(mockSheet)).toBe(true);
    expect(Object.isFrozen(mockSheet.parts)).toBe(true);
    expect(Object.isFrozen(mockSheet.parts[0])).toBe(true);
  });
});

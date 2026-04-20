import { describe, it, expect } from 'vitest';
import { generateAssemblySteps } from '../../src/engine/assembly';
import { DEFAULT_CONFIG, DESK_DEFAULTS, WARDROBE_DEFAULTS } from '../../src/engine/materials';
import type { CabinetConfig } from '../../src/engine/types';

describe('desk assembly', () => {
  const deskCfg: CabinetConfig = { ...DEFAULT_CONFIG, ...DESK_DEFAULTS };
  const steps = generateAssemblySteps(deskCfg);

  it('returns assembly steps', () => {
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });

  it('step numbers are sequential', () => {
    steps.forEach((s, i) => expect(s.stepNumber).toBe(i + 1));
  });

  it('each step has bilingual title and description', () => {
    for (const s of steps) {
      expect(s.title.en).toBeTruthy();
      expect(s.title.he).toBeTruthy();
      expect(s.description.en).toBeTruthy();
      expect(s.description.he).toBeTruthy();
    }
  });

  it('does NOT include a door step', () => {
    const doorStep = steps.find(s => s.title.en.toLowerCase().includes('door'));
    expect(doorStep).toBeUndefined();
  });
});

describe('wardrobe assembly', () => {
  const wardrobeCfg: CabinetConfig = { ...DEFAULT_CONFIG, ...WARDROBE_DEFAULTS };
  const steps = generateAssemblySteps(wardrobeCfg);

  it('returns assembly steps', () => {
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });

  it('step numbers are sequential', () => {
    steps.forEach((s, i) => expect(s.stepNumber).toBe(i + 1));
  });

  it('includes a door step', () => {
    const doorStep = steps.find(s => s.title.en.toLowerCase().includes('door'));
    expect(doorStep).toBeDefined();
  });

  it('includes a hanging rail step', () => {
    const railStep = steps.find(s => s.title.en.toLowerCase().includes('hanging') || s.title.en.toLowerCase().includes('rail'));
    expect(railStep).toBeDefined();
  });

  it('each step has bilingual title and description', () => {
    for (const s of steps) {
      expect(s.title.en).toBeTruthy();
      expect(s.title.he).toBeTruthy();
      expect(s.description.en).toBeTruthy();
      expect(s.description.he).toBeTruthy();
    }
  });
});

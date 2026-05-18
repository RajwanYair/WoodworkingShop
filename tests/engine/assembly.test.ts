import { describe, it, expect } from 'vitest';
import { generateAssemblySteps } from '../../src/engine/assembly';
import { DEFAULT_CONFIG, BOOKSHELF_DEFAULTS } from '../../src/engine/materials';
import type { CabinetConfig } from '../../src/engine/types';
import { expectSequentialSteps, expectBilingualSteps } from '../assertions';

describe('generateAssemblySteps', () => {
  it('returns at least 5 steps for default cabinet', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });

  it('step numbers are sequential starting at 1', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    expectSequentialSteps(steps);
  });

  it('each step has bilingual title and description', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    expectBilingualSteps(steps);
  });

  it('includes door step for cabinet with doors', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, doorStyle: 'flat' };
    const steps = generateAssemblySteps(cfg);
    const doorStep = steps.find((s) => s.title.en.toLowerCase().includes('door'));
    expect(doorStep).toBeDefined();
  });

  it('omits door step for bookshelf type', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, ...BOOKSHELF_DEFAULTS, furnitureType: 'bookshelf' };
    const steps = generateAssemblySteps(cfg);
    const doorStep = steps.find((s) => s.title.en.toLowerCase().includes('door'));
    expect(doorStep).toBeUndefined();
  });

  it('includes edge banding step when enabled', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, edgeBanding: 'all-visible' };
    const steps = generateAssemblySteps(cfg);
    const bandingStep = steps.find((s) => s.title.en.toLowerCase().includes('edge'));
    expect(bandingStep).toBeDefined();
  });

  it('omits edge banding step when none', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, edgeBanding: 'none' };
    const steps = generateAssemblySteps(cfg);
    const bandingStep = steps.find((s) => s.title.en.toLowerCase().includes('edge'));
    expect(bandingStep).toBeUndefined();
  });

  it('includes fixed shelf step for tall cabinets', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, height: 2000 };
    const steps = generateAssemblySteps(cfg);
    const fixedStep = steps.find((s) => s.title.en.toLowerCase().includes('fixed shelf'));
    expect(fixedStep).toBeDefined();
  });

  it('omits fixed shelf step for short cabinets', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, height: 800 };
    const steps = generateAssemblySteps(cfg);
    const fixedStep = steps.find((s) => s.title.en.toLowerCase().includes('fixed shelf'));
    expect(fixedStep).toBeUndefined();
  });

  it('always includes a wall mounting step', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    const wallStep = steps.find((s) => s.title.en.toLowerCase().includes('wall'));
    expect(wallStep).toBeDefined();
  });

  // ── Risk level annotations (Sprint 14) ──

  it('every step has a riskLevel field', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    for (const step of steps) {
      expect(['low', 'medium', 'high']).toContain(step.riskLevel);
    }
  });

  it('wall mounting step is marked high risk', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    const wallStep = steps.find((s) => s.title.en.toLowerCase().includes('wall'));
    expect(wallStep?.riskLevel).toBe('high');
  });

  it('edge banding step is marked low risk', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, edgeBanding: 'all-visible' };
    const steps = generateAssemblySteps(cfg);
    const bandStep = steps.find((s) => s.title.en.toLowerCase().includes('edge banding'));
    expect(bandStep?.riskLevel).toBe('low');
  });

  it('hinge/door mounting step is marked medium risk', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, doorStyle: 'flat' };
    const steps = generateAssemblySteps(cfg);
    const hingeStep = steps.find((s) => s.title.en.toLowerCase().includes('hinge'));
    expect(hingeStep?.riskLevel).toBe('medium');
  });
});


import { describe, it, expect } from 'vitest';
import { generateAssemblySteps } from '../../src/engine/assembly';
import { DEFAULT_CONFIG, BOOKSHELF_DEFAULTS } from '../../src/engine/materials';
import type { CabinetConfig } from '../../src/engine/types';

describe('generateAssemblySteps', () => {
  it('returns at least 5 steps for default cabinet', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });

  it('step numbers are sequential starting at 1', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    steps.forEach((s, i) => {
      expect(s.stepNumber).toBe(i + 1);
    });
  });

  it('each step has bilingual title and description', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    for (const s of steps) {
      expect(s.title.en).toBeTruthy();
      expect(s.title.he).toBeTruthy();
      expect(s.description.en).toBeTruthy();
      expect(s.description.he).toBeTruthy();
    }
  });

  it('includes door step for cabinet with doors', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, doorStyle: 'overlay' };
    const steps = generateAssemblySteps(cfg);
    const doorStep = steps.find(s => s.title.en.toLowerCase().includes('door'));
    expect(doorStep).toBeDefined();
  });

  it('omits door step for bookshelf type', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, ...BOOKSHELF_DEFAULTS, furnitureType: 'bookshelf' };
    const steps = generateAssemblySteps(cfg);
    const doorStep = steps.find(s => s.title.en.toLowerCase().includes('door'));
    expect(doorStep).toBeUndefined();
  });

  it('includes edge banding step when enabled', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, edgeBanding: 'pvc' };
    const steps = generateAssemblySteps(cfg);
    const bandingStep = steps.find(s => s.title.en.toLowerCase().includes('edge'));
    expect(bandingStep).toBeDefined();
  });

  it('omits edge banding step when none', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, edgeBanding: 'none' };
    const steps = generateAssemblySteps(cfg);
    const bandingStep = steps.find(s => s.title.en.toLowerCase().includes('edge'));
    expect(bandingStep).toBeUndefined();
  });

  it('includes fixed shelf step for tall cabinets', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, height: 2000 };
    const steps = generateAssemblySteps(cfg);
    const fixedStep = steps.find(s => s.title.en.toLowerCase().includes('fixed shelf'));
    expect(fixedStep).toBeDefined();
  });

  it('omits fixed shelf step for short cabinets', () => {
    const cfg: CabinetConfig = { ...DEFAULT_CONFIG, height: 800 };
    const steps = generateAssemblySteps(cfg);
    const fixedStep = steps.find(s => s.title.en.toLowerCase().includes('fixed shelf'));
    expect(fixedStep).toBeUndefined();
  });

  it('always ends with wall mounting step', () => {
    const steps = generateAssemblySteps(DEFAULT_CONFIG);
    const last = steps[steps.length - 1];
    expect(last.title.en.toLowerCase()).toContain('wall');
  });
});

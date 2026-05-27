import { describe, it, expect } from 'vitest';
import { generateIfcContent } from '../../src/engine/export/ifc-export';
import { generateStepContent } from '../../src/engine/export/step-export';
import type { Part } from '../../src/engine/types';
import { cfg } from '../helpers';

// ── fixtures ──────────────────────────────────────────────────────────────

// qty: 1 on all parts so partCount === parts.length (the function counts instances)
const twoPartList: Part[] = [
  {
    id: 'P01',
    name: { en: 'Side Panel', he: 'לוח צד' },
    qty: 1,
    material: 'melamine-18',
    thickness: 18,
    length: 720,
    width: 580,
    edgeBanding: { en: 'none', he: 'אין' },
  },
  {
    id: 'P02',
    name: { en: 'Bottom Panel', he: 'לוח תחתון' },
    qty: 1,
    material: 'plywood-18',
    thickness: 18,
    length: 550,
    width: 550,
    edgeBanding: { en: 'none', he: 'אין' },
  },
];

// ── generateIfcContent ────────────────────────────────────────────────────

describe('generateIfcContent — envelope', () => {
  it('content starts with ISO-10303-21 header', () => {
    const { content } = generateIfcContent(cfg(), twoPartList);
    expect(content).toContain('ISO-10303-21');
  });

  it('content ends with END-ISO-10303-21 footer', () => {
    const { content } = generateIfcContent(cfg(), twoPartList);
    expect(content.trimEnd()).toContain('END-ISO-10303-21');
  });

  it('content is a non-empty string', () => {
    const { content } = generateIfcContent(cfg(), twoPartList);
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(100);
  });
});

describe('generateIfcContent — partCount', () => {
  it('reports correct partCount matching parts array length', () => {
    expect(generateIfcContent(cfg(), twoPartList).partCount).toBe(2);
  });

  it('partCount is 0 for empty parts list', () => {
    expect(generateIfcContent(cfg(), []).partCount).toBe(0);
  });

  it('partCount matches single-part list', () => {
    expect(generateIfcContent(cfg(), [twoPartList[0]]).partCount).toBe(1);
  });
});

describe('generateIfcContent — IFC entities', () => {
  it('contains IFCPROJECT entity', () => {
    const { content } = generateIfcContent(cfg(), twoPartList);
    expect(content).toContain('IFCPROJECT');
  });

  it('contains IFCSITE entity', () => {
    const { content } = generateIfcContent(cfg(), twoPartList);
    expect(content).toContain('IFCSITE');
  });

  it('contains IFCBUILDING entity', () => {
    const { content } = generateIfcContent(cfg(), twoPartList);
    expect(content).toContain('IFCBUILDING');
  });

  it('contains bounding box entities for each part', () => {
    const { content } = generateIfcContent(cfg(), twoPartList);
    expect(content).toContain('IFCBOUNDINGBOX');
  });

  it('produces valid IFC for default config and empty parts', () => {
    const result = generateIfcContent(cfg(), []);
    expect(result.content).toContain('IFCPROJECT');
    expect(result.partCount).toBe(0);
  });
});

// ── generateStepContent ───────────────────────────────────────────────────

describe('generateStepContent — envelope', () => {
  it('content starts with ISO-10303-21 header', () => {
    const { content } = generateStepContent(cfg(), twoPartList);
    expect(content).toContain('ISO-10303-21');
  });

  it('content ends with END-ISO-10303-21 footer', () => {
    const { content } = generateStepContent(cfg(), twoPartList);
    expect(content.trimEnd()).toContain('END-ISO-10303-21');
  });

  it('content is a non-empty string', () => {
    const { content } = generateStepContent(cfg(), twoPartList);
    expect(content.length).toBeGreaterThan(100);
  });
});

describe('generateStepContent — partCount', () => {
  it('reports correct partCount matching parts array length', () => {
    expect(generateStepContent(cfg(), twoPartList).partCount).toBe(2);
  });

  it('partCount is 0 for empty parts list', () => {
    expect(generateStepContent(cfg(), []).partCount).toBe(0);
  });

  it('partCount matches single-part list', () => {
    expect(generateStepContent(cfg(), [twoPartList[0]]).partCount).toBe(1);
  });
});

describe('generateStepContent — STEP entities', () => {
  it('contains MANIFOLD_SOLID_BREP for each part', () => {
    const { content } = generateStepContent(cfg(), twoPartList);
    expect(content).toContain('MANIFOLD_SOLID_BREP');
  });

  it('contains CARTESIAN_POINT entities', () => {
    const { content } = generateStepContent(cfg(), twoPartList);
    expect(content).toContain('CARTESIAN_POINT');
  });

  it('contains CLOSED_SHELL entities', () => {
    const { content } = generateStepContent(cfg(), twoPartList);
    expect(content).toContain('CLOSED_SHELL');
  });

  it('produces valid STEP content for empty parts list', () => {
    const result = generateStepContent(cfg(), []);
    expect(result.content).toContain('ISO-10303-21');
    expect(result.partCount).toBe(0);
  });
});

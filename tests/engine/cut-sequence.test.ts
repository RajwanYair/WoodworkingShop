import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { buildCutSequence, replayCutSequence, type CutRegion } from '../../src/engine/cut-sequence';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import type { CutRect, CutSheet, Part } from '../../src/engine/types';
import { propertyRunOptions } from '../property-seeds';

const MATERIAL = 'melamine-16';

function rect(partId: string, x: number, y: number, width: number, length: number): CutRect {
  return { partId, label: partId, x, y, width, length, grainVertical: true };
}

function sheet(parts: CutRect[], sheetWidth = 1000, sheetLength = 1000): CutSheet {
  return { sheetIndex: 0, material: MATERIAL, thickness: 16, sheetWidth, sheetLength, parts, yieldPercent: 0 };
}

function area(regions: readonly CutRegion[]): number {
  return regions.reduce((sum, r) => sum + r.width * r.length, 0);
}

describe('buildCutSequence', () => {
  it('splits a two-strip layout into kerf-adjusted staged cuts with residual offcuts', () => {
    const layout = sheet([rect('a', 0, 0, 400, 300), rect('b', 403, 0, 400, 200), rect('c', 0, 303, 500, 300)]);
    const result = buildCutSequence(layout, 3);
    if (!result.ok) throw new Error(result.reason);
    const { steps, stages, residuals } = result.sequence;

    expect(steps[0]).toMatchObject({ step: 1, axis: 'y', position: 300, kerf: 3, stage: 1 });
    expect(steps.map((s) => s.step)).toEqual(steps.map((_, i) => i + 1));
    expect(stages).toBe(3);
    expect(replayCutSequence(layout, steps)).toBe(true);

    const partArea = layout.parts.reduce((s, p) => s + p.width * p.length, 0);
    const kerfArea = steps.reduce((s, st) => s + st.kerf * (st.axis === 'y' ? st.region.width : st.region.length), 0);
    expect(partArea + area(residuals) + kerfArea).toBeCloseTo(1000 * 1000, 6);
  });

  it('returns a single residual and no cuts for an empty sheet', () => {
    const result = buildCutSequence(sheet([]), 3);
    expect(result).toEqual({
      ok: true,
      sequence: {
        tree: { kind: 'residual', region: { x: 0, y: 0, width: 1000, length: 1000 } },
        steps: [],
        stages: 0,
        residuals: [{ x: 0, y: 0, width: 1000, length: 1000 }],
      },
    });
  });

  it('needs no cuts when one part fills the sheet exactly', () => {
    const result = buildCutSequence(sheet([rect('a', 0, 0, 1000, 1000)]), 3);
    expect(result.ok && result.sequence.steps).toEqual([]);
  });

  it('clamps kerf when the cut runs off the panel edge', () => {
    const result = buildCutSequence(sheet([rect('a', 0, 0, 1000, 999)]), 3);
    if (!result.ok) throw new Error(result.reason);
    expect(result.sequence.steps).toEqual([expect.objectContaining({ axis: 'y', position: 999, kerf: 1 })]);
    expect(result.sequence.residuals).toEqual([]);
  });

  it('rejects a pinwheel layout that has no edge-to-edge cut', () => {
    const pinwheel = sheet(
      [
        rect('n', 0, 0, 600, 400),
        rect('e', 603, 0, 397, 600),
        rect('s', 400, 603, 600, 397),
        rect('w', 0, 403, 397, 597),
      ],
      1000,
      1000,
    );
    expect(buildCutSequence(pinwheel, 3)).toEqual({ ok: false, reason: 'not-guillotine' });
  });

  it.each([
    [1, false],
    [2, false],
    [3, true],
  ])('enforces maxStages=%i on a three-stage layout (realizable: %s)', (maxStages, realizable) => {
    const layout = sheet([rect('a', 0, 0, 400, 300), rect('b', 403, 0, 400, 200), rect('c', 0, 303, 500, 300)]);
    const result = buildCutSequence(layout, 3, { maxStages });
    expect(result.ok).toBe(realizable);
    if (!result.ok) expect(result.reason).toBe('max-stages-exceeded');
  });

  it.each([
    ['negative x', rect('a', -1, 0, 100, 100)],
    ['past sheet width', rect('a', 950, 0, 100, 100)],
    ['zero size', rect('a', 0, 0, 0, 100)],
  ])('reports part-out-of-bounds for %s', (_label, part) => {
    expect(buildCutSequence(sheet([part]), 3)).toEqual({ ok: false, reason: 'part-out-of-bounds' });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('throws RangeError for kerf %s', (kerf) => {
    expect(() => buildCutSequence(sheet([]), kerf)).toThrow(RangeError);
  });
});

describe('replayCutSequence', () => {
  const layout = sheet([rect('a', 0, 0, 400, 300), rect('b', 0, 303, 400, 300)]);
  const built = buildCutSequence(layout, 3);
  if (!built.ok) throw new Error(built.reason);
  const steps = built.sequence.steps;

  it('accepts the derived sequence', () => {
    expect(replayCutSequence(layout, steps)).toBe(true);
  });

  it.each([
    ['missing cuts', steps.slice(0, 1)],
    ['kerf through a part', steps.map((s, i) => (i === 0 ? { ...s, position: 299 } : s))],
    [
      'cut on a panel that does not exist',
      steps.map((s, i) => (i === 1 ? { ...s, region: { ...s.region, x: 5 } } : s)),
    ],
    ['cut outside its panel', steps.map((s, i) => (i === 0 ? { ...s, position: 1000 } : s))],
    ['out-of-order cuts', [...steps].reverse()],
  ])('rejects %s', (_label, tampered) => {
    expect(replayCutSequence(layout, tampered)).toBe(false);
  });
});

const arbPart: fc.Arbitrary<Part> = fc.record({
  id: fc.constant('p'),
  name: fc.constant({ en: 'Part', he: 'חלק' }),
  qty: fc.integer({ min: 1, max: 3 }),
  material: fc.constant(MATERIAL),
  thickness: fc.constant(16),
  length: fc.integer({ min: 50, max: 1200 }),
  width: fc.integer({ min: 50, max: 1200 }),
  edgeBanding: fc.constant({ en: 'none', he: 'אין' }),
});

describe('guillotine optimizer output', () => {
  it('always yields a replayable three-stage sequence that isolates every part', () => {
    fc.assert(
      fc.property(
        fc.array(arbPart, { minLength: 1, maxLength: 10 }).map((ps) => ps.map((p, i) => ({ ...p, id: `p${i}` }))),
        fc.integer({ min: 0, max: 6 }),
        (parts, kerf) => {
          const result = optimizeCutSheets(parts, kerf, {}, 'guillotine');
          for (const s of result.sheets) {
            const seq = buildCutSequence(s, kerf, { maxStages: 3 });
            if (!seq.ok || !replayCutSequence(s, seq.sequence.steps)) return false;
          }
          return true;
        },
      ),
      propertyRunOptions('tests/engine/cut-sequence.test.ts', 100),
    );
  });
});

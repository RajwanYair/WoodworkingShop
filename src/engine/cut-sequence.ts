import type { CutRect, CutSheet } from './types.ts';

const EPS = 1e-6;

/**
 * Cut axis. `'y'` cuts run across the sheet width at a constant y (crosscut);
 * `'x'` cuts run along the sheet length at a constant x (rip).
 */
type CutAxis = 'x' | 'y';

/** Axis-aligned region of a sheet, in the cut-optimizer coordinate system. */
export interface CutRegion {
  x: number;
  y: number;
  /** Extent across the sheet width (x axis). */
  width: number;
  /** Extent along the sheet length (y axis). */
  length: number;
}

/** A node in a guillotine cut tree. */
type CutTreeNode =
  | {
      kind: 'cut';
      region: CutRegion;
      axis: CutAxis;
      /** Coordinate where the kerf begins on `axis`. */
      position: number;
      /** Material removed by the blade; clamped when the kerf runs off the region edge. */
      kerf: number;
      /** 1-based stage: increments whenever the cut axis changes from its parent. */
      stage: number;
      before: CutTreeNode | null;
      after: CutTreeNode | null;
    }
  | { kind: 'piece'; region: CutRegion; partIndex: number }
  | { kind: 'residual'; region: CutRegion };

/** One executable saw cut, in cut order. */
export interface CutStep {
  /** 1-based order of the cut. */
  step: number;
  axis: CutAxis;
  position: number;
  kerf: number;
  stage: number;
  /** The panel being cut; the cut spans it edge to edge. */
  region: CutRegion;
}

/** Machine limits assumed when building a sequence. */
export interface CutSequenceOptions {
  /** Maximum stages (axis changes + 1) the saw workflow supports. Default: unlimited. */
  maxStages?: number;
}

/** A realizable guillotine cut sequence for one sheet. */
interface CutSequence {
  tree: CutTreeNode;
  steps: CutStep[];
  /** Number of stages used by the deepest branch. */
  stages: number;
  /** Offcut regions left after all cuts (excluding kerf). */
  residuals: CutRegion[];
}

/** Result of attempting to derive a cut sequence from a layout. */
export type CutSequenceResult =
  | { ok: true; sequence: CutSequence }
  | { ok: false; reason: 'not-guillotine' | 'max-stages-exceeded' | 'part-out-of-bounds' };

interface Span {
  start: number;
  size: number;
}

function span(r: CutRegion | CutRect, axis: CutAxis): Span {
  return axis === 'x' ? { start: r.x, size: r.width } : { start: r.y, size: r.length };
}

function sameRegion(a: CutRegion, b: CutRect): boolean {
  return (
    Math.abs(a.x - b.x) < EPS &&
    Math.abs(a.y - b.y) < EPS &&
    Math.abs(a.width - b.width) < EPS &&
    Math.abs(a.length - b.length) < EPS
  );
}

function splitRegion(region: CutRegion, axis: CutAxis, position: number, kerf: number): [CutRegion, CutRegion] {
  const { start, size } = span(region, axis);
  const end = start + size;
  const afterStart = Math.min(position + kerf, end);
  if (axis === 'x') {
    return [
      { ...region, width: position - start },
      { ...region, x: afterStart, width: end - afterStart },
    ];
  }
  return [
    { ...region, length: position - start },
    { ...region, y: afterStart, length: end - afterStart },
  ];
}

function findCut(region: CutRegion, parts: readonly CutRect[], axis: CutAxis, kerf: number): number | null {
  const { start, size } = span(region, axis);
  const end = start + size;
  const candidates = new Set<number>();
  for (const p of parts) {
    const s = span(p, axis);
    candidates.add(s.start + s.size);
    candidates.add(s.start - kerf);
  }
  const sorted = [...candidates].filter((c) => c > start + EPS && c < end - EPS).sort((a, b) => a - b);
  for (const c of sorted) {
    const cutEnd = c + kerf;
    const separates = parts.every((p) => {
      const s = span(p, axis);
      return s.start + s.size <= c + EPS || s.start >= cutEnd - EPS;
    });
    if (separates) return c;
  }
  return null;
}

class SequenceError extends Error {
  readonly reason: 'not-guillotine' | 'max-stages-exceeded';
  constructor(reason: 'not-guillotine' | 'max-stages-exceeded') {
    super(reason);
    this.reason = reason;
  }
}

function build(
  region: CutRegion,
  indices: readonly number[],
  parts: readonly CutRect[],
  kerf: number,
  parentAxis: CutAxis | null,
  parentStage: number,
  maxStages: number,
): CutTreeNode | null {
  if (region.width <= EPS || region.length <= EPS) return null;
  if (indices.length === 0) return { kind: 'residual', region };
  const local = indices.map((i) => parts[i] as CutRect);
  if (indices.length === 1 && sameRegion(region, local[0] as CutRect)) {
    return { kind: 'piece', region, partIndex: indices[0] as number };
  }

  // Prefer continuing on the parent axis so stages stay minimal.
  const axes: CutAxis[] = parentAxis === 'x' ? ['x', 'y'] : ['y', 'x'];
  for (const axis of axes) {
    const position = findCut(region, local, axis, kerf);
    if (position === null) continue;
    const stage = parentAxis === null ? 1 : axis === parentAxis ? parentStage : parentStage + 1;
    if (stage > maxStages) throw new SequenceError('max-stages-exceeded');
    const [beforeRegion, afterRegion] = splitRegion(region, axis, position, kerf);
    const beforeIdx = indices.filter((i) => {
      const s = span(parts[i] as CutRect, axis);
      return s.start + s.size <= position + EPS;
    });
    const afterIdx = indices.filter((i) => !beforeIdx.includes(i));
    const { start, size } = span(region, axis);
    return {
      kind: 'cut',
      region,
      axis,
      position,
      kerf: Math.min(kerf, start + size - position),
      stage,
      before: build(beforeRegion, beforeIdx, parts, kerf, axis, stage, maxStages),
      after: build(afterRegion, afterIdx, parts, kerf, axis, stage, maxStages),
    };
  }
  throw new SequenceError('not-guillotine');
}

function flatten(node: CutTreeNode | null, steps: CutStep[], residuals: CutRegion[]): number {
  if (node === null) return 0;
  if (node.kind === 'residual') {
    residuals.push(node.region);
    return 0;
  }
  if (node.kind === 'piece') return 0;
  steps.push({
    step: steps.length + 1,
    axis: node.axis,
    position: node.position,
    kerf: node.kerf,
    stage: node.stage,
    region: node.region,
  });
  return Math.max(node.stage, flatten(node.before, steps, residuals), flatten(node.after, steps, residuals));
}

/**
 * Derives an executable guillotine cut sequence for a sheet layout.
 *
 * Every cut spans the panel it divides edge to edge and removes `kerf` mm of
 * material. Layouts that require a non-through cut are reported as
 * `not-guillotine`.
 *
 * @param sheet Optimizer output for one sheet.
 * @param kerf Saw blade kerf in mm (≥ 0).
 * @param options Machine limits such as maximum stages.
 * @returns The sequence, or the reason it cannot be executed.
 * @throws RangeError When `kerf` is negative or not finite.
 */
export function buildCutSequence(sheet: CutSheet, kerf: number, options: CutSequenceOptions = {}): CutSequenceResult {
  if (!Number.isFinite(kerf) || kerf < 0) {
    throw new RangeError(`buildCutSequence: kerf must be a finite number ≥ 0, got ${kerf}`);
  }
  const maxStages = options.maxStages ?? Number.POSITIVE_INFINITY;
  const parts = sheet.parts;
  const outOfBounds = parts.some(
    (p) =>
      p.x < -EPS ||
      p.y < -EPS ||
      p.width <= 0 ||
      p.length <= 0 ||
      p.x + p.width > sheet.sheetWidth + EPS ||
      p.y + p.length > sheet.sheetLength + EPS,
  );
  if (outOfBounds) return { ok: false, reason: 'part-out-of-bounds' };

  const sheetRegion: CutRegion = { x: 0, y: 0, width: sheet.sheetWidth, length: sheet.sheetLength };
  let tree: CutTreeNode | null;
  try {
    tree = build(
      sheetRegion,
      parts.map((_, i) => i),
      parts,
      kerf,
      null,
      0,
      maxStages,
    );
  } catch (err) {
    if (err instanceof SequenceError) return { ok: false, reason: err.reason };
    throw err;
  }
  const root = tree ?? { kind: 'residual' as const, region: sheetRegion };
  const steps: CutStep[] = [];
  const residuals: CutRegion[] = [];
  const stages = flatten(root, steps, residuals);
  return { ok: true, sequence: { tree: root, steps, stages, residuals } };
}

/**
 * Geometry oracle: replays cut steps on the raw sheet and checks every cut
 * fully divides exactly one panel, no kerf touches a part, and each part ends
 * up as its own separated panel.
 *
 * @param sheet Sheet layout the steps were derived from.
 * @param steps Cut steps in execution order.
 * @returns `true` when the steps realise the layout.
 */
export function replayCutSequence(sheet: CutSheet, steps: readonly CutStep[]): boolean {
  let panels: CutRegion[] = [{ x: 0, y: 0, width: sheet.sheetWidth, length: sheet.sheetLength }];
  for (const step of steps) {
    const target = panels.findIndex(
      (p) =>
        Math.abs(p.x - step.region.x) < EPS &&
        Math.abs(p.y - step.region.y) < EPS &&
        Math.abs(p.width - step.region.width) < EPS &&
        Math.abs(p.length - step.region.length) < EPS,
    );
    if (target < 0) return false;
    const panel = panels[target] as CutRegion;
    const { start, size } = span(panel, step.axis);
    if (step.position <= start + EPS || step.position >= start + size - EPS) return false;
    const kerfEnd = step.position + step.kerf;
    const kerfHitsPart = sheet.parts.some((p) => {
      const s = span(p, step.axis);
      const o = span(p, step.axis === 'x' ? 'y' : 'x');
      const po = span(panel, step.axis === 'x' ? 'y' : 'x');
      const overlapsCrossAxis = o.start < po.start + po.size - EPS && o.start + o.size > po.start + EPS;
      return overlapsCrossAxis && s.start < kerfEnd - EPS && s.start + s.size > step.position + EPS;
    });
    if (kerfHitsPart) return false;
    const [a, b] = splitRegion(panel, step.axis, step.position, step.kerf);
    panels = [...panels.slice(0, target), a, b, ...panels.slice(target + 1)].filter(
      (p) => p.width > EPS && p.length > EPS,
    );
  }
  return sheet.parts.every((part) => panels.some((p) => sameRegion(p, part)));
}

import type { DefectZone, OffcutEntry, Part } from '../../src/engine/types';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import { getMaterial } from '../../src/engine/materials';

type Coverage =
  | 'small-sheet'
  | 'large-sheet'
  | 'long-strips'
  | 'mixed-materials'
  | 'mixed-thickness'
  | 'rotation-locks'
  | 'defects'
  | 'offcuts';

export interface OptimizerBenchmarkInputs {
  parts: Part[];
  sawKerfMm: number;
  sheetSizeOverrides: Record<string, { width: number; length: number }>;
  offcutCatalog: OffcutEntry[];
  defectZones: Record<string, DefectZone[]>;
}

export interface OptimizerBenchmarkScore {
  sheetCount: number;
  wasteMm2: number;
  cutCount: number;
  violationCount: number;
}

export interface OptimizerBenchmarkScenario {
  id: string;
  seed: number;
  coverage: Coverage[];
  inputs: OptimizerBenchmarkInputs;
  baseline: OptimizerBenchmarkScore;
}

function seededParts(
  prefix: string,
  seed: number,
  count: number,
  material: string,
  thickness: number,
  lengthRange: readonly [number, number],
  widthRange: readonly [number, number],
  rotationLockedEvery = 0,
): Part[] {
  let state = seed >>> 0;
  const nextInt = ([minimum, maximum]: readonly [number, number]) => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return minimum + (state % (maximum - minimum + 1));
  };

  return Array.from({ length: count }, (_, index) => {
    const id = `${prefix}-${index + 1}`;
    return {
      id,
      name: { en: id, he: id },
      qty: 1,
      material,
      thickness,
      length: nextInt(lengthRange),
      width: nextInt(widthRange),
      edgeBanding: { en: 'none', he: 'none' },
      ...(rotationLockedEvery > 0 && index % rotationLockedEvery === 0 ? { rotationLocked: true } : {}),
    };
  });
}

function makeScenario(
  id: string,
  seed: number,
  coverage: Coverage[],
  parts: Part[],
  baseline: OptimizerBenchmarkScore,
  options: Partial<Omit<OptimizerBenchmarkInputs, 'parts'>> = {},
): OptimizerBenchmarkScenario {
  return {
    id,
    seed,
    coverage,
    inputs: {
      parts,
      sawKerfMm: 3,
      sheetSizeOverrides: {},
      offcutCatalog: [],
      defectZones: {},
      ...options,
    },
    baseline,
  };
}

export function buildOptimizerBenchmarkCorpus(): OptimizerBenchmarkScenario[] {
  return [
    makeScenario(
      'small-sheet',
      327001,
      ['small-sheet'],
      seededParts('small', 327001, 10, 'melamine-16', 16, [100, 350], [100, 350]),
      { sheetCount: 2, wasteMm2: 562433, cutCount: 10, violationCount: 0 },
      { sheetSizeOverrides: { 'melamine-16': { width: 600, length: 900 } } },
    ),
    makeScenario(
      'large-sheet',
      327002,
      ['large-sheet'],
      seededParts('large', 327002, 12, 'melamine-16', 16, [300, 900], [250, 800]),
      { sheetCount: 1, wasteMm2: 4849016, cutCount: 12, violationCount: 0 },
      { sheetSizeOverrides: { 'melamine-16': { width: 2000, length: 4000 } } },
    ),
    makeScenario(
      'long-strips',
      327003,
      ['long-strips'],
      seededParts('strip', 327003, 10, 'melamine-16', 16, [1500, 2300], [30, 100]),
      { sheetCount: 1, wasteMm2: 1547056, cutCount: 10, violationCount: 0 },
    ),
    makeScenario(
      'mixed-thickness',
      327004,
      ['mixed-materials', 'mixed-thickness'],
      [
        ...seededParts('thin', 327004, 6, 'melamine-16', 16, [150, 550], [150, 550]),
        ...seededParts('thick', 327004, 6, 'plywood-18', 18, [150, 550], [150, 550]),
      ],
      { sheetCount: 2, wasteMm2: 4687974, cutCount: 12, violationCount: 0 },
    ),
    makeScenario(
      'rotation-locks',
      327005,
      ['rotation-locks'],
      seededParts('locked', 327005, 12, 'melamine-16', 16, [200, 650], [150, 600], 2),
      { sheetCount: 3, wasteMm2: 567791, cutCount: 12, violationCount: 0 },
      { sheetSizeOverrides: { 'melamine-16': { width: 800, length: 1000 } } },
    ),
    makeScenario(
      'defect-zones',
      327006,
      ['defects'],
      seededParts('defect', 327006, 10, 'melamine-16', 16, [100, 350], [100, 350]),
      { sheetCount: 1, wasteMm2: 358545, cutCount: 10, violationCount: 0 },
      {
        sheetSizeOverrides: { 'melamine-16': { width: 800, length: 1200 } },
        defectZones: {
          'melamine-16': [
            { x: 0, y: 0, width: 220, length: 320 },
            { x: 580, y: 760, width: 180, length: 300 },
          ],
        },
      },
    ),
    makeScenario(
      'offcut-reuse',
      327007,
      ['offcuts'],
      seededParts('offcut', 327007, 10, 'melamine-16', 16, [150, 400], [150, 400]),
      { sheetCount: 2, wasteMm2: 3015843, cutCount: 10, violationCount: 0 },
      {
        offcutCatalog: [
          {
            id: 'bench-offcut-1',
            material: 'melamine-16',
            thickness: 16,
            width: 700,
            length: 1100,
            addedAt: 327007,
          },
        ],
      },
    ),
  ];
}

export const OPTIMIZER_BENCHMARK_CORPUS = buildOptimizerBenchmarkCorpus();

export function runOptimizerBenchmarkScenario(scenario: OptimizerBenchmarkScenario) {
  const { parts, sawKerfMm, sheetSizeOverrides, offcutCatalog, defectZones } = scenario.inputs;
  return optimizeCutSheets(parts, sawKerfMm, sheetSizeOverrides, 'freeform', offcutCatalog, defectZones);
}

export function findOptimizerBenchmarkViolations(scenario: OptimizerBenchmarkScenario): string[] {
  const result = runOptimizerBenchmarkScenario(scenario);
  const { parts, sawKerfMm, defectZones } = scenario.inputs;
  const violations: string[] = [];
  const sourceById = new Map(parts.map((part) => [part.id, part]));
  const placements = result.sheets.flatMap((sheet) => sheet.parts.map((part) => ({ sheet, part })));
  const placedCountById = new Map<string, number>();

  for (const { sheet, part } of placements) {
    const source = sourceById.get(part.partId);
    if (!source) {
      violations.push(`unknown part ${part.partId}`);
      continue;
    }
    placedCountById.set(part.partId, (placedCountById.get(part.partId) ?? 0) + 1);
    if (source.material !== sheet.material || source.thickness !== sheet.thickness) {
      violations.push(`material or thickness mismatch for ${part.partId}`);
    }
    if (
      part.x < 0 ||
      part.y < 0 ||
      part.x + part.width > sheet.sheetWidth ||
      part.y + part.length > sheet.sheetLength
    ) {
      violations.push(`out-of-bounds placement for ${part.partId}`);
    }
    if (source.rotationLocked && part.rotated) violations.push(`rotation lock violated for ${part.partId}`);

    for (const zone of defectZones[sheet.material] ?? []) {
      const overlapsDefect =
        part.x < zone.x + zone.width &&
        part.x + part.width > zone.x &&
        part.y < zone.y + zone.length &&
        part.y + part.length > zone.y;
      if (overlapsDefect) violations.push(`defect overlap for ${part.partId}`);
    }
  }

  for (const source of parts) {
    if ((placedCountById.get(source.id) ?? 0) !== source.qty) {
      violations.push(`part count mismatch for ${source.id}`);
    }
  }

  for (const sheet of result.sheets) {
    if (sheet.thickness !== getMaterial(sheet.material).thickness) {
      violations.push(`sheet thickness mismatch for ${sheet.material}`);
    }
    for (let firstIndex = 0; firstIndex < sheet.parts.length; firstIndex += 1) {
      const first = sheet.parts[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < sheet.parts.length; secondIndex += 1) {
        const second = sheet.parts[secondIndex];
        const horizontalGap = Math.max(second.x - (first.x + first.width), first.x - (second.x + second.width));
        const verticalGap = Math.max(second.y - (first.y + first.length), first.y - (second.y + second.length));
        if (horizontalGap < sawKerfMm && verticalGap < sawKerfMm) {
          violations.push(`overlap or kerf violation between ${first.partId} and ${second.partId}`);
        }
      }
    }
  }

  return violations;
}

export function scoreOptimizerBenchmarkScenario(scenario: OptimizerBenchmarkScenario): OptimizerBenchmarkScore {
  const result = runOptimizerBenchmarkScenario(scenario);
  return {
    sheetCount: result.totalSheets,
    wasteMm2: result.totalWaste,
    cutCount: result.sheets.reduce((count, sheet) => count + sheet.parts.length, 0),
    violationCount: findOptimizerBenchmarkViolations(scenario).length,
  };
}

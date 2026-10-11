export const PROPERTY_SEEDS = {
  'tests/engine/box-joint.test.ts': 303001,
  'tests/engine/cove-cut.test.ts': 303012,
  'tests/engine/cost-estimator.test.ts': 303002,
  'tests/engine/cut-optimizer.property.test.ts': 303003,
  'tests/engine/dimensions.test.ts': 303004,
  'tests/engine/geometry-invariants.property.test.ts': 303005,
  'tests/engine/material-yield.test.ts': 303006,
  'tests/engine/materials.test.ts': 303007,
  'tests/engine/parameter-expressions.test.ts': 303008,
  'tests/engine/parts.test.ts': 303009,
  'tests/engine/stair-stringer.test.ts': 303013,
  'tests/engine/stair-taper-invariants.property.test.ts': 303010,
  'tests/engine/honing-guide.test.ts': 303014,
  'tests/engine/kerf-bending.test.ts': 303011,
} as const;

export type PropertyTestFile = keyof typeof PROPERTY_SEEDS;

export function propertyRunOptions(file: PropertyTestFile, numRuns: number): { numRuns: number; seed: number } {
  return { numRuns, seed: PROPERTY_SEEDS[file] };
}

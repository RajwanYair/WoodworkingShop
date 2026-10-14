/**
 * @packageDocumentation
 * Stable public engine API, composed from the curated domain barrels.
 */

export * from './assembly/index';

export * from './calculators/index';

export * from './core/index';

export * from './costing/index';

export * from './export/index';

export * from './geometry/index';

export * from './hardware/index';

export * from './joinery/index';

export * from './materials/index';

export * from './optimizer/index';

export * from './project/index';

export * from './room/index';

export * from './workshop/index';

/** @deprecated Import browser transport functions from `src/utils/webserial-cnc.ts`. */
export {
  isWebSerialAvailable,
  connectToMachine,
  streamGcodeLines,
  disconnectFromMachine,
} from '../utils/webserial-cnc';

export type { SerialPortHandle } from '../utils/webserial-cnc';

export { estimateCost } from './costing/index';

export type { CostBreakdown } from './costing/index';

export type { SheetCost } from './costing/index';

export type { HardwareCost } from './costing/index';

export { getTemplate } from './project/index';

export type { CabinetTemplate } from './project/index';

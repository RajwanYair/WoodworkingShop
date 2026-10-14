import type { CabinetConfig, DerivedDimensions, HardwareItem, OptimizationResult, Part } from '../engine/core/types';
import type { AssemblyStep } from '../engine/assembly/assembly';
import type { estimateCost } from '../engine/costing/cost-estimator';
import type { CabinetEntry } from './slices/cabinetTypes';
import type { CabinetPatch } from './slices/cabinetHistory';
import type { CatalogSlice } from './slices/catalogSlice';
import type { NamedExpressionsSlice } from './slices/namedExpressionsSlice';
import type { OptimizerSettingsSlice } from './slices/optimizerSettingsSlice';
import type { ProjectSlice } from './slices/projectSlice';
import type { SnapshotSlice } from './slices/snapshotSlice';
import type { UiSlice } from './slices/uiSlice';

export type CabinetState = {
  cabinets: CabinetEntry[];
  activeCabinetIndex: number;
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number;
  cost: ReturnType<typeof estimateCost>;
  assemblySteps: AssemblyStep[];
  allParts: Part[];
  combinedOptimization: OptimizationResult;
  optimizationPending: boolean;
  costPending: boolean;
  assemblyPending: boolean;
  _past: CabinetPatch[];
  _future: CabinetPatch[];
  canUndo: boolean;
  canRedo: boolean;
  beginHistoryGroup: () => void;
  endHistoryGroup: () => void;
  rotationLockedPartIds: Record<string, boolean>;
  setConfig: (patch: Partial<CabinetConfig>) => void;
  resetConfig: () => void;
  undo: () => void;
  redo: () => void;
  addCabinet: () => void;
  removeCabinet: (index: number) => void;
  duplicateCabinet: (index: number) => void;
  mirrorCabinet: (index: number) => void;
  moveCabinet: (index: number, direction: 'up' | 'down') => void;
  setActiveCabinet: (index: number) => void;
  renameCabinet: (index: number, name: string) => void;
  setNotes: (index: number, notes: string) => void;
  toggleRotationLock: (partId: string) => void;
  loadProject: (cabinets: CabinetEntry[]) => void;
  bulkReplaceMaterial: (fromKey: string, toKey: string) => void;
} & UiSlice &
  ProjectSlice &
  CatalogSlice &
  OptimizerSettingsSlice &
  SnapshotSlice &
  NamedExpressionsSlice;

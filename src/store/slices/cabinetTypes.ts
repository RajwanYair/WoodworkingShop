import type { CabinetConfig } from '../../engine/core/types';

export interface CabinetEntry {
  name: string;
  config: CabinetConfig;
  notes?: string;
}

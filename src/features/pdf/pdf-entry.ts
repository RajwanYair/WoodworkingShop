import type { CabinetConfig, DerivedDimensions, HardwareItem, Part } from '../../engine/core/types';

/** One cabinet's computed data, passed to the project-PDF export. */
export interface CabinetPdfEntry {
  name: string;
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  edgeBandingTotal: number;
}

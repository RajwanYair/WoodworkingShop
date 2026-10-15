import type { MaterialTexture } from '../../engine/materials/material-textures';
import type { UnitSystem } from '../../utils/units';

export interface IsometricSceneProps {
  ox: number;
  oy: number;
  T: number;
  W: number;
  D: number;
  BT: number;
  H: number;
  w: number;
  h: number;
  d: number;
  thick: number;
  bt: number;
  kickHeight: number;
  hasDoors: boolean;
  interiorFill: string;
  topFill: string;
  sideFill: string;
  frontFill: string;
  KH: number;
  sc: number;
  shelfPositions: readonly number[];
  centreSupportCount: number;
  tex: MaterialTexture | undefined;
  grainStep: number;
  drawerFronts: readonly { y: number; fh: number }[];
  doorCount: number;
  doorReveal: number;
  doorWidth: number;
  doorHeight: number;
  doorStyle: string;
  resourceIds: { handle: string };
  showDims: boolean;
  units: UnitSystem;
}

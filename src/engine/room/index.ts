/** Curated public exports for the room engine domain. */

export {
  FALLBACK_CAPABILITIES,
  DEFAULT_LIGHT,
  DEFAULT_RENDER_OPTIONS,
  buildBoxMesh,
  buildCabinetScene,
  getMeshBounds,
  getSceneBounds,
  centerScene,
  applyExplodeFactor,
} from './webgpu-renderer';

export type {
  RendererTier,
  RendererCapabilities,
  Vec3,
  Bounds3,
  CabinetMesh,
  SceneLight,
  CabinetScene,
  RenderOptions,
} from './webgpu-renderer';

export { computeArPlacements, validatePlacement, snapToGrid } from './webxr-placement';

export type {
  AabbMetres,
  RoomSurface,
  CabinetFootprint,
  PlacementCandidate,
  ArPlacementResult,
  PlacementObstacle,
} from './webxr-placement';

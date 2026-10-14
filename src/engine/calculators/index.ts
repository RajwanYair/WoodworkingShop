/** Curated public exports for the calculators engine domain. */

export {
  KERF_PROFILES,
  compensateDimension,
  compensatePart,
  estimateKerfLoss,
  kerfLossPercent,
  getKerfProfile,
} from './kerf';

export type { KerfProfile, KerfPart, KerfCompensatedPart } from './kerf';

export {
  validateIso7171,
  formatIso7171Report,
  filterViolations,
  ISO7171_MODULE_WIDTHS,
  ISO7171_MODULE_TOLERANCE,
  ISO7171_BASE_HEIGHT,
  ISO7171_WALL_HEIGHT,
  ISO7171_BASE_DEPTH,
  ISO7171_WALL_DEPTH,
  ISO7171_TOE_KICK,
  ISO7171_MIN_SHELF_GAP,
  ISO7171_MAX_SHELVES_TALL,
  ISO7171_MAX_SHELVES_BASE,
  ISO7171_DRAWER_HEIGHT,
  ISO7171_MAX_WIDTH_HEIGHT_RATIO,
} from './iso7171';

export type { Iso7171RuleId, Iso7171ComplianceLevel, Iso7171Violation, Iso7171Report } from './iso7171';

export {
  calculateFeedRate,
  recommendDepthPerPass,
  recommendStepover,
  MATERIAL_HARDNESS,
  CUTTER_TYPES,
} from './feed-rate';

export type {
  MaterialHardness,
  CutterType,
  FeedRateInput,
  FeedRateResult,
  DepthRecommendationInput,
  DepthRecommendation,
} from './feed-rate';

export { calculatePocketHole, selectScrewLength, selectThreadType, POCKET_SCREW_LENGTHS } from './pocket-hole';

export type { ScrewHeadType, JointType, PocketHoleInput, PocketHoleResult } from './pocket-hole';

export { calculateDrillSpeed, maxBitDiameter, MATERIAL_SFM, BIT_TYPE_FACTOR } from './drill-speed';

export type { DrillBitType, DrillMaterial, DrillSpeedInput, DrillSpeedResult } from './drill-speed';

export { calculatePolygonMiter, calculateCompoundMiter, calculateCrownMolding } from './miter-angle';

export type {
  PolygonMiterInput,
  PolygonMiterResult,
  CompoundMiterInput,
  CompoundMiterResult,
  CrownMoldingInput,
  CrownMoldingResult,
} from './miter-angle';

export { calculateShelfPins, totalPinsNeeded, SHELF_PIN_DIAMETERS } from './shelf-pin';

export type { ShelfPinDiameter, PinPatternStyle, ShelfPinInput, PinHole, ShelfPinResult } from './shelf-pin';

export { estimateWoodDryingTime, calculateEMC } from './wood-drying';

export type { DryingMethod, SpeciesDensityClass, WoodDryingInput, WoodDryingResult } from './wood-drying';

export { calculateDeflection, getModulus } from './shelf-deflection';

export type { LoadType, ShelfMaterial, DeflectionInput, DeflectionResult } from './shelf-deflection';

export { calculateRouterDepth, getRecommendedRpm } from './router-depth';

export type {
  RouterOperation,
  MaterialHardness as RouterMaterialHardness,
  RouterDepthInput,
  RouterPass,
  RouterDepthResult,
} from './router-depth';

export { calculatePilotHole } from './pilot-hole';

export type { WoodHardness, ScrewGauge, PilotHoleInput, PilotHoleResult } from './pilot-hole';

export { calculateGlueUpTime } from './glue-up-time';

export type { GlueType as GlueUpGlueType, GlueUpInput, GlueUpResult } from './glue-up-time';

export { calculateBandsawSpeed } from './bandsaw-speed';

export type { BandsawMaterial, BladeToothType, BandsawSpeedInput, BandsawSpeedResult } from './bandsaw-speed';

export { calculateTablesawBladeHeight } from './tablesaw-blade';

export type { TablesawCutType, TablesawBladeInput, TablesawBladeResult } from './tablesaw-blade';

export { calculateFaceFrame } from './face-frame';

export type { FaceFrameInput, FaceFramePart, FaceFrameResult } from './face-frame';

export { calculateScrewPullout } from './screw-pullout';

export type { WoodDensityClass, SafetyRating, ScrewPulloutInput, ScrewPulloutResult } from './screw-pullout';

export { calculateKerfBending } from './kerf-bending';

export type { KerfMaterial, KerfBendingInput, KerfBendingResult } from './kerf-bending';

export { calculateFinishingCoat } from './finishing-coat';

export type { FinishType, FinishingCoatInput, FinishingCoatResult } from './finishing-coat';

export { calculateWoodTurning } from './wood-turning';

export type { TurningOperation, WoodTurningInput, WoodTurningResult } from './wood-turning';

export { calculateFramePanel } from './frame-panel';

export type { FramePanelInput, FramePanelResult } from './frame-panel';

export { calculateTaperJig } from './taper-jig';

export type { TaperJigInput, TaperJigResult } from './taper-jig';

export { calculateStairStringer } from './stair-stringer';

export type { StairStringerInput, StairStringerResult } from './stair-stringer';

export { calculateGlueCoverage } from './glue-coverage';

export type { WoodGlueType, GlueCoverageInput, GlueCoverageResult } from './glue-coverage';

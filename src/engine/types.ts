// ─── Core domain types for the cabinet planner engine ───

// ─── Phase 11: Branded / nominal measurement types ────────────────────────────
// Zero runtime cost — the brand field is `never` so it is never set at runtime.
// These prevent accidental unit-mixing between mm, kg, and percent values in
// engine function signatures. Plain `number` must be explicitly cast via the
// `asMm` / `asKg` / `asPct` helpers to produce a branded value.
declare const __mmTag: unique symbol;
declare const __kgTag: unique symbol;
declare const __pctTag: unique symbol;

/** A `number` that represents millimetres. */
export type Mm = number & { readonly [__mmTag]: true };
/** A `number` that represents kilograms. */
export type Kg = number & { readonly [__kgTag]: true };
/** A `number` in the range 0–100 representing a percentage. */
export type Percent = number & { readonly [__pctTag]: true };

/** Cast helper — tag a plain `number` as millimetres. */
export const asMm = (n: number): Mm => n as Mm;
/** Cast helper — tag a plain `number` as kilograms. */
export const asKg = (n: number): Kg => n as Kg;
/** Cast helper — tag a plain `number` as a percentage (0–100). */
export const asPct = (n: number): Percent => n as Percent;
// ──────────────────────────────────────────────────────────────────────────────

// ─── Phase 11: Result<T,E> — explicit error returns ─────────────────────────
// A minimal discriminated union for engine functions that can fail without
// throwing.  Use `ok()` / `err()` constructors; narrow with `result.ok`.

/** A successful result holding a value of type `T`. */
export type Ok<T> = { readonly ok: true; readonly value: T };
/** A failure result holding an error of type `E`. */
export type Err<E> = { readonly ok: false; readonly error: E };
/** Discriminated union of success and failure. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Construct a successful `Result`. */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
/** Construct a failed `Result`. */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
// ──────────────────────────────────────────────────────────────────────────────

export type Lang = 'en' | 'he';

export type MaterialCategory = 'panel' | 'back' | 'door';

export interface Material {
  key: string;
  name: { en: string; he: string };
  thickness: number; // mm
  sheetWidth: number; // mm (standard 1220)
  sheetLength: number; // mm (standard 2440)
  pricePerSheet?: number; // optional cost estimation
  category: MaterialCategory;
  color: string; // hex for preview rendering
  /** When true the cut optimizer will not rotate parts 90 ° (grain direction must be preserved). */
  hasGrain: boolean;
  /** Material density in kg/m³ — used for weight estimation. */
  densityKgM3: number;
}

export type DoorStyle = 'flat' | 'shaker' | 'glass' | 'none';
export type EdgeBanding = 'all-visible' | 'doors-only' | 'none';

/**
 * Sprint 12 — Joinery type used to assemble the carcass.
 * Controls which validation rules apply and influences assembly instructions.
 *
 * - `pocket-screw` : Kreg-style pocket screws — fast, needs ≥ 15 mm stock.
 * - `dado`         : Dado/housing grooves — strong, needs ≥ 12 mm stock.
 * - `dowel`        : Wooden dowels — clean, needs ≥ 12 mm stock.
 * - `biscuit`      : Plate/biscuit joinery — medium strength, needs ≥ 12 mm and face ≥ 50 mm wide.
 * - `screw`        : Standard through-screws — simplest, no thickness constraint.
 */
export type JoineryType = 'pocket-screw' | 'dado' | 'dowel' | 'biscuit' | 'screw';
export type ShelfSpacing = 'equal' | 'custom';
export type HandleStyle = 'bar' | 'knob' | 'cup' | 'none';
export type FurnitureType = 'cabinet' | 'bookshelf' | 'desk' | 'wardrobe' | 'panel';
export type DrawerSlideType = 'standard' | 'soft-close' | 'full-extension';
/** Which material's thickness governs a plain panel's depth. */
export type PanelMaterialSource = 'carcass' | 'back';

/**
 * Sprint 10 — Vendor hinge profile descriptor.
 * Defines manufacturer-specific mounting rules and clearances for cup hinges.
 */
export interface VendorHingeProfile {
  /** Stable identifier, e.g. 'blum-clip-top-blumotion'. */
  id: string;
  /** Brand name, e.g. 'Blum'. */
  brand: string;
  /** Model name, e.g. 'CLIP top Blumotion 110°'. */
  model: string;
  /** Bilingual display name for UI. */
  name: { en: string; he: string };
  /** Standard cup bore diameter in mm (nearly always 35 mm for Euro hinges). */
  cupDiameter: number;
  /** Door opening angle in degrees. */
  openingAngle: number;
  /** Cup bore depth in mm. */
  mountingDepth: number;
  /** True when the damper is integrated — no separate soft-close add-on needed. */
  softCloseIntegrated: boolean;
  /** Minimum panel edge to cup bore centre distance (mm). Typical: 3 mm overlay + 16 mm = 19 mm. */
  minEdgeDistance: number;
  /** Link to supplier product page. */
  supplierUrl: string;
}

export interface CabinetConfig {
  // Furniture type
  furnitureType: FurnitureType;
  // External dimensions (mm)
  width: number;
  height: number;
  depth: number;

  // Structure
  shelfCount: number;
  shelfSpacing: ShelfSpacing;
  customShelfPositions: number[]; // mm from bottom, used when shelfSpacing === 'custom'
  /**
   * Number of full-height vertical centre supports / dividers added inside the
   * carcass to break long shelf spans into smaller bays. Each support divides
   * the shelf span (effectiveSpan = shelfWidth / (centreSupports + 1)), which
   * reduces deflection and increases the safe shelf load. Default 0.
   * Used by the "Add centre support" fix on shelf deflection / wide span issues.
   */
  shelfCentreSupports?: number;

  // Material
  carcassMaterial: string; // material key
  backPanelMaterial: string; // material key
  hasBack?: boolean; // Sprint A2: defaults to true; when false, no back panel is produced
  /** For furnitureType === 'panel': which material thickness determines the plate depth. Defaults to 'carcass'. */
  panelMaterialSource?: PanelMaterialSource;

  // Doors
  doorCount: 1 | 2;
  doorStyle: DoorStyle;
  doorReveal: number; // mm gap around doors (default 3)

  // Drawers
  drawerCount: number; // 0–4 drawers at bottom of cabinet
  /** Optional per-drawer box heights in mm. Index 0 = bottom drawer. Falls back to 150 mm. */
  drawerHeights?: number[];
  /** Drawer slide hardware type (default: 'standard'). */
  drawerSlideType?: DrawerSlideType;

  // Toe kick / plinth
  /** Plinth/toe-kick height in mm. 0 = no kick (flush-to-floor or wall-mounted). */
  kickHeight: number;

  // Hardware
  handleStyle: HandleStyle;
  /** Sprint 10 — vendor hinge profile id (e.g. 'blum-clip-top-blumotion'). When set, overrides generic hinge naming. */
  hingeProfile?: string;
  /** Override calculated qty for specific hardware items by item id (e.g. { 'H15': 6 }). */
  hardwareOverrides?: Record<string, number>;

  // Joinery
  /** Sprint 12 — joinery method used to assemble the carcass panels. Defaults to 'screw'. */
  joineryType?: JoineryType;

  // Edge banding
  edgeBanding: EdgeBanding;

  /**
   * Phase 11 / Sprint 5 — Cut optimizer algorithm.
   * - `'freeform'`   : MaxRects BSSF (default) — highest yield, arbitrary layouts.
   * - `'guillotine'` : Strip-based guillotine packing — lower yield but every cut
   *   runs edge-to-edge, compatible with standard panel saws.
   */
  cutMode?: 'guillotine' | 'freeform';

  // Language
  lang: Lang;
}

export interface DerivedDimensions {
  internalWidth: Mm;
  internalHeight: Mm;
  shelfDepth: Mm;
  shelfWidth: Mm;
  doorHeight: Mm;
  doorWidth: Mm;
  backPanelHeight: Mm;
  backPanelWidth: Mm;
  hingesPerDoor: number;
  hingePositions: Mm[]; // mm from top of door
  /** Per-shelf deflection results (one entry per shelf, Sprint 173). */
  shelfDeflections: Array<{
    deflectionMm: Mm;
    limitMm: Mm;
    overLimit: boolean;
    /** 'safe' ≤ L/360 · 'warning' L/360–L/240 · 'danger' > L/240 */
    deflectionRating: 'safe' | 'warning' | 'danger';
    /** Sprint 8 — maximum safe UDL load at L/360 limit (kg). */
    maxLoadKg: Kg;
  }>;
}

export interface Part {
  id: string;
  name: { en: string; he: string };
  qty: number;
  material: string; // material key
  thickness: number; // mm
  length: number; // mm (grain direction)
  width: number; // mm
  edgeBanding: { en: string; he: string };
  /** Sprint 16 — when true the cut-optimizer must not rotate this part 90°. */
  rotationLocked?: boolean;
}

export interface HardwareItem {
  id: string;
  name: { en: string; he: string };
  qty: number;
  unit: { en: string; he: string };
  /** Optional supplier product URL for reference. */
  supplierUrl?: string;
  /** Display name for the supplier (e.g. 'Blum', 'Häfele'). */
  supplierName?: string;
  /** Optional price per unit in local currency (for cost estimation). */
  unitPrice?: number;
}

export interface CutRect {
  partId: string;
  label: string;
  length: number; // mm
  width: number; // mm
  x: number; // placed x on sheet
  y: number; // placed y on sheet
  edgeBanding?: string; // edge banding description (e.g. 'Front edge', '4 edges')
  grainVertical: boolean; // true if grain (length) runs along the sheet Y axis
  rotated?: boolean; // true if the part was rotated 90° during placement
  /** true when the part belongs to a grain-constrained material but had to be
   *  rotated to fit the sheet — grain direction is compromised. */
  grainConflict?: boolean;
  /** Human-readable description of how the BSSF packer placed this part.
   *  Format: "BSSF(<orientation>[, grain-forced]): <short>mm × <long>mm margin" */
  rationale?: string;
  /** Sprint 16 — true when this part has a user-applied rotation lock (rotation was disallowed during packing). */
  rotationLocked?: boolean;
}

export interface CutSheet {
  sheetIndex: number;
  material: string;
  thickness: number;
  sheetLength: number;
  sheetWidth: number;
  parts: CutRect[];
  yieldPercent: number;
}

export interface OptimizationResult {
  sheets: CutSheet[];
  totalSheets: number;
  overallYield: number; // 0–100 %
  totalWaste: number; // mm²
  /** Number of parts placed with a grain direction conflict (rotated despite hasGrain=true). */
  grainConflictCount: number;
}

export type SmartStrategy =
  | 'reduce-depth'
  | 'co-nest-strips'
  | 'adjust-width'
  | 'adjust-height'
  | 'material-swap'
  | 'shelf-count-reduce'
  | 'exhaustive';

export interface OptimizationSuggestion {
  originalConfig: CabinetConfig;
  optimizedConfig: CabinetConfig;
  originalResult: OptimizationResult;
  optimizedResult: OptimizationResult;
  savings: {
    sheetsRemoved: number;
    yieldImprovement: number; // percentage points
    wasteReduced: number; // mm²
  };
  strategy: SmartStrategy;
  explanation: { en: string; he: string };
  score: number; // lower is better: sheets×1000 - yield
}

// ─── Validation types ───

export type ValidationSeverity = 'error' | 'warning' | 'info';

/** A configuration issue raised by `validateConfig()`. */
export interface ValidationIssue {
  /** Machine-readable code for the issue (stable across app versions). */
  code: string;
  severity: ValidationSeverity;
  /** Human-readable message in both UI languages. */
  message: { en: string; he: string };
  /** The config field most responsible for this issue, if any. */
  field?: keyof CabinetConfig;
  /** Suggested value to resolve the issue, if applicable. */
  suggestedValue?: number | string;
  /**
   * Rich, multi-field programmatic fix. When present, the UI applies
   * `fix.patch` via `setConfig` instead of using the legacy `field`/
   * `suggestedValue` pair. `labelKey` is an i18n key for the Fix button.
   * v3.58.0 — guarantees every actionable suggestion has a one-click fix.
   */
  fix?: {
    patch: Partial<CabinetConfig>;
    labelKey?: string;
  };
}

// ─── Validation rule registry types (Phase 12 / Sprint 9) ────────────────────

/**
 * Context object passed to each `ValidationRule.check()` invocation.
 * Contains pre-computed dimensions and resolved materials so rules do not need
 * to re-derive these expensive values themselves.
 */
export interface ValidationContext {
  /** Pre-computed derived dimensions for the cabinet configuration. */
  dims: DerivedDimensions;
  /** Resolved carcass panel material, or `undefined` if the key is unknown. */
  mat: Material | undefined;
  /** Resolved back-panel material, or `undefined` if the key is unknown or `hasBack` is false. */
  backMat: Material | undefined;
}

/**
 * Phase 12 / Sprint 9 — A single pluggable validation rule.
 *
 * Implement this interface and call `registerRule()` to add custom structural
 * or manufacturing constraints alongside the engine's built-in rules.
 *
 * @example
 * ```ts
 * import { registerRule } from '../engine/validation';
 * registerRule({
 *   id: 'MY_MIN_WIDTH',
 *   severity: 'warning',
 *   check(cfg, { mat }) {
 *     const t = mat?.thickness ?? 18;
 *     if (cfg.width < 300 + 2 * t) {
 *       return [{ code: 'MY_MIN_WIDTH', severity: 'warning',
 *                 message: { en: 'Too narrow', he: 'צר מדי' } }];
 *     }
 *     return [];
 *   },
 * });
 * ```
 */
export interface ValidationRule {
  /** Unique machine-readable identifier for this rule. */
  id: string;
  /** Default severity. Individual issues emitted by `check` may use a different severity. */
  severity: ValidationSeverity;
  /**
   * If provided, the rule only runs when `config.furnitureType` is in this list.
   * Omit (or pass `undefined`) to run for every furniture type.
   */
  furnitureTypes?: readonly FurnitureType[];
  /**
   * Pure check function. Returns zero or more `ValidationIssue` objects found
   * in the given config. Must not mutate `cfg`, `ctx`, or any inputs.
   */
  check(cfg: CabinetConfig, ctx: ValidationContext): ValidationIssue[];
}

// ─── Material substitution types ───

/** A recommended alternative material with rationale. */
/** Quantitative metrics that back a MaterialSubstitution recommendation. */
export interface QuantitativeRationale {
  /** Weight saved per standard sheet compared to the current material (kg). */
  savedKgPerSheet?: number;
  /** Percentage reduction in mid-span bending deflection (positive = less sag). */
  deflectionReductionPct?: number;
  /** Percentage change in material cost relative to current (negative = cheaper). */
  costDeltaPct?: number;
}

export interface MaterialSubstitution {
  /** Key of the current material. */
  currentKey: string;
  /** Key of the recommended alternative. */
  suggestedKey: string;
  /** Short rationale for the switch. */
  reason: { en: string; he: string };
  /** Expected benefit: 'deflection' | 'cost' | 'weight'. */
  benefit: 'deflection' | 'cost' | 'weight';
  /** Optional quantitative data supporting the recommendation. */
  quantitativeRationale?: QuantitativeRationale;
}

// ─── Multi-cabinet room layout (Phase 7) ─────────────────────────────────────

/**
 * A single cabinet placed inside a room layout.
 * The x/y coordinates are the top-left corner of the cabinet's footprint
 * on the room floor-plan, measured in millimetres from the room origin.
 */
export interface RoomCabinet {
  /** Unique instance id within the room (UUID-style string). */
  id: string;
  /** Human-readable label for this cabinet instance. */
  name: string;
  /** Footprint origin — distance from the left wall in mm. */
  x: number;
  /** Footprint origin — distance from the top/back wall in mm. */
  y: number;
  /** Cabinet width in mm (mirrors CabinetConfig.width). */
  width: number;
  /** Cabinet depth in mm (mirrors CabinetConfig.depth). */
  depth: number;
  /** Optional rotation in degrees (0 | 90 | 180 | 270). */
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * A complete room layout composed of zero or more cabinet instances.
 */
export interface RoomLayout {
  /** Stable identifier for the layout. */
  id: string;
  /** Human-readable room name, e.g. 'Kitchen'. */
  name: string;
  /** Room width in mm (left-to-right wall). */
  roomWidth: number;
  /** Room depth in mm (front-to-back wall). */
  roomDepth: number;
  /** Cabinet instances placed in this room. */
  cabinets: RoomCabinet[];
}

// ─── Core domain types for the cabinet planner engine ───

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
export type ShelfSpacing = 'equal' | 'custom';
export type HandleStyle = 'bar' | 'knob' | 'cup' | 'none';
export type FurnitureType = 'cabinet' | 'bookshelf' | 'desk' | 'wardrobe' | 'panel';
export type DrawerSlideType = 'standard' | 'soft-close' | 'full-extension';
/** Which material's thickness governs a plain panel's depth. */
export type PanelMaterialSource = 'carcass' | 'back';

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

  // Edge banding
  edgeBanding: EdgeBanding;

  // Language
  lang: Lang;
}

export interface DerivedDimensions {
  internalWidth: number;
  internalHeight: number;
  shelfDepth: number;
  shelfWidth: number;
  doorHeight: number;
  doorWidth: number;
  backPanelHeight: number;
  backPanelWidth: number;
  hingesPerDoor: number;
  hingePositions: number[]; // mm from top of door
  /** Per-shelf deflection results (one entry per shelf, Sprint 173). */
  shelfDeflections: Array<{
    deflectionMm: number;
    limitMm: number;
    overLimit: boolean;
    /** 'safe' ≤ L/360 · 'warning' L/360–L/240 · 'danger' > L/240 */
    deflectionRating: 'safe' | 'warning' | 'danger';
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
}

export type SmartStrategy =
  | 'reduce-depth'
  | 'co-nest-strips'
  | 'adjust-width'
  | 'adjust-height'
  | 'material-swap'
  | 'shelf-count-reduce';

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

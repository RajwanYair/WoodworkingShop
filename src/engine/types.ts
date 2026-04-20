// ─── Core domain types for the cabinet planner engine ───

export type Lang = 'en' | 'he';

export type MaterialCategory = 'panel' | 'back' | 'door';

export interface Material {
  key: string;
  name: { en: string; he: string };
  thickness: number;       // mm
  sheetWidth: number;      // mm (standard 1220)
  sheetLength: number;     // mm (standard 2440)
  pricePerSheet?: number;  // optional cost estimation
  category: MaterialCategory;
  color: string;           // hex for preview rendering
}

export type DoorStyle = 'flat' | 'none';
export type EdgeBanding = 'all-visible' | 'doors-only' | 'none';
export type ShelfSpacing = 'equal' | 'custom';
export type HandleStyle = 'bar' | 'knob' | 'cup' | 'none';
export type FurnitureType = 'cabinet' | 'bookshelf';

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
  customShelfPositions: number[];  // mm from bottom, used when shelfSpacing === 'custom'

  // Material
  carcassMaterial: string;     // material key
  backPanelMaterial: string;   // material key

  // Doors
  doorCount: 1 | 2;
  doorStyle: DoorStyle;
  doorReveal: number;  // mm gap around doors (default 3)

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
  hingePositions: number[];  // mm from top of door
}

export interface Part {
  id: string;
  name: { en: string; he: string };
  qty: number;
  material: string;       // material key
  thickness: number;      // mm
  length: number;         // mm (grain direction)
  width: number;          // mm
  edgeBanding: { en: string; he: string };
}

export interface HardwareItem {
  id: string;
  name: { en: string; he: string };
  qty: number;
  unit: { en: string; he: string };
}

export interface CutRect {
  partId: string;
  label: string;
  length: number;  // mm
  width: number;   // mm
  x: number;       // placed x on sheet
  y: number;       // placed y on sheet
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
  overallYield: number;     // 0–100 %
  totalWaste: number;       // mm²
}

export type SmartStrategy =
  | 'reduce-depth'
  | 'co-nest-strips'
  | 'adjust-width'
  | 'adjust-height'
  | 'material-swap';

export interface OptimizationSuggestion {
  originalConfig: CabinetConfig;
  optimizedConfig: CabinetConfig;
  originalResult: OptimizationResult;
  optimizedResult: OptimizationResult;
  savings: {
    sheetsRemoved: number;
    yieldImprovement: number;  // percentage points
    wasteReduced: number;      // mm²
  };
  strategy: SmartStrategy;
  explanation: { en: string; he: string };
  score: number;  // lower is better: sheets×1000 - yield
}

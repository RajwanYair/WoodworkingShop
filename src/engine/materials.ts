import type { Material, CabinetConfig } from './types';

// ─── Material database ───

/** The built-in material catalogue. Use `getMaterial(key)` to look up by key. */
export const MATERIALS: Material[] = [
  // 17–18 mm panels (carcass, doors, shelves)
  {
    key: 'plywood-17',
    name: { en: 'Sandwich Plywood 17 mm', he: 'פנלפלק 17 מ"מ' },
    thickness: 17,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 180,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#C8B88A',
    hasGrain: true,
    densityKgM3: 620,
  },
  {
    key: 'plywood-18',
    name: { en: 'Birch Plywood 18 mm', he: 'דיקט ליבנה 18 מ"מ' },
    thickness: 18,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 260,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#D4C4A0',
    hasGrain: true,
    densityKgM3: 640,
  },
  {
    key: 'melamine-16',
    name: { en: 'Melamine 16 mm', he: 'מלמין 16 מ"מ' },
    thickness: 16,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 140,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#F5F0E8',
    hasGrain: false,
    densityKgM3: 700,
  },
  {
    key: 'melamine-18',
    name: { en: 'Melamine 18 mm', he: 'מלמין 18 מ"מ' },
    thickness: 18,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 165,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#F5F0E8',
    hasGrain: false,
    densityKgM3: 700,
  },
  {
    key: 'mdf-16',
    name: { en: 'MDF 16 mm', he: 'אם.די.אף 16 מ"מ' },
    thickness: 16,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 120,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#BFA87A',
    hasGrain: false,
    densityKgM3: 780,
  },
  {
    key: 'mdf-18',
    name: { en: 'MDF 18 mm', he: 'אם.די.אף 18 מ"מ' },
    thickness: 18,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 145,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#BFA87A',
    hasGrain: false,
    densityKgM3: 780,
  },
  {
    key: 'chipboard-16',
    name: { en: 'Chipboard 16 mm', he: 'שבבית 16 מ"מ' },
    thickness: 16,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 85,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#C9B97A',
    hasGrain: false,
    densityKgM3: 640,
  },
  {
    key: 'chipboard-18',
    name: { en: 'Chipboard 18 mm', he: 'שבבית 18 מ"מ' },
    thickness: 18,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 100,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#C9B97A',
    hasGrain: false,
    densityKgM3: 640,
  },
  {
    key: 'osb-18',
    name: { en: 'OSB 18 mm', he: 'או.אס.בי 18 מ"מ' },
    thickness: 18,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 95,
    currencyCode: 'ILS',
    category: 'panel',
    color: '#D4B87A',
    hasGrain: true,
    densityKgM3: 640,
  },

  // Thin panels (back)
  {
    key: 'plywood-4',
    name: { en: 'Plywood 4 mm (back)', he: 'דיקט 4 מ"מ (גב)' },
    thickness: 4,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 65,
    currencyCode: 'ILS',
    category: 'back',
    color: '#E8D8B0',
    hasGrain: true,
    densityKgM3: 600,
  },
  {
    key: 'mdf-3',
    name: { en: 'MDF/HDF 3 mm (back)', he: 'סיבית 3 מ"מ (גב)' },
    thickness: 3,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 50,
    currencyCode: 'ILS',
    category: 'back',
    color: '#D4C4A0',
    hasGrain: false,
    densityKgM3: 800,
  },

  // Glass (doors — pre-cut to size)
  {
    key: 'tempered-glass-4',
    name: { en: 'Tempered Glass 4 mm', he: 'זכוכית מחוסמת 4 מ"מ' },
    thickness: 4,
    sheetWidth: 1220,
    sheetLength: 2440,
    pricePerSheet: 220,
    currencyCode: 'ILS',
    category: 'door',
    color: '#b8d8f0',
    hasGrain: false,
    densityKgM3: 2500,
  },
];

/** Standard saw kerf allowance added between parts by the cut optimizer (mm). */
export const SAW_KERF = 4; // mm

// ─── Lookup helpers ───

/**
 * Look up a material by key. Throws if the key is not found.
 * For a non-throwing variant see {@link getMaterialResult}.
 * @param key - Material key, e.g. `'plywood-18'`.
 * @param extraMaterials - Optional custom materials appended to the built-in catalogue.
 * @returns The matching {@link Material}.
 * @throws `Error` when no material with the given key exists.
 */
export function getMaterial(key: string, extraMaterials?: Material[]): Material {
  const all = extraMaterials ? [...MATERIALS, ...extraMaterials] : MATERIALS;
  const m = all.find((mat) => mat.key === key);
  if (!m) throw new Error(`Unknown material: ${key}`);
  return m;
}

/**
 * Phase 11 — Result-returning variant of `getMaterial`. Safe to call without
 * a surrounding try/catch; use when the caller needs to propagate material
 * lookup failures via the `Result<T, E>` contract rather than exceptions.
 */
export function getMaterialResult(
  key: string,
  extraMaterials?: Material[],
): import('./types').Result<Material, string> {
  const all = extraMaterials ? [...MATERIALS, ...extraMaterials] : MATERIALS;
  const m = all.find((mat) => mat.key === key);
  return m ? { ok: true, value: m } : { ok: false, error: `Unknown material: ${key}` };
}

/** Return only panel-category materials (carcass, shelves, doors). */
export function panelMaterials(): Material[] {
  return MATERIALS.filter((m) => m.category === 'panel');
}

/** Return only back-panel-category materials (thin plywood, HDF/MDF). */
export function backMaterials(): Material[] {
  return MATERIALS.filter((m) => m.category === 'back');
}

/**
 * Compute panel weight in kg.
 * @param lengthMm - part length in mm
 * @param widthMm - part width in mm
 * @param thicknessMm - part thickness in mm
 * @param qty - quantity of parts
 * @param densityKgM3 - material density in kg/m³
 */
export function computePartWeightKg(
  lengthMm: number,
  widthMm: number,
  thicknessMm: number,
  qty: number,
  densityKgM3: number,
): number {
  // volume in m³ = (l × w × t in mm³) × 1e-9
  return (lengthMm * widthMm * thicknessMm * qty * densityKgM3) / 1e9;
}

// ─── Default config ───

/** Factory-default configuration used when creating a new cabinet project. */
export const DEFAULT_CONFIG: CabinetConfig = {
  furnitureType: 'cabinet',
  width: 1000,
  height: 2000,
  depth: 600,
  shelfCount: 4,
  shelfSpacing: 'equal',
  customShelfPositions: [],
  shelfCentreSupports: 0,
  carcassMaterial: 'plywood-17',
  backPanelMaterial: 'plywood-4',
  hasBack: true,
  doorCount: 2,
  doorStyle: 'flat',
  doorReveal: 3,
  drawerCount: 0,
  drawerSlideType: 'standard',
  kickHeight: 100,
  handleStyle: 'bar',
  edgeBanding: 'all-visible',
  cutMode: 'freeform',
  lang: 'en',
};

/** Partial overrides applied when the furniture type is set to `'bookshelf'`. */
export const BOOKSHELF_DEFAULTS: Partial<CabinetConfig> = {
  furnitureType: 'bookshelf',
  width: 800,
  height: 1800,
  depth: 300,
  shelfCount: 5,
  drawerCount: 0,
  kickHeight: 0,
  doorStyle: 'none',
  doorCount: 1,
  handleStyle: 'none',
  edgeBanding: 'all-visible',
};

/** Partial overrides applied when the furniture type is set to `'desk'`. */
export const DESK_DEFAULTS: Partial<CabinetConfig> = {
  furnitureType: 'desk',
  width: 1200,
  height: 750,
  depth: 600,
  shelfCount: 0,
  drawerCount: 0,
  kickHeight: 0,
  doorStyle: 'none',
  doorCount: 1,
  handleStyle: 'none',
  edgeBanding: 'all-visible',
};

/** Partial overrides applied when the furniture type is set to `'wardrobe'`. */
export const WARDROBE_DEFAULTS: Partial<CabinetConfig> = {
  furnitureType: 'wardrobe',
  width: 1000,
  height: 2100,
  depth: 600,
  shelfCount: 1,
  drawerCount: 0,
  kickHeight: 100,
  doorStyle: 'flat',
  doorCount: 2,
  handleStyle: 'bar',
  edgeBanding: 'all-visible',
};

/** Partial overrides applied when the furniture type is set to `'panel'` (single-sheet cut). */
export const PANEL_DEFAULTS: Partial<CabinetConfig> = {
  furnitureType: 'panel',
  width: 600,
  height: 800,
  depth: 18, // informational only; actual thickness comes from selected material
  shelfCount: 0,
  drawerCount: 0,
  kickHeight: 0,
  doorStyle: 'none',
  doorCount: 1,
  handleStyle: 'none',
  edgeBanding: 'all-visible',
  panelMaterialSource: 'carcass',
};

/** Partial overrides applied when the furniture type is set to `'cabinet'`. */
export const CABINET_DEFAULTS: Partial<CabinetConfig> = {
  furnitureType: 'cabinet',
  width: 600,
  height: 800,
  depth: 500,
  shelfCount: 2,
  doorCount: 1,
  doorStyle: 'flat',
  handleStyle: 'bar',
  kickHeight: 100,
  drawerCount: 0,
};

// ─── Validation constraints ───

/**
 * Slider visual bounds — the *recommended* design range shown on UI controls.
 * Numeric text inputs accept anything within HARD_LIMITS, even outside this.
 */
export const CONSTRAINTS = {
  minWidth: 300,
  maxWidth: 1200,
  minHeight: 300,
  maxHeight: 2400,
  minDepth: 200,
  maxDepth: 800,
  minShelves: 0,
  maxShelves: 12,
  minReveal: 1,
  maxReveal: 6,
} as const;

/**
 * Absolute physical limits accepted by the engine. Numeric text entry is
 * validated against these (Sprint A1). Going outside the slider's CONSTRAINTS
 * but inside HARD_LIMITS is fully supported.
 */
export const HARD_LIMITS = {
  minWidth: 100,
  maxWidth: 3000,
  minHeight: 100,
  maxHeight: 3000,
  minDepth: 50,
  maxDepth: 3000,
  minShelves: 0,
  maxShelves: 24,
  minReveal: 0,
  maxReveal: 20,
  minDrawers: 0,
  maxDrawers: 12,
} as const;

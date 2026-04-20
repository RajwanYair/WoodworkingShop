import type { Material, CabinetConfig } from './types';

// ─── Material database ───

export const MATERIALS: Material[] = [
  // 17–18 mm panels (carcass, doors, shelves)
  { key: 'plywood-17',   name: { en: 'Sandwich Plywood 17 mm', he: 'פנלפלק 17 מ"מ' },     thickness: 17, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 180, category: 'panel', color: '#C8B88A' },
  { key: 'plywood-18',   name: { en: 'Birch Plywood 18 mm',    he: 'דיקט ליבנה 18 מ"מ' },   thickness: 18, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 260, category: 'panel', color: '#D4C4A0' },
  { key: 'melamine-16',  name: { en: 'Melamine 16 mm',         he: 'מלמין 16 מ"מ' },         thickness: 16, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 140, category: 'panel', color: '#F5F0E8' },
  { key: 'melamine-18',  name: { en: 'Melamine 18 mm',         he: 'מלמין 18 מ"מ' },         thickness: 18, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 165, category: 'panel', color: '#F5F0E8' },
  { key: 'mdf-16',       name: { en: 'MDF 16 mm',              he: 'אם.די.אף 16 מ"מ' },     thickness: 16, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 120, category: 'panel', color: '#BFA87A' },
  { key: 'mdf-18',       name: { en: 'MDF 18 mm',              he: 'אם.די.אף 18 מ"מ' },     thickness: 18, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 145, category: 'panel', color: '#BFA87A' },
  { key: 'chipboard-16', name: { en: 'Chipboard 16 mm',        he: 'שבבית 16 מ"מ' },         thickness: 16, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 85,  category: 'panel', color: '#C9B97A' },
  { key: 'chipboard-18', name: { en: 'Chipboard 18 mm',        he: 'שבבית 18 מ"מ' },         thickness: 18, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 100, category: 'panel', color: '#C9B97A' },
  { key: 'osb-18',       name: { en: 'OSB 18 mm',              he: 'או.אס.בי 18 מ"מ' },     thickness: 18, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 95,  category: 'panel', color: '#D4B87A' },

  // Thin panels (back)
  { key: 'plywood-4',    name: { en: 'Plywood 4 mm (back)',    he: 'דיקט 4 מ"מ (גב)' },     thickness: 4,  sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 65,  category: 'back',  color: '#E8D8B0' },
  { key: 'mdf-3',        name: { en: 'MDF/HDF 3 mm (back)',    he: 'סיבית 3 מ"מ (גב)' },    thickness: 3,  sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 50,  category: 'back',  color: '#D4C4A0' },

  // Glass (doors — pre-cut to size)
  { key: 'tempered-glass-4', name: { en: 'Tempered Glass 4 mm', he: 'זכוכית מחוסמת 4 מ"מ' }, thickness: 4, sheetWidth: 1220, sheetLength: 2440, pricePerSheet: 220, category: 'door', color: '#b8d8f0' },
];

export const SAW_KERF = 4; // mm

// ─── Lookup helpers ───

export function getMaterial(key: string, extraMaterials?: Material[]): Material {
  const all = extraMaterials ? [...MATERIALS, ...extraMaterials] : MATERIALS;
  const m = all.find(mat => mat.key === key);
  if (!m) throw new Error(`Unknown material: ${key}`);
  return m;
}

export function panelMaterials(): Material[] {
  return MATERIALS.filter(m => m.category === 'panel');
}

export function backMaterials(): Material[] {
  return MATERIALS.filter(m => m.category === 'back');
}

// ─── Default config ───

export const DEFAULT_CONFIG: CabinetConfig = {
  furnitureType: 'cabinet',
  width: 1000,
  height: 2000,
  depth: 600,
  shelfCount: 4,
  shelfSpacing: 'equal',
  customShelfPositions: [],
  carcassMaterial: 'plywood-17',
  backPanelMaterial: 'plywood-4',
  doorCount: 2,
  doorStyle: 'flat',
  doorReveal: 3,
  handleStyle: 'bar',
  edgeBanding: 'all-visible',
  lang: 'en',
};

export const BOOKSHELF_DEFAULTS: Partial<CabinetConfig> = {
  furnitureType: 'bookshelf',
  width: 800,
  height: 1800,
  depth: 300,
  shelfCount: 5,
  doorStyle: 'none',
  doorCount: 1,
  handleStyle: 'none',
  edgeBanding: 'all-visible',
};

export const DESK_DEFAULTS: Partial<CabinetConfig> = {
  furnitureType: 'desk',
  width: 1200,
  height: 750,
  depth: 600,
  shelfCount: 0,
  doorStyle: 'none',
  doorCount: 1,
  handleStyle: 'none',
  edgeBanding: 'all-visible',
};

export const WARDROBE_DEFAULTS: Partial<CabinetConfig> = {
  furnitureType: 'wardrobe',
  width: 1000,
  height: 2100,
  depth: 600,
  shelfCount: 1,
  doorStyle: 'flat',
  doorCount: 2,
  handleStyle: 'bar',
  edgeBanding: 'all-visible',
};

// ─── Validation constraints ───

export const CONSTRAINTS = {
  minWidth: 300,   maxWidth: 1200,
  minHeight: 300,  maxHeight: 2400,
  minDepth: 200,   maxDepth: 800,
  minShelves: 0,   maxShelves: 12,
  minReveal: 1,    maxReveal: 6,
} as const;

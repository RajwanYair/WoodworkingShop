/**
 * Custom Hardware Catalog — Sprint 188
 *
 * User-defined hardware items (hinges, handles, screws, slides, etc.)
 * with pricing, quantity tracking, and search/filter/sort capabilities.
 */

/** Hardware category classification. */
export type HardwareCategory =
  'hinge' | 'handle' | 'knob' | 'slide' | 'screw' | 'cam-lock' | 'shelf-pin' | 'bracket' | 'catch' | 'other';

/** A hardware item in the catalog. */
export interface HardwareItem {
  readonly id: string;
  readonly name: string;
  readonly category: HardwareCategory;
  readonly sku: string;
  readonly manufacturer: string;
  readonly unitPrice: number;
  readonly packSize: number;
  readonly description: string;
  readonly tags: readonly string[];
}

/** Hardware assignment to a cabinet/project. */
export interface HardwareAssignment {
  readonly itemId: string;
  readonly cabinetId: string;
  readonly quantity: number;
}

/** Search/filter criteria. */
export interface HardwareFilter {
  readonly query?: string;
  readonly category?: HardwareCategory;
  readonly manufacturer?: string;
  readonly maxPrice?: number;
  readonly tags?: readonly string[];
}

/** Sort field options. */
export type HardwareSortField = 'name' | 'price' | 'category' | 'manufacturer';

/** Sort direction. */
export type SortDirection = 'asc' | 'desc';

/** Schema version for imported custom hardware catalogs. */
export const HARDWARE_CATALOG_SCHEMA_VERSION = '1.0' as const;

/** How imported entries are applied to the current catalog. */
export type HardwareCatalogImportMode = 'merge' | 'replace';

const HARDWARE_CATEGORIES: readonly HardwareCategory[] = [
  'hinge',
  'handle',
  'knob',
  'slide',
  'screw',
  'cam-lock',
  'shelf-pin',
  'bracket',
  'catch',
  'other',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseHardwareItem(raw: unknown): HardwareItem | null {
  if (!isRecord(raw)) return null;
  const { id, name, category, sku, manufacturer, unitPrice, packSize, description, tags } = raw;
  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(name) ||
    typeof category !== 'string' ||
    !HARDWARE_CATEGORIES.includes(category as HardwareCategory) ||
    typeof sku !== 'string' ||
    typeof manufacturer !== 'string' ||
    typeof unitPrice !== 'number' ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0 ||
    typeof packSize !== 'number' ||
    !Number.isSafeInteger(packSize) ||
    packSize < 1 ||
    typeof description !== 'string' ||
    !Array.isArray(tags) ||
    !tags.every((tag: unknown) => typeof tag === 'string')
  ) {
    return null;
  }
  return {
    id,
    name,
    category: category as HardwareCategory,
    sku,
    manufacturer,
    unitPrice,
    packSize,
    description,
    tags,
  };
}

/**
 * Validate an imported JSON envelope and return its hardware items.
 * @param raw - Untrusted parsed JSON value.
 * @returns A validated list of hardware items.
 * @throws {TypeError} When the envelope, an item, or item identifiers are invalid.
 */
export function parseHardwareCatalog(raw: unknown): HardwareItem[] {
  if (!isRecord(raw) || raw['schemaVersion'] !== HARDWARE_CATALOG_SCHEMA_VERSION || !Array.isArray(raw['items'])) {
    throw new TypeError(
      `Hardware catalog must use schemaVersion ${HARDWARE_CATALOG_SCHEMA_VERSION} and contain an items array`,
    );
  }

  const items: HardwareItem[] = [];
  const ids = new Set<string>();
  for (const [index, rawItem] of raw['items'].entries()) {
    const item = parseHardwareItem(rawItem);
    if (!item) throw new TypeError(`Invalid hardware item at index ${index}`);
    if (ids.has(item.id)) throw new TypeError(`Duplicate hardware item id at index ${index}: ${item.id}`);
    ids.add(item.id);
    items.push(item);
  }
  return items;
}

/**
 * Apply validated hardware items to an existing catalog.
 * @param existing - Current catalog contents.
 * @param imported - Items validated by {@link parseHardwareCatalog}.
 * @param mode - Whether matching IDs are updated or the catalog is replaced.
 * @returns The new catalog without mutating either input.
 */
export function applyHardwareCatalogImport(
  existing: readonly HardwareItem[],
  imported: readonly HardwareItem[],
  mode: HardwareCatalogImportMode,
): HardwareItem[] {
  if (mode === 'replace') return [...imported];
  const merged = new Map(existing.map((item) => [item.id, item]));
  for (const item of imported) merged.set(item.id, item);
  return [...merged.values()];
}

/** Per-item cost summary. */
export interface HardwareCostLine {
  readonly item: HardwareItem;
  readonly totalQuantity: number;
  readonly packsNeeded: number;
  readonly lineCost: number;
}

/** Full hardware cost summary. */
export interface HardwareCostSummary {
  readonly lines: readonly HardwareCostLine[];
  readonly totalItems: number;
  readonly totalPacks: number;
  readonly totalCost: number;
}

/**
 * Filter hardware items by criteria.
 */
export function filterHardware(items: readonly HardwareItem[], filter: HardwareFilter): HardwareItem[] {
  return items.filter((item) => {
    if (filter.category && item.category !== filter.category) return false;
    if (filter.manufacturer && item.manufacturer !== filter.manufacturer) return false;
    if (filter.maxPrice !== undefined && item.unitPrice > filter.maxPrice) return false;
    if (filter.tags && filter.tags.length > 0) {
      const hasTag = filter.tags.some((t) => item.tags.includes(t));
      if (!hasTag) return false;
    }
    if (filter.query) {
      const q = filter.query.toLowerCase();
      const searchable = `${item.name} ${item.sku} ${item.description} ${item.tags.join(' ')}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Sort hardware items by a given field.
 */
export function sortHardware(
  items: readonly HardwareItem[],
  field: HardwareSortField = 'name',
  direction: SortDirection = 'asc',
): HardwareItem[] {
  const sorted = [...items].sort((a, b) => {
    const cmp = field === 'price' ? a.unitPrice - b.unitPrice : a[field].localeCompare(b[field]);
    return direction === 'desc' ? -cmp : cmp;
  });
  return sorted;
}

/**
 * Calculate hardware costs for a project based on assignments.
 *
 * @param catalog - Available hardware items.
 * @param assignments - Hardware assignments to cabinets.
 * @throws {RangeError} If an assignment references an unknown item.
 * @throws {RangeError} If quantity is non-positive.
 */
export function calculateHardwareCost(
  catalog: readonly HardwareItem[],
  assignments: readonly HardwareAssignment[],
): HardwareCostSummary {
  if (assignments.length === 0) {
    return { lines: [], totalItems: 0, totalPacks: 0, totalCost: 0 };
  }

  const catalogMap = new Map(catalog.map((i) => [i.id, i]));

  for (const a of assignments) {
    if (!catalogMap.has(a.itemId)) {
      throw new RangeError(`unknown hardware item: "${a.itemId}"`);
    }
    if (a.quantity <= 0) {
      throw new RangeError(`non-positive quantity for item "${a.itemId}"`);
    }
  }

  const quantityMap = new Map<string, number>();
  for (const a of assignments) {
    quantityMap.set(a.itemId, (quantityMap.get(a.itemId) ?? 0) + a.quantity);
  }

  const lines: HardwareCostLine[] = [];
  for (const [itemId, totalQuantity] of quantityMap) {
    const item = catalogMap.get(itemId)!;
    const packsNeeded = Math.ceil(totalQuantity / item.packSize);
    const lineCost = Math.round(packsNeeded * item.unitPrice * 100) / 100;
    lines.push({ item, totalQuantity, packsNeeded, lineCost });
  }

  lines.sort((a, b) => b.lineCost - a.lineCost);

  const totalItems = lines.reduce((s, l) => s + l.totalQuantity, 0);
  const totalPacks = lines.reduce((s, l) => s + l.packsNeeded, 0);
  const totalCost = Math.round(lines.reduce((s, l) => s + l.lineCost, 0) * 100) / 100;

  return { lines, totalItems, totalPacks, totalCost };
}

/**
 * Get unique manufacturers from a catalog.
 */
export function getManufacturers(catalog: readonly HardwareItem[]): string[] {
  return [...new Set(catalog.map((i) => i.manufacturer))].sort();
}

/**
 * Get unique categories present in a catalog.
 */
export function getCategories(catalog: readonly HardwareItem[]): HardwareCategory[] {
  return [...new Set(catalog.map((i) => i.category))].sort() as HardwareCategory[];
}

/**
 * Validate a hardware item has required fields.
 */
export function validateHardwareItem(item: HardwareItem): string[] {
  const errors: string[] = [];
  if (!item.id.trim()) errors.push('id is required');
  if (!item.name.trim()) errors.push('name is required');
  if (item.unitPrice < 0) errors.push('unitPrice must be >= 0');
  if (item.packSize < 1) errors.push('packSize must be >= 1');
  return errors;
}

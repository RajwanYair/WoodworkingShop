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

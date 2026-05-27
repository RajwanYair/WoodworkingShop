/**
 * Panel Layout Label Generator — Sprint 194
 *
 * Generates printable label data for cut panels. Each label includes
 * part ID, dimensions, material, grain direction, cabinet position,
 * and optional edge-banding indicators — designed for workshop use
 * when sorting and assembling cut parts.
 */

/** Grain direction for label display. */
export type GrainDirection = 'horizontal' | 'vertical' | 'none';

/** Edge that has banding applied. */
export type BandedEdge = 'top' | 'bottom' | 'left' | 'right';

/** Input for a single panel label. */
export interface PanelLabelInput {
  /** Part identifier (e.g. "A1", "SHELF-3"). */
  readonly partId: string;
  /** Panel width in mm. */
  readonly widthMm: number;
  /** Panel height/length in mm. */
  readonly heightMm: number;
  /** Material name (e.g. "Plywood 18mm"). */
  readonly material: string;
  /** Grain direction. */
  readonly grain: GrainDirection;
  /** Cabinet or assembly this part belongs to. */
  readonly cabinetName: string;
  /** Position within the cabinet (e.g. "Left Side", "Top Shelf"). */
  readonly position: string;
  /** Edges with banding applied. */
  readonly bandedEdges?: readonly BandedEdge[];
  /** Quantity of identical parts. */
  readonly quantity?: number;
  /** Optional notes (e.g. "drill hinge bore"). */
  readonly notes?: string;
}

/** Generated label data ready for rendering/printing. */
export interface PanelLabel {
  /** Part identifier. */
  readonly partId: string;
  /** Formatted dimension string (e.g. "600 × 400 mm"). */
  readonly dimensionText: string;
  /** Material name. */
  readonly material: string;
  /** Grain direction arrow symbol. */
  readonly grainSymbol: string;
  /** Cabinet name. */
  readonly cabinetName: string;
  /** Position within the cabinet. */
  readonly position: string;
  /** Edge banding indicator string (e.g. "T B L" or "—"). */
  readonly edgeBandingText: string;
  /** Quantity (default 1). */
  readonly quantity: number;
  /** Optional notes. */
  readonly notes: string;
  /** Sort key for ordering labels (cabinet + partId). */
  readonly sortKey: string;
}

/** Batch result containing all labels and summary stats. */
export interface PanelLabelBatch {
  /** All generated labels sorted by sortKey. */
  readonly labels: readonly PanelLabel[];
  /** Total number of unique parts. */
  readonly uniqueParts: number;
  /** Total number of pieces (sum of quantities). */
  readonly totalPieces: number;
  /** Number of distinct materials used. */
  readonly materialCount: number;
}

const GRAIN_SYMBOLS: Record<GrainDirection, string> = {
  horizontal: '→',
  vertical: '↓',
  none: '·',
};

const EDGE_ABBREVIATIONS: Record<BandedEdge, string> = {
  top: 'T',
  bottom: 'B',
  left: 'L',
  right: 'R',
};

/**
 * Generate a single panel label from input data.
 *
 * @param input - Panel label input
 * @returns Formatted panel label
 * @throws RangeError if widthMm or heightMm ≤ 0, or partId is empty
 */
export function generatePanelLabel(input: PanelLabelInput): PanelLabel {
  if (!input.partId.trim()) {
    throw new RangeError('generatePanelLabel: partId must not be empty');
  }
  if (input.widthMm <= 0) {
    throw new RangeError(`generatePanelLabel: widthMm must be > 0, got ${input.widthMm}`);
  }
  if (input.heightMm <= 0) {
    throw new RangeError(`generatePanelLabel: heightMm must be > 0, got ${input.heightMm}`);
  }

  const dimensionText = `${input.widthMm} × ${input.heightMm} mm`;
  const grainSymbol = GRAIN_SYMBOLS[input.grain];
  const quantity = input.quantity ?? 1;

  const edgeBandingText =
    input.bandedEdges && input.bandedEdges.length > 0
      ? input.bandedEdges.map((e) => EDGE_ABBREVIATIONS[e]).join(' ')
      : '—';

  const sortKey = `${input.cabinetName}|${input.partId}`;

  return {
    partId: input.partId,
    dimensionText,
    material: input.material,
    grainSymbol,
    cabinetName: input.cabinetName,
    position: input.position,
    edgeBandingText,
    quantity,
    notes: input.notes ?? '',
    sortKey,
  };
}

/**
 * Generate a batch of panel labels from an array of inputs.
 * Labels are sorted by cabinet name, then part ID.
 *
 * @param inputs - Array of panel label inputs
 * @returns Batch result with sorted labels and summary statistics
 * @throws RangeError if inputs array is empty
 */
export function generateLabelBatch(inputs: readonly PanelLabelInput[]): PanelLabelBatch {
  if (inputs.length === 0) {
    throw new RangeError('generateLabelBatch: inputs must not be empty');
  }

  const labels = inputs.map(generatePanelLabel).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const totalPieces = labels.reduce((sum, l) => sum + l.quantity, 0);
  const materials = new Set(inputs.map((i) => i.material));

  return {
    labels,
    uniqueParts: labels.length,
    totalPieces,
    materialCount: materials.size,
  };
}

/**
 * Format a label as a single-line text string for plain-text printing.
 *
 * @param label - Panel label to format
 * @returns Formatted single-line string
 */
export function formatLabelText(label: PanelLabel): string {
  const qty = label.quantity > 1 ? ` ×${label.quantity}` : '';
  const notes = label.notes ? ` [${label.notes}]` : '';
  return `${label.partId} | ${label.dimensionText} | ${label.material} ${label.grainSymbol} | ${label.cabinetName} → ${label.position} | EB: ${label.edgeBandingText}${qty}${notes}`;
}

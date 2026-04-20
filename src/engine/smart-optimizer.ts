import type { CabinetConfig, OptimizationResult, OptimizationSuggestion, SmartStrategy } from './types';
import { MATERIALS, SAW_KERF, getMaterial, CONSTRAINTS } from './materials';
import { computeDimensions } from './dimensions';
import { generateParts } from './parts';
import { optimizeCutSheets } from './cut-optimizer';

export interface SmartOptimizerOptions {
  strategies: SmartStrategy[];
  tolerance: number; // max mm deviation from original dimension
  maxResults?: number; // top N suggestions (default 5)
}

const DEFAULT_OPTIONS: SmartOptimizerOptions = {
  strategies: ['reduce-depth', 'co-nest-strips', 'adjust-width', 'adjust-height', 'material-swap'],
  tolerance: 20,
  maxResults: 5,
};

/**
 * Run all enabled optimization strategies on a cabinet config.
 * Returns ranked suggestions sorted by score (lower = better).
 */
export function findOptimizations(
  config: CabinetConfig,
  options: Partial<SmartOptimizerOptions> = {},
): OptimizationSuggestion[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const baseResult = evaluate(config);
  const suggestions: OptimizationSuggestion[] = [];

  for (const strategy of opts.strategies) {
    const candidates = generateCandidates(config, strategy, opts.tolerance);
    for (const candidate of candidates) {
      if (!isValid(candidate)) continue;
      const result = evaluate(candidate);
      if (result.totalSheets > baseResult.totalSheets) continue; // worse
      if (result.totalSheets === baseResult.totalSheets && result.overallYield <= baseResult.overallYield) continue;

      const score = result.totalSheets * 1000 - result.overallYield;
      suggestions.push({
        originalConfig: config,
        optimizedConfig: candidate,
        originalResult: baseResult,
        optimizedResult: result,
        savings: {
          sheetsRemoved: baseResult.totalSheets - result.totalSheets,
          yieldImprovement: round2(result.overallYield - baseResult.overallYield),
          wasteReduced: baseResult.totalWaste - result.totalWaste,
        },
        strategy,
        explanation: buildExplanation(config, candidate, strategy),
        score,
      });
    }
  }

  // Deduplicate by config fingerprint, keep best score
  const seen = new Map<string, OptimizationSuggestion>();
  for (const s of suggestions) {
    const key = configFingerprint(s.optimizedConfig);
    const existing = seen.get(key);
    if (!existing || s.score < existing.score) {
      seen.set(key, s);
    }
  }

  return [...seen.values()].sort((a, b) => a.score - b.score).slice(0, opts.maxResults);
}

// ─── Candidate generators per strategy ───

function generateCandidates(cfg: CabinetConfig, strategy: SmartStrategy, tolerance: number): CabinetConfig[] {
  switch (strategy) {
    case 'reduce-depth':
      return tryDepthVariations(cfg, tolerance);
    case 'co-nest-strips':
      return tryCoNestStrips(cfg, tolerance);
    case 'adjust-width':
      return tryDimensionVariations(cfg, 'width', tolerance);
    case 'adjust-height':
      return tryDimensionVariations(cfg, 'height', tolerance);
    case 'material-swap':
      return tryMaterialSwaps(cfg);
    default:
      return [];
  }
}

/**
 * Strategy: reduce-depth
 * Find depths where n × depth + (n-1) × kerf ≈ sheetWidth
 * This means depth strips pack perfectly across the sheet width.
 */
function tryDepthVariations(cfg: CabinetConfig, tolerance: number): CabinetConfig[] {
  const mat = getMaterial(cfg.carcassMaterial);
  const sheetW = mat.sheetWidth;
  const candidates: CabinetConfig[] = [];

  // Try n = 1..6 strips across sheet width
  for (let n = 1; n <= 6; n++) {
    // depth = (sheetWidth - (n-1) × kerf) / n
    const idealDepth = (sheetW - (n - 1) * SAW_KERF) / n;
    if (
      Math.abs(idealDepth - cfg.depth) <= tolerance &&
      idealDepth >= CONSTRAINTS.minDepth &&
      idealDepth <= CONSTRAINTS.maxDepth
    ) {
      candidates.push({ ...cfg, depth: Math.round(idealDepth) });
    }
  }

  // Also try small ±1mm nudges around current depth
  for (let delta = -tolerance; delta <= tolerance; delta += 2) {
    if (delta === 0) continue;
    const d = cfg.depth + delta;
    if (d >= CONSTRAINTS.minDepth && d <= CONSTRAINTS.maxDepth) {
      candidates.push({ ...cfg, depth: d });
    }
  }

  return candidates;
}

/**
 * Strategy: co-nest-strips
 * Try: doorWidth + kerf + sideDepth + kerf + shelfDepth ≈ sheetWidth
 * Nudge depth to make strips co-nest on a single sheet.
 */
function tryCoNestStrips(cfg: CabinetConfig, tolerance: number): CabinetConfig[] {
  if (cfg.doorStyle === 'none') return [];
  const mat = getMaterial(cfg.carcassMaterial);
  const sheetW = mat.sheetWidth;
  const candidates: CabinetConfig[] = [];

  // Current derived dims
  const d = computeDimensions(cfg);
  // target: doorWidth + kerf + depth + kerf + shelfDepth = sheetWidth
  // depth = (sheetWidth - doorWidth - shelfDepth - 2*kerf) ... but shelfDepth depends on depth
  // shelfDepth = depth - 20, so:
  // doorWidth + kerf + depth + kerf + (depth - 20) = sheetWidth
  // doorWidth + 2*kerf + 2*depth - 20 = sheetWidth
  // depth = (sheetWidth - doorWidth - 2*kerf + 20) / 2
  const idealDepth = (sheetW - d.doorWidth - 2 * SAW_KERF + 20) / 2;
  if (
    Math.abs(idealDepth - cfg.depth) <= tolerance &&
    idealDepth >= CONSTRAINTS.minDepth &&
    idealDepth <= CONSTRAINTS.maxDepth
  ) {
    candidates.push({ ...cfg, depth: Math.round(idealDepth) });
  }

  // Also try: depth + kerf + shelfDepth = sheetWidth (without door strip)
  // depth + kerf + (depth - 20) = sheetWidth
  // 2*depth + kerf - 20 = sheetWidth
  // depth = (sheetWidth - kerf + 20) / 2
  const idealDepth2 = (sheetW - SAW_KERF + 20) / 2;
  if (
    Math.abs(idealDepth2 - cfg.depth) <= tolerance &&
    idealDepth2 >= CONSTRAINTS.minDepth &&
    idealDepth2 <= CONSTRAINTS.maxDepth
  ) {
    candidates.push({ ...cfg, depth: Math.round(idealDepth2) });
  }

  return candidates;
}

/**
 * Strategy: adjust-width / adjust-height
 * Try ±1..tolerance mm variations for better nesting.
 */
function tryDimensionVariations(cfg: CabinetConfig, dim: 'width' | 'height', tolerance: number): CabinetConfig[] {
  const mat = getMaterial(cfg.carcassMaterial);
  const sheetL = mat.sheetLength;
  const sheetW = mat.sheetWidth;
  const constraints =
    dim === 'width'
      ? { min: CONSTRAINTS.minWidth, max: CONSTRAINTS.maxWidth }
      : { min: CONSTRAINTS.minHeight, max: CONSTRAINTS.maxHeight };

  const candidates: CabinetConfig[] = [];
  const original = cfg[dim];

  // Try magic values where n × dim + (n-1) × kerf = sheetLength or sheetWidth
  for (const sheet of [sheetL, sheetW]) {
    for (let n = 1; n <= 8; n++) {
      const ideal = (sheet - (n - 1) * SAW_KERF) / n;
      if (Math.abs(ideal - original) <= tolerance && ideal >= constraints.min && ideal <= constraints.max) {
        candidates.push({ ...cfg, [dim]: Math.round(ideal) });
      }
    }
  }

  // Small ±step nudges
  for (let delta = -tolerance; delta <= tolerance; delta += 2) {
    if (delta === 0) continue;
    const val = original + delta;
    if (val >= constraints.min && val <= constraints.max) {
      candidates.push({ ...cfg, [dim]: val });
    }
  }

  return candidates;
}

/**
 * Strategy: material-swap
 * Try all compatible panel materials with different thicknesses.
 */
function tryMaterialSwaps(cfg: CabinetConfig): CabinetConfig[] {
  const candidates: CabinetConfig[] = [];
  const currentMat = getMaterial(cfg.carcassMaterial);

  for (const mat of MATERIALS) {
    if (mat.category !== 'panel') continue;
    if (mat.key === cfg.carcassMaterial) continue;
    if (mat.thickness === currentMat.thickness) continue; // same thickness, skip
    candidates.push({ ...cfg, carcassMaterial: mat.key });
  }

  return candidates;
}

// ─── Helpers ───

function evaluate(cfg: CabinetConfig): OptimizationResult {
  const parts = generateParts(cfg);
  return optimizeCutSheets(parts);
}

function isValid(cfg: CabinetConfig): boolean {
  return (
    cfg.width >= CONSTRAINTS.minWidth &&
    cfg.width <= CONSTRAINTS.maxWidth &&
    cfg.height >= CONSTRAINTS.minHeight &&
    cfg.height <= CONSTRAINTS.maxHeight &&
    cfg.depth >= CONSTRAINTS.minDepth &&
    cfg.depth <= CONSTRAINTS.maxDepth
  );
}

function configFingerprint(cfg: CabinetConfig): string {
  return `${cfg.width}|${cfg.height}|${cfg.depth}|${cfg.carcassMaterial}|${cfg.backPanelMaterial}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildExplanation(
  original: CabinetConfig,
  optimized: CabinetConfig,
  strategy: SmartStrategy,
): { en: string; he: string } {
  const changes: string[] = [];
  const changesHe: string[] = [];

  if (optimized.depth !== original.depth) {
    changes.push(`depth ${original.depth} → ${optimized.depth} mm`);
    changesHe.push(`עומק ${original.depth} → ${optimized.depth} מ"מ`);
  }
  if (optimized.width !== original.width) {
    changes.push(`width ${original.width} → ${optimized.width} mm`);
    changesHe.push(`רוחב ${original.width} → ${optimized.width} מ"מ`);
  }
  if (optimized.height !== original.height) {
    changes.push(`height ${original.height} → ${optimized.height} mm`);
    changesHe.push(`גובה ${original.height} → ${optimized.height} מ"מ`);
  }
  if (optimized.carcassMaterial !== original.carcassMaterial) {
    const from = getMaterial(original.carcassMaterial);
    const to = getMaterial(optimized.carcassMaterial);
    changes.push(`material ${from.name.en} → ${to.name.en}`);
    changesHe.push(`חומר ${from.name.he} → ${to.name.he}`);
  }

  const stratLabels: Record<SmartStrategy, { en: string; he: string }> = {
    'reduce-depth': { en: 'Optimize depth for sheet nesting', he: 'מיטוב עומק לחיתוך גיליון' },
    'co-nest-strips': { en: 'Co-nest door and shelf strips', he: 'חיתוך משולב דלת ומדף' },
    'adjust-width': { en: 'Adjust width for better yield', he: 'התאמת רוחב לניצולת טובה' },
    'adjust-height': { en: 'Adjust height for better yield', he: 'התאמת גובה לניצולת טובה' },
    'material-swap': { en: 'Try alternative material', he: 'חומר חלופי' },
  };

  return {
    en: `${stratLabels[strategy].en}: ${changes.join(', ')}`,
    he: `${stratLabels[strategy].he}: ${changesHe.join(', ')}`,
  };
}

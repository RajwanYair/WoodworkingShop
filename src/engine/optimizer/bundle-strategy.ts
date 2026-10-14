/**
 * Bundle chunk strategy — pure configuration and validation helpers.
 * No DOM, no React. Used by build tooling and tests.
 */

export const CHUNK_NAMES = {
  PDF_RENDERER: 'pdf-renderer',
  I18N_VENDOR: 'i18n-vendor',
  VENDOR: 'vendor',
  ENGINE_OPTIMIZER: 'engine-optimizer',
} as const;

export type ChunkName = (typeof CHUNK_NAMES)[keyof typeof CHUNK_NAMES];

export type ModuleChunkDescriptor = {
  readonly chunkName: ChunkName;
  /** Substring patterns matched against Vite/Rollup module IDs (OR logic). */
  readonly modulePatterns: readonly string[];
  readonly description: string;
  /** Expected gzipped size hint in KB (for documentation and budget checks). */
  readonly gzipHintKB: number;
};

export const MODULE_CHUNK_DESCRIPTORS: readonly ModuleChunkDescriptor[] = [
  {
    chunkName: CHUNK_NAMES.PDF_RENDERER,
    modulePatterns: ['@react-pdf/renderer'],
    description: 'PDF export engine — lazy-loaded with PdfExportPanel',
    gzipHintKB: 400,
  },
  {
    chunkName: CHUNK_NAMES.I18N_VENDOR,
    modulePatterns: ['/i18next', '/react-i18next'],
    description: 'i18n runtime — stable, cached long-term',
    gzipHintKB: 30,
  },
  {
    chunkName: CHUNK_NAMES.VENDOR,
    modulePatterns: ['/react-dom/', '/node_modules/react/', '/zustand'],
    description: 'React + ReactDOM + Zustand — stable vendor trio',
    gzipHintKB: 45,
  },
  {
    chunkName: CHUNK_NAMES.ENGINE_OPTIMIZER,
    modulePatterns: ['/cut-optimizer', '/smart-optimizer', '/assembly-dag'],
    description: 'Heavy optimizer engine — split to defer parse cost to OptimizerView load',
    gzipHintKB: 25,
  },
] as const;

export type BundleBudget = {
  readonly totalJsKB: number;
  readonly totalCssKB: number;
  readonly totalAllKB: number;
  readonly perFileDefaultKB: number;
  readonly perFilePdfKB: number;
};

/** Mirrors the values in config/bundle-budget.json. */
export const BUNDLE_BUDGET: BundleBudget = {
  totalJsKB: 2400,
  totalCssKB: 100,
  totalAllKB: 2480,
  perFileDefaultKB: 500,
  perFilePdfKB: 1600,
} as const;

/**
 * Given a Rollup/Vite module ID string, return the chunk name it should
 * be assigned to, or `undefined` for the default entry chunk.
 * First matching descriptor wins (order matters).
 */
export function resolveChunkName(moduleId: string): ChunkName | undefined {
  for (const descriptor of MODULE_CHUNK_DESCRIPTORS) {
    for (const pattern of descriptor.modulePatterns) {
      if (moduleId.includes(pattern)) {
        return descriptor.chunkName;
      }
    }
  }
  return undefined;
}

/**
 * Check whether a file size exceeds the per-file budget.
 * @param fileSizeKB - uncompressed file size in KB
 * @param chunkName - chunk name (used to look up the elevated PDF limit)
 * @param budget - budget config (defaults to BUNDLE_BUDGET)
 */
export function exceedsPerFileBudget(
  fileSizeKB: number,
  chunkName: string,
  budget: BundleBudget = BUNDLE_BUDGET,
): boolean {
  if (chunkName === CHUNK_NAMES.PDF_RENDERER) {
    return fileSizeKB > budget.perFilePdfKB;
  }
  return fileSizeKB > budget.perFileDefaultKB;
}

/**
 * Return true when the total JS output exceeds the configured budget.
 */
export function exceedsTotalJsBudget(totalJsKB: number, budget: BundleBudget = BUNDLE_BUDGET): boolean {
  return totalJsKB > budget.totalJsKB;
}

/**
 * Given a list of chunk names present in a build output, return any
 * MODULE_CHUNK_DESCRIPTORS whose chunk name is absent (gap analysis).
 */
export function getMissingChunks(outputChunkNames: readonly string[]): readonly ModuleChunkDescriptor[] {
  const seen = new Set(outputChunkNames);
  return MODULE_CHUNK_DESCRIPTORS.filter((d) => !seen.has(d.chunkName));
}

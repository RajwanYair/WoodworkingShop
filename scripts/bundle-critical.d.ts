export interface ManifestChunk {
  file: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
}

export interface CriticalAssets {
  javascript: string[];
  stylesheets: string[];
}

export interface CriticalBundleMeasurement extends CriticalAssets {
  javascriptBrotliBytes: number;
  stylesheetBrotliBytes: number;
}

export interface CriticalBundleBudget {
  initialJsBrotliKB: number;
  initialCssBrotliKB: number;
}

export function collectCriticalAssets(manifest: Record<string, ManifestChunk>): CriticalAssets;
export function measureCriticalBundle(
  manifest: Record<string, ManifestChunk>,
  distDirectory: string,
): CriticalBundleMeasurement;
export function getCriticalBundleViolations(
  measured: CriticalBundleMeasurement,
  budget: CriticalBundleBudget,
): string[];

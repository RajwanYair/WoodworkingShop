export interface BundleManifestChunk {
  file?: string;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
}

export function getInitialRouteFiles(
  manifest: Record<string, BundleManifestChunk | undefined>,
  entryKey?: string,
): {
  javascript: string[];
  stylesheets: string[];
  assets: string[];
};

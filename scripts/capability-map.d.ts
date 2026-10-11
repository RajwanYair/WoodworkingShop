export type ImportKind = 'static' | 'dynamic' | 'worker';

export interface ImportEdge {
  target: string;
  kind: ImportKind;
}

export interface CapabilityModule {
  path: string;
  uiImporters: string[];
  internalImporters: string[];
  barrelOnly: boolean;
  testImporters: string[];
  outputChunks: string[];
}

export interface CapabilityLedgerEntry {
  path: string;
  status: 'surfaced' | 'internal' | 'public-api' | 'surface-next' | 'retire';
  reason?: string;
  documentedIn?: 'docs/API-BOUNDARIES.md' | 'docs/PLUGIN-API.md';
  targetSprint?: number;
  targetRelease?: string;
}

export function buildImportGraph(sources: Readonly<Record<string, string>>): Map<string, ImportEdge[]>;
export function buildCapabilityInventory(
  sources: Readonly<Record<string, string>>,
  options: { modulePaths: string[]; uiRoots: string[]; testRoots: string[]; outputChunks?: Record<string, string[]> },
): CapabilityModule[];
export function findReachableRoots(graph: Map<string, ImportEdge[]>, target: string, roots: Iterable<string>): string[];
export function isBarrelOnlyExposure(graph: Map<string, ImportEdge[]>, target: string): boolean;
export function checkCapabilityLedger(
  inventory: CapabilityModule[],
  ledger: { modules: CapabilityLedgerEntry[] },
  currentVersion: string,
): string[];

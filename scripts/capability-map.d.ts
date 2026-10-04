export interface CapabilityRecord {
  path: string;
  kind: string;
  uiImporters: string[];
  transitiveUiImporters: string[];
  engineInternalImporters: string[];
  barrelOnlyExposure: boolean;
  testImporters: string[];
  outputChunk: string | null;
}

export function createCapabilityMap(files: Map<string, string>): CapabilityRecord[];
export function validateLedger(records: CapabilityRecord[], ledger: unknown): string[];

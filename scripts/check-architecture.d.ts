export type ArchitectureViolation =
  | { rule: 'import-cycle'; files: string[] }
  | {
      rule:
        | 'browser-api-in-pure-layer'
        | 'browser-platform-boundary'
        | 'dom-type-in-platform-contract'
        | 'engine-boundary'
        | 'engine-domain-barrel'
        | 'engine-external-import'
        | 'feature-platform-boundary'
        | 'react-in-pure-layer'
        | 'target-layer-boundary';
      file: string;
      target: string;
      detail?: string;
    };

export interface ArchitectureBaseline {
  schemaVersion: 1;
  violations: ArchitectureViolation[];
}

export function analyzeArchitecture(sources: Readonly<Record<string, string>>): ArchitectureViolation[];
export function architectureViolationKey(violation: ArchitectureViolation): string;
export function compareArchitectureBaseline(
  violations: ArchitectureViolation[],
  baseline: ArchitectureBaseline,
): { introduced: ArchitectureViolation[]; resolved: ArchitectureViolation[] };

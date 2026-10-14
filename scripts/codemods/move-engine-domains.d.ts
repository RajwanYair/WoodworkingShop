export interface EngineMove {
  from: string;
  to: string;
  domain: string;
}

export const DOMAIN_MODULES: Readonly<Record<string, readonly string[]>>;

export function buildEngineMovePlan(sourcePaths: string[]): EngineMove[];

export function buildEngineTestMovePlan(
  testPaths: string[],
  sources: Readonly<Record<string, string>>,
  knownPaths?: string[],
): EngineMove[];

export function rewriteImports(
  sources: Readonly<Record<string, string>>,
  movePlan: EngineMove[],
  knownPaths?: string[],
): { rewritten: Map<string, string>; importCount: number };

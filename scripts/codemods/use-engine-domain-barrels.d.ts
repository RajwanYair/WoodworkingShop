export interface EngineBarrelRewrite {
  importer: string;
  from: string;
  to: string;
  target: string;
}

export function rewriteCrossDomainImports(sources: Readonly<Record<string, string>>): {
  rewritten: Map<string, string>;
  changes: EngineBarrelRewrite[];
};

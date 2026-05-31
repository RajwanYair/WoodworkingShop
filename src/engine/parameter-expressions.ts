const IDENTIFIER_PATTERN = /\b[A-Z_]\w*\b/gi;
const SAFE_EXPRESSION_PATTERN = /^[\w+\-*/().\s]+$/;

const RESERVED_IDENTIFIERS = new Set(['Math']);

export interface ParameterGraphEdge {
  from: string;
  to: string;
}

export interface ParameterDependencyGraph {
  nodes: string[];
  edges: ParameterGraphEdge[];
}

export interface ParameterEvaluationResult {
  values: Record<string, number>;
  order: string[];
}

/**
 * Extract parameter dependencies used by an expression.
 *
 * @param expression Expression string to analyse.
 * @returns Unique dependency names in first-seen order.
 */
export function extractExpressionDependencies(expression: string): string[] {
  const seen = new Set<string>();
  const deps: string[] = [];
  const matches = expression.matchAll(IDENTIFIER_PATTERN);

  for (const match of matches) {
    const token = match[0];
    const index = match.index ?? 0;
    const previous = index > 0 ? expression[index - 1] : '';
    if (previous === '.') {
      continue;
    }
    if (RESERVED_IDENTIFIERS.has(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    deps.push(token);
  }

  return deps;
}

/**
 * Build a dependency graph for named parameter expressions.
 *
 * @param definitions Parameter name → expression map.
 * @returns Graph nodes and directed edges (dependency → parameter).
 */
export function buildParameterDependencyGraph(definitions: Record<string, string>): ParameterDependencyGraph {
  const nodes = Object.keys(definitions);
  const nodeSet = new Set(nodes);
  const edges: ParameterGraphEdge[] = [];

  for (const node of nodes) {
    const expression = definitions[node] ?? '';
    const deps = extractExpressionDependencies(expression);
    for (const dep of deps) {
      if (nodeSet.has(dep)) {
        edges.push({ from: dep, to: node });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Render a parameter dependency graph as Mermaid flowchart text.
 *
 * @param graph Dependency graph.
 * @returns Mermaid flowchart string.
 */
export function parameterDependencyGraphToMermaid(graph: ParameterDependencyGraph): string {
  const lines = ['flowchart LR'];

  for (const node of graph.nodes) {
    lines.push(`  ${node}[${node}]`);
  }

  for (const edge of graph.edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }

  return lines.join('\n');
}

/**
 * Evaluate named parameter expressions in dependency order.
 *
 * @param definitions Parameter name → expression map.
 * @param baseValues Base values for leaf variables not defined in `definitions`.
 * @returns Evaluated values and execution order.
 * @throws RangeError When an expression has unsupported syntax, unknown dependencies, or cyclic dependencies.
 */
export function evaluateNamedParameters(
  definitions: Record<string, string>,
  baseValues: Record<string, number> = {},
): ParameterEvaluationResult {
  const graph = buildParameterDependencyGraph(definitions);
  const indegree = new Map<string, number>(graph.nodes.map((n) => [n, 0]));
  const out = new Map<string, string[]>(graph.nodes.map((n) => [n, []]));

  for (const edge of graph.edges) {
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    const list = out.get(edge.from);
    if (list) list.push(edge.to);
  }

  const queue = graph.nodes.filter((n) => (indegree.get(n) ?? 0) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift() as string;
    order.push(node);

    for (const next of out.get(node) ?? []) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
      }
    }
  }

  if (order.length !== graph.nodes.length) {
    throw new RangeError('evaluateNamedParameters: cyclic parameter dependencies detected');
  }

  const values: Record<string, number> = { ...baseValues };
  const definitionNames = new Set(graph.nodes);

  for (const name of order) {
    const expression = (definitions[name] ?? '').trim();
    if (!expression) {
      throw new RangeError(`evaluateNamedParameters: empty expression for ${name}`);
    }
    if (!SAFE_EXPRESSION_PATTERN.test(expression)) {
      throw new RangeError(`evaluateNamedParameters: unsupported expression syntax for ${name}`);
    }

    const deps = extractExpressionDependencies(expression);
    for (const dep of deps) {
      if (definitionNames.has(dep) || dep in values || RESERVED_IDENTIFIERS.has(dep)) {
        continue;
      }
      throw new RangeError(`evaluateNamedParameters: unknown dependency ${dep} for ${name}`);
    }

    const argNames = [...deps, 'Math'];
    const argValues: Array<number | Math> = [...deps.map((dep) => values[dep] as number), Math];
    const fn = new Function(...argNames, `return (${expression});`) as (...args: Array<number | Math>) => unknown;
    const computed = fn(...argValues);
    if (typeof computed !== 'number' || !Number.isFinite(computed)) {
      throw new RangeError(`evaluateNamedParameters: non-finite result for ${name}`);
    }
    values[name] = computed;
  }

  const namedValues: Record<string, number> = {};
  for (const name of graph.nodes) {
    namedValues[name] = values[name] as number;
  }

  return {
    values: namedValues,
    order,
  };
}

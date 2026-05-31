import { describe, expect, it } from 'vitest';
import {
  buildParameterDependencyGraph,
  evaluateNamedParameters,
  extractExpressionDependencies,
  parameterDependencyGraphToMermaid,
} from '../../src/engine/parameter-expressions';

describe('extractExpressionDependencies', () => {
  it.each([
    { expression: 'width + depth * 2', expected: ['width', 'depth'] },
    { expression: 'Math.max(width, depth)', expected: ['width', 'depth'] },
    { expression: 'height + height + width', expected: ['height', 'width'] },
  ])('returns unique dependencies for "$expression"', ({ expression, expected }) => {
    expect(extractExpressionDependencies(expression)).toEqual(expected);
  });
});

describe('buildParameterDependencyGraph', () => {
  it('creates dependency edges from dependency to parameter', () => {
    const graph = buildParameterDependencyGraph({
      panelArea: 'width * height',
      totalArea: 'panelArea * count',
      offcutRatio: '(waste / totalArea) * 100',
    });

    expect(graph.nodes).toEqual(['panelArea', 'totalArea', 'offcutRatio']);
    expect(graph.edges).toEqual([
      { from: 'panelArea', to: 'totalArea' },
      { from: 'totalArea', to: 'offcutRatio' },
    ]);
  });

  it('renders the graph as mermaid flowchart text', () => {
    const graph = buildParameterDependencyGraph({ a: '1', b: 'a + 2' });
    const mermaid = parameterDependencyGraphToMermaid(graph);

    expect(mermaid).toContain('flowchart LR');
    expect(mermaid).toContain('a[a]');
    expect(mermaid).toContain('a --> b');
  });
});

describe('evaluateNamedParameters', () => {
  it('evaluates parameters in topological order and returns named values only', () => {
    const result = evaluateNamedParameters(
      {
        panelArea: 'width * height',
        totalArea: 'panelArea * count',
        wastePercent: '(waste / totalArea) * 100',
      },
      {
        width: 600,
        height: 720,
        count: 2,
        waste: 86400,
      },
    );

    expect(result.order).toEqual(['panelArea', 'totalArea', 'wastePercent']);
    expect(result.values).toEqual({
      panelArea: 432000,
      totalArea: 864000,
      wastePercent: 10,
    });
  });

  it.each<{
    definitions: Record<string, string>;
    values: Record<string, number>;
    expected: RegExp;
  }>([
    {
      definitions: { a: 'b + 1', b: 'a + 1' },
      values: {},
      expected: /cyclic parameter dependencies/i,
    },
    {
      definitions: { panelArea: 'width * height' },
      values: { width: 600 },
      expected: /unknown dependency height/i,
    },
    {
      definitions: { dangerous: 'globalThis.alert(1)' },
      values: {},
      expected: /unknown dependency globalThis/i,
    },
  ])('throws on invalid definitions', ({ definitions, values, expected }) => {
    expect(() => evaluateNamedParameters(definitions, values)).toThrow(expected);
  });
});

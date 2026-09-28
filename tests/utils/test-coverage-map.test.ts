import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  classifyFunctionCoverage,
  getDirectFunctionCalls,
  getDirectFunctionTestCases,
  getExportedFunctionLineRanges,
  getExportedFunctionNames,
} from '../../scripts/test-coverage-map.js';

function parseTypeScript(source: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('getExportedFunctionNames', () => {
  it('finds exported declarations and locally aliased functions', () => {
    const source = parseTypeScript(
      'export function declared() {} const expression = () => {}; export const initialized = function() {}; export { expression as aliased }; function privateFunction() {}; export { privateFunction };',
      'engine.ts',
    );

    expect(getExportedFunctionNames(source)).toEqual(['aliased', 'declared', 'initialized', 'privateFunction']);
  });
});

describe('getExportedFunctionLineRanges', () => {
  it('tracks implementation bodies and aliases without counting overload signatures as bodies', () => {
    const source = parseTypeScript(
      [
        'export function overloaded(value: string): string;',
        'export function overloaded(value: string) {',
        '  return value;',
        '}',
        'const expression = () => {',
        '  return true;',
        '};',
        'export { expression as aliased };',
      ].join('\n'),
      'engine.ts',
    );

    expect(getExportedFunctionLineRanges(source)).toEqual([
      { name: 'aliased', startLine: 5, endLine: 7 },
      { name: 'overloaded', startLine: 2, endLine: 4 },
    ]);
  });
});

describe('getDirectFunctionCalls', () => {
  it('recognizes aliased named imports and namespace calls from the target module', () => {
    const source = parseTypeScript(
      'import { exported as localName, unused } from "./engine"; import * as engine from "./engine"; import { unrelated } from "./other"; localName(); engine.otherExport(); unrelated();',
      'engine.test.ts',
    );

    expect(getDirectFunctionCalls(source, './engine')).toEqual(['exported', 'otherExport']);
  });
});

describe('getDirectFunctionTestCases', () => {
  it('maps aliased engine calls to named tests, including table-driven tests', () => {
    const source = parseTypeScript(
      [
        'import { exported as localName } from "./engine";',
        'it("returns a value", () => expect(localName()).toBe(1));',
        'it.each([1, 2])("handles case %s", (value) => localName(value));',
      ].join('\n'),
      'engine.test.ts',
    );

    expect(getDirectFunctionTestCases(source, './engine')).toEqual(
      new Map([['exported', ['handles case %s', 'returns a value']]]),
    );
  });
});

describe('classifyFunctionCoverage', () => {
  const bodyRange = { startLine: 4, endLine: 7 };

  it.each([
    {
      name: 'direct test with body hit',
      files: ['tests/engine/example.test.ts'],
      hits: new Map([[5, 1]]),
      range: bodyRange,
      expected: 'direct test listed; body lines hit',
    },
    {
      name: 'direct test but body not hit',
      files: ['tests/engine/example.test.ts'],
      hits: new Map([[5, 0]]),
      range: bodyRange,
      expected: 'direct test listed; body not hit',
    },
    {
      name: 'direct test without measurement',
      files: ['tests/engine/example.test.ts'],
      hits: undefined,
      range: bodyRange,
      expected: 'direct test listed; not measured',
    },
    {
      name: 'no runtime body',
      files: [],
      hits: new Map([[2, 3]]),
      range: { startLine: null, endLine: null },
      expected: 'no runtime body',
    },
    { name: 'not measured', files: [], hits: undefined, range: bodyRange, expected: 'not measured' },
    {
      name: 'body line hit',
      files: [],
      hits: new Map([[5, 1]]),
      range: bodyRange,
      expected: 'body lines hit; no direct-call match',
    },
    { name: 'hit outside body', files: [], hits: new Map([[8, 1]]), range: bodyRange, expected: 'uncovered' },
    { name: 'body measured but unhit', files: [], hits: new Map([[5, 0]]), range: bodyRange, expected: 'uncovered' },
  ])('classifies $name', ({ files, hits, range, expected }) => {
    expect(classifyFunctionCoverage(files, hits, range)).toBe(expected);
  });
});

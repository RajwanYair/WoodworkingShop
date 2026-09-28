import type ts from 'typescript';

export function getExportedFunctionNames(sourceFile: ts.SourceFile): string[];
export function getExportedFunctionLineRanges(
  sourceFile: ts.SourceFile,
): { name: string; startLine: number | null; endLine: number | null }[];
export function getDirectFunctionCalls(sourceFile: ts.SourceFile, specifier: string): string[];
export function getDirectFunctionTestCases(sourceFile: ts.SourceFile, specifier: string): Map<string, string[]>;
export function classifyFunctionCoverage(
  directTestFiles: readonly string[],
  lineHits: Map<number, number> | undefined,
  bodyRange: { startLine: number | null; endLine: number | null },
):
  | 'direct test listed; body lines hit'
  | 'direct test listed; body not hit'
  | 'direct test listed; not measured'
  | 'no runtime body'
  | 'not measured'
  | 'body lines hit; no direct-call match'
  | 'uncovered';

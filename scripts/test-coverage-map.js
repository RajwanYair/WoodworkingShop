#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as prettier from 'prettier';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src');
const testRoot = path.join(repoRoot, 'tests');
const reportRoot = path.join(os.tmpdir(), 'WoodworkingShop');
const lcovPaths = [
  path.join(reportRoot, 'coverage', 'lcov.info'),
  path.join(reportRoot, 'coverage-components', 'lcov.info'),
];
const outputPath = path.join(reportRoot, 'coverage-map.csv');
const functionStatusArtifactPath = path.join(repoRoot, 'tests', 'fixtures', 'engine-function-status.json');
const inventoryDirectories = ['engine', 'utils', 'store', 'hooks', 'components'];
const coverageExclusions = new Map([
  ['src/engine/index.ts', 'Excluded from thresholds: public API barrel with re-exports only.'],
]);
const functionCoverageWaivers = new Map();

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

function resolveSource(testFile, specifier) {
  if (!specifier.startsWith('.')) return null;

  const basePath = path.resolve(path.dirname(testFile), specifier);
  const candidates = [
    basePath,
    ...['.ts', '.tsx', '.js', '.jsx'].map((extension) => `${basePath}${extension}`),
    ...['.ts', '.tsx'].map((extension) => path.join(basePath, `index${extension}`)),
  ];

  return (
    candidates.find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile() && candidate.startsWith(`${sourceRoot}${path.sep}`),
    ) ?? null
  );
}

function readCoverage(lcovPath) {
  if (!fs.existsSync(lcovPath)) {
    throw new Error(`Coverage report not found at ${lcovPath}; run npm run test:coverage:map first.`);
  }

  const files = new Map();
  let currentFile = null;

  for (const line of fs.readFileSync(lcovPath, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      currentFile = path.resolve(line.slice(3)).toLowerCase();
      files.set(currentFile, new Map());
    } else if (currentFile && line.startsWith('DA:')) {
      const [lineNumber, hitCount] = line.slice(3).split(',').map(Number);
      files.get(currentFile).set(lineNumber, hitCount);
    } else if (line === 'end_of_record') {
      currentFile = null;
    }
  }

  return files;
}

function csvCell(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function getBodyLineRange(body, sourceFile) {
  if (!body) return { startLine: null, endLine: null };
  const startLine = sourceFile.getLineAndCharacterOfPosition(body.getStart(sourceFile)).line + 1;
  const endLine = sourceFile.getLineAndCharacterOfPosition(body.end - 1).line + 1;
  return { startLine, endLine };
}

/** @param {ts.SourceFile} sourceFile @returns {string[]} */
export function getExportedFunctionNames(sourceFile) {
  return getExportedFunctionLineRanges(sourceFile).map(({ name }) => name);
}

/** @param {ts.SourceFile} sourceFile @returns {{name: string, startLine: number | null, endLine: number | null}[]} */
export function getExportedFunctionLineRanges(sourceFile) {
  const functionDeclarations = new Set();
  const bodyRanges = new Map();
  const exportedFunctions = new Map();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      functionDeclarations.add(statement.name.text);
      if (statement.body) bodyRanges.set(statement.name.text, getBodyLineRange(statement.body, sourceFile));
      if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        exportedFunctions.set(statement.name.text, statement.name.text);
      }
    }

    if (ts.isVariableStatement(statement)) {
      const isExported =
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
        ) {
          functionDeclarations.add(declaration.name.text);
          bodyRanges.set(declaration.name.text, getBodyLineRange(declaration.initializer.body, sourceFile));
          if (isExported) exportedFunctions.set(declaration.name.text, declaration.name.text);
        }
      }
    }
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier) continue;
    const exportClause = statement.exportClause;
    if (!exportClause || !ts.isNamedExports(exportClause)) continue;

    for (const element of exportClause.elements) {
      const localName = element.propertyName?.text ?? element.name.text;
      if (functionDeclarations.has(localName)) exportedFunctions.set(element.name.text, localName);
    }
  }

  return [...exportedFunctions]
    .map(([name, localName]) => ({ name, ...bodyRanges.get(localName) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * @param {readonly string[]} directTestFiles
 * @param {Map<number, number> | undefined} lineHits
 * @param {{startLine: number | null, endLine: number | null}} bodyRange
 */
export function classifyFunctionCoverage(directTestFiles, lineHits, bodyRange) {
  if (!bodyRange.startLine || !bodyRange.endLine) return 'no runtime body';
  if (!lineHits) return directTestFiles.length > 0 ? 'direct test listed; not measured' : 'not measured';

  let bodyHit = false;
  for (const [lineNumber, hits] of lineHits) {
    if (hits > 0 && lineNumber >= bodyRange.startLine && lineNumber <= bodyRange.endLine) {
      bodyHit = true;
      break;
    }
  }

  if (directTestFiles.length > 0) {
    return bodyHit ? 'direct test listed; body lines hit' : 'direct test listed; body not hit';
  }
  if (bodyHit) return 'body lines hit; no direct-call match';
  return 'uncovered';
}

/**
 * @param {readonly string[]} directTestFiles
 * @param {Map<number, number> | undefined} lineHits
 * @param {{startLine: number | null, endLine: number | null}} bodyRange
 * @param {string | undefined} waiverReason
 */
export function getFunctionCoverageStatus(directTestFiles, lineHits, bodyRange, waiverReason) {
  if (waiverReason !== undefined) {
    if (!waiverReason.trim()) throw new Error('A coverage waiver must include a reason.');
    return 'waived';
  }

  const classification = classifyFunctionCoverage(directTestFiles, lineHits, bodyRange);
  if (classification === 'direct test listed; body lines hit') return 'covered';
  if (classification === 'body lines hit; no direct-call match') return 'indirect';
  throw new Error(`Engine function has no measured body coverage: ${classification}.`);
}

/** @param {ts.SourceFile} sourceFile @param {string} specifier @returns {string[]} */
export function getDirectFunctionCalls(sourceFile, specifier) {
  const namedImports = new Map();
  const namespaceImports = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== specifier) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      namespaceImports.add(bindings.name.text);
    } else {
      for (const element of bindings.elements) {
        namedImports.set(element.name.text, element.propertyName?.text ?? element.name.text);
      }
    }
  }

  const calledFunctions = new Set();
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && namedImports.has(node.expression.text)) {
        calledFunctions.add(namedImports.get(node.expression.text));
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        namespaceImports.has(node.expression.expression.text)
      ) {
        calledFunctions.add(node.expression.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return [...calledFunctions].sort();
}

/** @param {ts.SourceFile} sourceFile @param {string} specifier @returns {Map<string, string[]>} */
export function getDirectFunctionTestCases(sourceFile, specifier) {
  const namedImports = new Map();
  const namespaceImports = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== specifier) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      namespaceImports.add(bindings.name.text);
    } else {
      for (const element of bindings.elements) {
        namedImports.set(element.name.text, element.propertyName?.text ?? element.name.text);
      }
    }
  }

  const testCases = new Map();
  const getTestCase = (node) => {
    if (!ts.isCallExpression(node) || node.arguments.length < 2) return null;
    const expression = node.expression;
    const testRunner = ts.isIdentifier(expression)
      ? expression.text
      : ts.isCallExpression(expression) &&
          ts.isPropertyAccessExpression(expression.expression) &&
          expression.expression.name.text === 'each' &&
          ts.isIdentifier(expression.expression.expression)
        ? expression.expression.expression.text
        : null;
    if (testRunner !== 'it' && testRunner !== 'test') return null;

    const title = node.arguments[0];
    const callback = node.arguments[1];
    if (
      (!ts.isStringLiteral(title) && !ts.isNoSubstitutionTemplateLiteral(title)) ||
      (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
    ) {
      return null;
    }
    return { title: title.text, callback };
  };

  const visit = (node, testTitle) => {
    const testCase = getTestCase(node);
    if (testCase) {
      visit(testCase.callback, testCase.title);
      return;
    }

    if (testTitle && ts.isCallExpression(node)) {
      const expression = node.expression;
      const functionName =
        ts.isIdentifier(expression) && namedImports.has(expression.text)
          ? namedImports.get(expression.text)
          : ts.isPropertyAccessExpression(expression) &&
              ts.isIdentifier(expression.expression) &&
              namespaceImports.has(expression.expression.text)
            ? expression.name.text
            : null;

      if (functionName) {
        const titles = testCases.get(functionName) ?? new Set();
        titles.add(testTitle);
        testCases.set(functionName, titles);
      }
    }

    ts.forEachChild(node, (child) => visit(child, testTitle));
  };
  visit(sourceFile, null);

  return new Map([...testCases].map(([name, titles]) => [name, [...titles].sort()]));
}

async function main() {
  const sourceFiles = inventoryDirectories
    .flatMap((directory) => filesUnder(path.join(sourceRoot, directory)))
    .filter((file) => /\.tsx?$/.test(file));
  const testFiles = filesUnder(testRoot).filter((file) => /\.test\.tsx?$/.test(file));
  const directTests = new Map(sourceFiles.map((file) => [path.resolve(file).toLowerCase(), new Set()]));
  const engineFiles = filesUnder(path.join(sourceRoot, 'engine')).filter((file) => /\.tsx?$/.test(file));
  const engineFunctions = new Map(
    engineFiles.map((file) => {
      const scriptKind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      const sourceFile = ts.createSourceFile(
        file,
        fs.readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        scriptKind,
      );
      const testsByFunction = new Map(
        getExportedFunctionLineRanges(sourceFile).map(({ name, startLine, endLine }) => [
          name,
          { startLine, endLine, tests: new Set(), testCases: new Set() },
        ]),
      );
      return [path.resolve(file).toLowerCase(), testsByFunction];
    }),
  );

  for (const testFile of testFiles) {
    const scriptKind = testFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(
      testFile,
      fs.readFileSync(testFile, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );
    const recordImport = (specifier) => {
      const source = resolveSource(testFile, specifier);
      if (source)
        directTests
          .get(path.resolve(source).toLowerCase())
          ?.add(path.relative(repoRoot, testFile).replaceAll(path.sep, '/'));
    };

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      recordImport(statement.moduleSpecifier.text);

      const source = resolveSource(testFile, statement.moduleSpecifier.text);
      if (!source) continue;
      const testsByFunction = engineFunctions.get(path.resolve(source).toLowerCase());
      for (const functionName of getDirectFunctionCalls(sourceFile, statement.moduleSpecifier.text)) {
        const entry = testsByFunction?.get(functionName);
        entry?.tests.add(path.relative(repoRoot, testFile).replaceAll(path.sep, '/'));
        for (const title of getDirectFunctionTestCases(sourceFile, statement.moduleSpecifier.text).get(functionName) ??
          []) {
          entry?.testCases.add(title);
        }
      }
    }

    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      )
        recordImport(node.arguments[0].text);
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  const coverage = new Map(lcovPaths.flatMap((lcovPath) => [...readCoverage(lcovPath)]));
  const rows = sourceFiles.map((file) => {
    const key = path.resolve(file).toLowerCase();
    const source = path.relative(repoRoot, file).replaceAll(path.sep, '/');
    const tests = [...(directTests.get(key) ?? [])].sort();
    const hitLines = coverage.get(key);
    const hasHits = hitLines ? [...hitLines.values()].some((hitCount) => hitCount > 0) : false;
    const classification = tests.length
      ? 'direct'
      : hitLines === undefined
        ? 'not measured'
        : hasHits
          ? 'indirect integration-only'
          : 'uncovered';

    return {
      source,
      classification,
      directTests: tests.join('; '),
      coverageNote: coverageExclusions.get(source) ?? '',
    };
  });

  fs.mkdirSync(reportRoot, { recursive: true });
  const csv = [
    'source,classification,direct_test_files,coverage_note',
    ...rows.map((row) => [row.source, row.classification, row.directTests, row.coverageNote].map(csvCell).join(',')),
  ].join('\n');
  fs.writeFileSync(outputPath, `${csv}\n`, 'utf8');

  const functionRows = engineFiles.flatMap((file) => {
    const source = path.relative(repoRoot, file).replaceAll(path.sep, '/');
    const testsByFunction = engineFunctions.get(path.resolve(file).toLowerCase());
    const lineHits = coverage.get(path.resolve(file).toLowerCase());
    return [...(testsByFunction ?? [])].map(([functionName, entry]) => {
      const tests = [...entry.tests].sort();
      const testCases = [...entry.testCases].sort();
      const waiverReason = functionCoverageWaivers.get(`${source}#${functionName}`);
      const status = getFunctionCoverageStatus(tests, lineHits, entry, waiverReason);

      return {
        source,
        functionName,
        tests,
        testCases,
        status,
        ...(waiverReason ? { waiverReason } : {}),
      };
    });
  });
  const functionOutputPath = path.join(reportRoot, 'coverage-map-functions.csv');
  const functionCsv = [
    'source,function,direct_test_files,direct_test_cases,coverage_status',
    ...functionRows.map((row) =>
      [row.source, row.functionName, row.tests.join('; '), row.testCases.join('; '), row.status].map(csvCell).join(','),
    ),
  ].join('\n');
  fs.writeFileSync(functionOutputPath, `${functionCsv}\n`, 'utf8');

  const statusCounts = functionRows.reduce(
    (result, row) => {
      result[row.status] += 1;
      return result;
    },
    { covered: 0, indirect: 0, waived: 0 },
  );
  const statusArtifact = JSON.stringify(
    {
      schemaVersion: 1,
      summary: statusCounts,
      functions: functionRows,
    },
    null,
    2,
  );
  const prettierConfig = await prettier.resolveConfig(functionStatusArtifactPath);
  const formattedStatusArtifact = await prettier.format(statusArtifact, {
    ...prettierConfig,
    filepath: functionStatusArtifactPath,
  });
  fs.writeFileSync(functionStatusArtifactPath, formattedStatusArtifact, 'utf8');

  const counts = rows.reduce((result, row) => {
    result[row.classification] = (result[row.classification] ?? 0) + 1;
    return result;
  }, {});
  console.log(`Test coverage inventory: ${rows.length} production modules across ${testFiles.length} test files.`);
  for (const [classification, count] of Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${classification}: ${count}`);
  }
  console.log(`CSV: ${outputPath}`);
  console.log(`Engine function inventory: ${functionRows.length} functions in ${functionOutputPath}`);
  console.log(`Tracked function status artifact: ${functionStatusArtifactPath}`);
  const functionCounts = functionRows.reduce((result, row) => {
    result[row.status] = (result[row.status] ?? 0) + 1;
    return result;
  }, {});
  for (const [status, count] of Object.entries(functionCounts).sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${status}: ${count}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const MODULE_DIRECTORIES = ['src/engine', 'src/utils', 'src/services'];
const UI_DIRECTORIES = ['src/components', 'src/store', 'src/hooks', 'src/workers'];
const REPORT_DIRECTORY = path.join(os.tmpdir(), 'WoodworkingShop', 'capability-map');
const LEDGER_PATH = 'config/capability-ledger.json';
const VALID_STATUSES = new Set(['surfaced', 'internal', 'public-api', 'surface-next', 'retire']);

function normalizePath(filePath) {
  return path.posix.normalize(filePath.replaceAll('\\', '/')).replace(/^\.\//, '');
}

function resolveModulePath(importer, specifier, knownFiles) {
  const cleanSpecifier = specifier.replace(/[?#].*$/, '');
  if (!cleanSpecifier.startsWith('.') && !cleanSpecifier.startsWith('@/')) return null;

  const basePath = normalizePath(
    cleanSpecifier.startsWith('@/')
      ? `src/${cleanSpecifier.slice(2)}`
      : path.posix.join(path.posix.dirname(importer), cleanSpecifier),
  );
  const candidates = [basePath, ...SOURCE_EXTENSIONS.map((extension) => `${basePath}${extension}`)];
  const explicitExtension = path.posix.extname(basePath);
  if (explicitExtension) {
    const extensionlessPath = basePath.slice(0, -explicitExtension.length);
    candidates.push(...SOURCE_EXTENSIONS.map((extension) => `${extensionlessPath}${extension}`));
  }
  for (const extension of SOURCE_EXTENSIONS) candidates.push(path.posix.join(basePath, `index${extension}`));
  return candidates.find((candidate) => knownFiles.has(candidate)) ?? null;
}

function collectReferences(sourceFile) {
  const references = [];
  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const specifier = statement.moduleSpecifier.text;
      references.push({ specifier, kind: /\?worker(?:&|$)/.test(specifier) ? 'worker' : 'static' });
    }
  }

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      references.push({ specifier: node.arguments[0].text, kind: 'dynamic' });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
}

/** @param {Readonly<Record<string, string>>} sources */
export function buildImportGraph(sources) {
  const normalizedSources = new Map(
    Object.entries(sources).map(([filePath, source]) => [normalizePath(filePath), source]),
  );
  const graph = new Map();

  for (const [filePath, source] of normalizedSources) {
    const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
    const edges = collectReferences(sourceFile).flatMap(({ specifier, kind }) => {
      const target = resolveModulePath(filePath, specifier, normalizedSources);
      return target ? [{ target, kind }] : [];
    });
    graph.set(filePath, edges);
  }

  return graph;
}

function buildReverseGraph(graph) {
  const reverseGraph = new Map();
  for (const [importer, edges] of graph) {
    for (const { target } of edges) {
      const importers = reverseGraph.get(target) ?? new Set();
      importers.add(importer);
      reverseGraph.set(target, importers);
    }
  }
  return reverseGraph;
}

function collectReachableNodes(graph, roots) {
  const reachable = new Set();
  const pending = [...roots].map(normalizePath);
  while (pending.length > 0) {
    const current = pending.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const { target } of graph.get(current) ?? []) pending.push(target);
  }
  return reachable;
}

/** @param {Map<string, {target: string, kind: string}[]>} graph @param {string} target @param {Iterable<string>} roots */
export function findReachableRoots(graph, target, roots) {
  const reverseGraph = buildReverseGraph(graph);
  const rootSet = new Set([...roots].map(normalizePath));
  const reachedRoots = new Set();
  const visited = new Set();
  const pending = [normalizePath(target)];
  while (pending.length > 0) {
    const current = pending.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    if (rootSet.has(current)) reachedRoots.add(current);
    for (const importer of reverseGraph.get(current) ?? []) pending.push(importer);
  }
  return [...reachedRoots].sort();
}

/** @param {Map<string, {target: string, kind: string}[]>} graph @param {string} target */
export function isBarrelOnlyExposure(graph, target) {
  const normalizedTarget = normalizePath(target);
  const importers = [...graph].flatMap(([importer, edges]) =>
    edges.some((edge) => edge.target === normalizedTarget) ? [importer] : [],
  );
  return importers.length > 0 && importers.every((importer) => /^index\.[^.]+$/.test(path.posix.basename(importer)));
}

/**
 * @param {Readonly<Record<string, string>>} sources
 * @param {{modulePaths: string[], uiRoots: string[], testRoots: string[], outputChunks?: Record<string, string[]>}} options
 */
export function buildCapabilityInventory(sources, options) {
  const graph = buildImportGraph(sources);
  const reverseGraph = buildReverseGraph(graph);
  const reachableFromApp = collectReachableNodes(graph, options.uiRoots);
  const uiRootSet = new Set(
    [...reachableFromApp].filter(
      (filePath) =>
        filePath === 'src/App.tsx' || UI_DIRECTORIES.some((directory) => filePath.startsWith(`${directory}/`)),
    ),
  );
  const testRootSet = new Set(options.testRoots.map(normalizePath));
  const outputChunks = options.outputChunks ?? {};

  return options.modulePaths
    .map(normalizePath)
    .sort()
    .map((modulePath) => {
      const directImporters = [...(reverseGraph.get(modulePath) ?? [])].sort();
      const internalImporters = directImporters.filter((importer) =>
        MODULE_DIRECTORIES.some((directory) => importer.startsWith(`${directory}/`)),
      );
      return {
        path: modulePath,
        uiImporters: findReachableRoots(graph, modulePath, uiRootSet).filter((importer) => importer !== modulePath),
        internalImporters,
        barrelOnly: isBarrelOnlyExposure(graph, modulePath),
        testImporters: findReachableRoots(graph, modulePath, testRootSet).filter((importer) => importer !== modulePath),
        outputChunks: outputChunks[modulePath] ?? [],
      };
    });
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function relativePath(repoRoot, filePath) {
  return normalizePath(path.relative(repoRoot, filePath));
}

function readChunkMetadata() {
  const filePath = path.join(REPORT_DIRECTORY, 'chunks.json');
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectRepositoryInventory(repoRoot) {
  const sourceFiles = walkFiles(path.join(repoRoot, 'src')).filter((filePath) =>
    SOURCE_EXTENSIONS.includes(path.extname(filePath)),
  );
  const testFiles = walkFiles(path.join(repoRoot, 'tests')).filter((filePath) => /\.test\.[jt]sx?$/.test(filePath));
  const files = [
    ...sourceFiles,
    ...walkFiles(path.join(repoRoot, 'tests')).filter((filePath) => SOURCE_EXTENSIONS.includes(path.extname(filePath))),
  ];
  const sources = Object.fromEntries(
    files.map((filePath) => [relativePath(repoRoot, filePath), fs.readFileSync(filePath, 'utf8')]),
  );
  const modulePaths = sourceFiles
    .map((filePath) => relativePath(repoRoot, filePath))
    .filter((filePath) => MODULE_DIRECTORIES.some((directory) => filePath.startsWith(`${directory}/`)));
  const uiRoots = [path.join(repoRoot, 'src', 'App.tsx')]
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => relativePath(repoRoot, filePath));

  return buildCapabilityInventory(sources, {
    modulePaths,
    uiRoots,
    testRoots: testFiles.map((filePath) => relativePath(repoRoot, filePath)),
    outputChunks: readChunkMetadata(),
  });
}

function compareVersions(left, right) {
  const parse = (version) => version.split('.').map(Number);
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if ((leftParts[index] ?? 0) !== (rightParts[index] ?? 0)) {
      return (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    }
  }
  return 0;
}

/** @param {ReturnType<typeof buildCapabilityInventory>} inventory @param {{modules: object[]|Record<string, object>}} ledger @param {string} currentVersion */
export function checkCapabilityLedger(inventory, ledger, currentVersion) {
  const errors = [];
  const entries = new Map();

  for (const entry of normalizeLedgerEntries(ledger)) {
    if (entries.has(entry.path)) errors.push(`Duplicate ledger entry: ${entry.path}`);
    entries.set(entry.path, entry);
    if (!VALID_STATUSES.has(entry.status)) errors.push(`${entry.path}: invalid status '${entry.status}'.`);
    if (entry.status === 'surface-next' && (!Number.isInteger(entry.targetSprint) || entry.targetSprint < 1)) {
      errors.push(`${entry.path}: surface-next requires a positive targetSprint.`);
    }
    if (entry.status === 'surface-next' && !entry.reason?.trim()) {
      errors.push(`${entry.path}: surface-next requires a reason.`);
    }
    if (entry.status === 'internal' && !entry.reason?.trim()) errors.push(`${entry.path}: internal requires a reason.`);
    if (entry.status === 'public-api' && !/^docs\/(API-BOUNDARIES|PLUGIN-API)\.md$/.test(entry.documentedIn ?? '')) {
      errors.push(`${entry.path}: public-api requires documentedIn in API-BOUNDARIES.md or PLUGIN-API.md.`);
    }
    if (entry.status === 'retire') {
      if (!entry.reason?.trim()) errors.push(`${entry.path}: retire requires a reason.`);
      if (!/^\d+\.\d+\.\d+$/.test(entry.targetRelease ?? '')) {
        errors.push(`${entry.path}: retire requires a semantic targetRelease.`);
      } else if (compareVersions(currentVersion, entry.targetRelease) >= 0) {
        errors.push(`${entry.path}: retirement target ${entry.targetRelease} is overdue; module still exists.`);
      }
    }
  }

  const modulePaths = new Set(inventory.map(({ path: modulePath }) => modulePath));
  for (const modulePath of modulePaths) {
    if (!entries.has(modulePath)) errors.push(`${modulePath}: unclassified module.`);
  }
  for (const modulePath of entries.keys()) {
    if (!modulePaths.has(modulePath)) errors.push(`${modulePath}: ledger entry does not match a source module.`);
  }
  for (const module of inventory) {
    const entry = entries.get(module.path);
    if (entry?.status === 'surfaced' && module.uiImporters.length === 0) {
      errors.push(`${module.path}: surfaced module has no UI importers.`);
    }
  }
  return errors;
}

function inferInitialLedger(inventory, documentation) {
  return {
    version: 1,
    modules: inventory.map((module) => {
      if (documentation.includes(module.path)) {
        const documentedIn = ['docs/API-BOUNDARIES.md', 'docs/PLUGIN-API.md'].find(
          (filePath) => fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8').includes(module.path),
        );
        if (documentedIn) return { path: module.path, status: 'public-api', documentedIn };
      }
      if (module.uiImporters.length > 0) return { path: module.path, status: 'surfaced' };
      if (module.internalImporters.length > 0) {
        return {
          path: module.path,
          status: 'internal',
          reason: 'Used by internal source modules and has no UI-root importer.',
        };
      }
      return {
        path: module.path,
        status: 'surface-next',
        targetSprint: 373,
        reason: 'No UI-root or internal importer; evaluate for surfacing or retirement in Sprint 373.',
      };
    }),
  };
}

function normalizeLedgerEntries(ledger) {
  if (Array.isArray(ledger.modules)) return ledger.modules;
  if (!ledger.modules || typeof ledger.modules !== 'object') return [];
  return Object.entries(ledger.modules).map(([modulePath, entry]) => ({
    path: modulePath,
    status: entry.classification,
    reason: entry.rationale,
    documentedIn: entry.documentation,
    targetSprint: entry.targetSprint,
    targetRelease: entry.targetRelease,
  }));
}

function writeReports(inventory, ledger) {
  fs.mkdirSync(REPORT_DIRECTORY, { recursive: true });
  const entries = new Map(normalizeLedgerEntries(ledger).map((entry) => [entry.path, entry]));
  const report = inventory.map((module) => ({ ...module, ...entries.get(module.path) }));
  fs.writeFileSync(path.join(REPORT_DIRECTORY, 'capability-map.json'), `${JSON.stringify(report, null, 2)}\n`);
  const rows = report.map(
    (module) =>
      `| ${module.path} | ${module.status ?? 'unclassified'} | ${module.uiImporters.join(', ') || '-'} | ${module.internalImporters.join(', ') || '-'} | ${module.barrelOnly ? 'yes' : 'no'} | ${module.testImporters.join(', ') || '-'} | ${module.outputChunks.join(', ') || 'not built'} |`,
  );
  const markdown = [
    '# Capability Map',
    '',
    'Generated by `npm run capabilities:check`. Bundle chunks are populated by a production build; `not built` means no current chunk metadata was available.',
    '',
    '| Module | Status | UI importers | Internal importers | Barrel-only | Test importers | Output chunks |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(REPORT_DIRECTORY, 'capability-map.md'), markdown);
}

async function main() {
  const repoRoot = process.cwd();
  const inventory = collectRepositoryInventory(repoRoot);
  const ledgerPath = path.join(repoRoot, LEDGER_PATH);
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  if (process.argv.includes('--init-ledger')) {
    if (fs.existsSync(ledgerPath)) throw new Error(`${LEDGER_PATH} already exists; refusing to overwrite it.`);
    const documentation = ['docs/API-BOUNDARIES.md', 'docs/PLUGIN-API.md']
      .filter((filePath) => fs.existsSync(path.join(repoRoot, filePath)))
      .map((filePath) => fs.readFileSync(path.join(repoRoot, filePath), 'utf8'))
      .join('\n');
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.writeFileSync(ledgerPath, `${JSON.stringify(inferInitialLedger(inventory, documentation), null, 2)}\n`);
    console.log(
      `Created ${LEDGER_PATH} with ${inventory.length} classified modules; review each entry before release.`,
    );
    return;
  }

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  writeReports(inventory, ledger);
  const errors = checkCapabilityLedger(inventory, ledger, packageJson.version);
  console.log(`Capability map: ${inventory.length} modules; reports written to ${REPORT_DIRECTORY}`);
  if (errors.length > 0) {
    console.error(`Capability ledger check failed (${errors.length}):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  await main();
}

#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import Ajv2020 from 'ajv/dist/2020.js';
import { fileURLToPath } from 'node:url';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src');
const reportRoot = path.join(os.tmpdir(), 'WoodworkingShop', 'capability-map');
const ledgerPath = path.join(repoRoot, 'config', 'capability-ledger.json');
const targetRoots = ['engine', 'utils', 'services'];
const allowedClassifications = new Set(['surfaced', 'internal', 'public-api', 'surface-next', 'retire']);
const ajv = new Ajv2020({ allErrors: true, strict: true });
const ledgerSchema = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'config', 'schemas', 'capability-ledger.schema.json'), 'utf8'),
);
const validateLedgerSchema = ajv.compile(ledgerSchema);

function normalizePath(filePath) {
  return path.resolve(filePath).replaceAll('\\', '/');
}

function stripImportQuery(specifier) {
  return specifier.replace(/\?(?:worker|sharedworker)(?:&.*)?$/, '');
}

function resolveModule(importer, specifier, knownFiles) {
  if (specifier.startsWith('@/')) {
    const aliasedPath = path.join(sourceRoot, specifier.slice(2));
    const candidates = [
      aliasedPath,
      ...['.ts', '.tsx', '.js', '.jsx'].map((extension) => `${aliasedPath}${extension}`),
      ...['.ts', '.tsx'].map((extension) => path.join(aliasedPath, `index${extension}`)),
    ];
    return candidates.find((candidate) => knownFiles.has(normalizePath(candidate))) ?? null;
  }
  const cleanSpecifier = stripImportQuery(specifier);
  if (!cleanSpecifier.startsWith('.')) return null;

  const basePath = path.resolve(path.dirname(importer), cleanSpecifier);
  const candidates = [
    basePath,
    ...['.ts', '.tsx', '.js', '.jsx'].map((extension) => `${basePath}${extension}`),
    ...['.ts', '.tsx'].map((extension) => path.join(basePath, `index${extension}`)),
  ];
  return candidates.find((candidate) => knownFiles.has(normalizePath(candidate))) ?? null;
}

/** @param {string} source @param {string} fileName */
export function collectImportSpecifiers(source, fileName) {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind);
  const imports = new Set();

  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      imports.add(statement.moduleSpecifier.text);
    }
  }

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.add(node.arguments[0].text);
    }

    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Worker' &&
      node.arguments?.length
    ) {
      const workerUrl = node.arguments.find(
        (argument) =>
          ts.isNewExpression(argument) && ts.isIdentifier(argument.expression) && argument.expression.text === 'URL',
      );
      if (workerUrl && ts.isNewExpression(workerUrl)) {
        const specifier = workerUrl.arguments?.[0];
        if (specifier && ts.isStringLiteral(specifier)) imports.add(specifier.text);
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...imports].sort();
}

/** @param {Map<string, string>} files */
export function buildImportGraph(files) {
  const knownFiles = new Set([...files.keys()].map(normalizePath));
  const importersByModule = new Map([...knownFiles].map((file) => [file, new Set()]));
  const importsByModule = new Map([...knownFiles].map((file) => [file, new Set()]));

  for (const [filePath, source] of files) {
    const importer = normalizePath(filePath);
    for (const specifier of collectImportSpecifiers(source, importer)) {
      const imported = resolveModule(importer, specifier, knownFiles);
      if (!imported) continue;
      const resolved = normalizePath(imported);
      importsByModule.get(importer).add(resolved);
      importersByModule.get(resolved).add(importer);
    }
  }

  const uiImportersByModule = new Map([...knownFiles].map((file) => [file, new Set()]));
  const uiEntries = [...knownFiles].filter((file) => ['ui', 'app'].includes(sourceKind(file)));
  for (const entry of uiEntries) {
    const visited = new Set();
    const pending = [entry];
    while (pending.length) {
      const current = pending.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      uiImportersByModule.get(current)?.add(entry);
      pending.push(...(importsByModule.get(current) ?? []));
    }
  }

  return { importsByModule, importersByModule, uiImportersByModule };
}

function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.[jt]sx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function sourceKind(filePath) {
  const relative = relativePath(filePath);
  if (relative === 'src/App.tsx') return 'app';
  if (relative.startsWith('src/components/')) return 'ui';
  if (relative.startsWith('src/store/')) return 'ui';
  if (relative.startsWith('src/hooks/')) return 'ui';
  if (relative.startsWith('src/workers/')) return 'ui';
  if (relative.startsWith('tests/')) return 'test';
  return 'other';
}

function moduleRecords(files, graph, outputChunks = new Map()) {
  const allSourcePaths = [...files.keys()];
  const targetFiles = allSourcePaths.filter((filePath) =>
    targetRoots.some((root) => relativePath(filePath).startsWith(`src/${root}/`)),
  );

  return targetFiles
    .map((filePath) => {
      const relative = relativePath(filePath);
      const importers = [...(graph.importersByModule.get(normalizePath(filePath)) ?? [])];
      const directUiImporters = importers.filter((importer) => ['ui', 'app'].includes(sourceKind(importer)));
      const transitiveUiImporters = [...(graph.uiImportersByModule.get(normalizePath(filePath)) ?? [])];
      const engineImporters = importers.filter((importer) => relativePath(importer).startsWith('src/engine/'));
      const testImporters = importers.filter((importer) => sourceKind(importer) === 'test');
      const barrelImporters = importers.filter((importer) => /\/index\.[jt]sx?$/.test(importer));

      return {
        path: relative,
        kind: relative.split('/')[1],
        uiImporters: directUiImporters.map(relativePath).sort(),
        transitiveUiImporters: transitiveUiImporters.map(relativePath).sort(),
        engineInternalImporters: engineImporters.map(relativePath).sort(),
        barrelOnlyExposure: directUiImporters.length === 0 && barrelImporters.length > 0,
        testImporters: testImporters.map(relativePath).sort(),
        outputChunk: outputChunks.get(normalizePath(filePath)) ?? null,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function writeReports(records, ledger = null, buildMetadataAvailable = false) {
  fs.mkdirSync(reportRoot, { recursive: true });
  const classifications = ledger?.modules ?? {};
  const reportRecords = records.map((record) => ({
    ...record,
    ...(classifications[record.path] ?? { classification: 'unclassified', rationale: '' }),
    outputChunk: record.outputChunk ?? (buildMetadataAvailable ? 'Not emitted' : null),
  }));
  fs.writeFileSync(path.join(reportRoot, 'capability-map.json'), `${JSON.stringify(reportRecords, null, 2)}\n`, 'utf8');
  const rows = [
    '# Capability Map',
    '',
    `Generated from the current source tree. Modules: ${records.length}.`,
    '',
    '| Module | Classification | Rationale | Target | Direct UI importers | Transitive UI importers | Tests | Chunk |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | --- |',
    ...reportRecords.map((record) => {
      const target = record.targetSprint
        ? `Sprint ${record.targetSprint}`
        : record.targetRelease
          ? `v${record.targetRelease}`
          : '—';
      const chunk = record.outputChunk ?? 'Not built';
      return `| \`${record.path}\` | ${record.classification} | ${record.rationale.replaceAll('|', '\\|')} | ${target} | ${record.uiImporters.length} | ${record.transitiveUiImporters.length} | ${record.testImporters.length} | ${chunk} |`;
    }),
    '',
  ];
  fs.writeFileSync(path.join(reportRoot, 'capability-map.md'), `${rows.join('\n')}\n`, 'utf8');
}

export function createCapabilityMap(files) {
  return moduleRecords(files, buildImportGraph(files));
}

function readOutputChunks() {
  const outputPath = path.join(reportRoot, 'output-chunks.json');
  if (!fs.existsSync(outputPath)) return { chunks: new Map(), available: false };
  const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  return {
    chunks: new Map(Object.entries(data).map(([filePath, chunk]) => [normalizePath(filePath), chunk])),
    available: true,
  };
}

function scaffoldLedger(records) {
  if (fs.existsSync(ledgerPath))
    throw new Error(`${ledgerPath} already exists; refusing to overwrite classifications.`);
  const modules = Object.fromEntries(
    records.map((record) => [
      record.path,
      record.transitiveUiImporters.length
        ? {
            classification: 'surfaced',
            rationale: `Transitive UI reachability is evidenced by ${record.transitiveUiImporters[0]}.`,
          }
        : { classification: 'unclassified', rationale: '' },
    ]),
  );
  fs.writeFileSync(ledgerPath, `${JSON.stringify({ schemaVersion: 1, modules }, null, 2)}\n`, 'utf8');
  console.log(
    `Created ${path.relative(repoRoot, ledgerPath)} with reachable modules surfaced and all others unclassified.`,
  );
  console.log('Review and classify every unclassified entry, then run npm run capabilities:check.');
}

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

export function validateLedger(records, ledger) {
  const errors = [];
  if (!validateLedgerSchema(ledger)) {
    errors.push(...(validateLedgerSchema.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message}`));
    return errors;
  }

  const recordsByPath = new Map(records.map((record) => [record.path, record]));
  for (const [modulePath, entry] of Object.entries(ledger.modules)) {
    const record = recordsByPath.get(modulePath);
    if (!record) {
      errors.push(`${modulePath}: ledger entry does not match a source module.`);
      continue;
    }
    if (!allowedClassifications.has(entry.classification)) {
      errors.push(`${modulePath}: unclassified or invalid classification '${entry.classification}'.`);
      continue;
    }
    if (typeof entry.rationale !== 'string' || !entry.rationale.trim()) {
      errors.push(`${modulePath}: rationale is required.`);
    }
    if (entry.classification === 'surfaced' && record.transitiveUiImporters.length === 0) {
      errors.push(`${modulePath}: classified surfaced but has no transitive UI importer.`);
    }
    if (entry.classification === 'surface-next' && !Number.isInteger(entry.targetSprint)) {
      errors.push(`${modulePath}: surface-next requires an integer targetSprint.`);
    }
    if (entry.classification === 'retire') {
      if (typeof entry.targetRelease !== 'string' || !/^\d+\.\d+\.\d+$/.test(entry.targetRelease)) {
        errors.push(`${modulePath}: retire requires targetRelease in X.Y.Z format.`);
      } else if (compareVersions(readPackageVersion(), entry.targetRelease) >= 0) {
        errors.push(`${modulePath}: still present at or after retirement release ${entry.targetRelease}.`);
      }
      if (Number.isInteger(entry.targetSprint) && readCompletedSprints().has(entry.targetSprint)) {
        errors.push(`${modulePath}: still present after retirement sprint ${entry.targetSprint} was completed.`);
      }
    }
    if (entry.classification === 'public-api') {
      const documentation = entry.documentation;
      const docPath = typeof documentation === 'string' ? path.join(repoRoot, documentation) : '';
      if (
        !['docs/API-BOUNDARIES.md', 'docs/PLUGIN-API.md'].includes(documentation) ||
        !fs.existsSync(docPath) ||
        !fs.readFileSync(docPath, 'utf8').includes(modulePath)
      ) {
        errors.push(`${modulePath}: public-api requires a mention in docs/API-BOUNDARIES.md or docs/PLUGIN-API.md.`);
      }
    }
  }

  for (const modulePath of recordsByPath.keys()) {
    if (!(modulePath in ledger.modules)) errors.push(`${modulePath}: missing capability classification.`);
  }
  return errors;
}

function readCompletedSprints() {
  const roadmap = fs.readFileSync(path.join(repoRoot, 'ROADMAP.md'), 'utf8');
  const completed = new Set();
  for (const match of roadmap.matchAll(/\*\*Sprint (\d+)[^\n]*\*\*[^\n]*DONE/gi)) completed.add(Number(match[1]));
  return completed;
}

function loadRepositoryFiles() {
  return [...new Set([...sourceFiles(sourceRoot), ...sourceFiles(path.join(repoRoot, 'tests'))])].reduce(
    (files, filePath) => files.set(normalizePath(filePath), fs.readFileSync(filePath, 'utf8')),
    new Map(),
  );
}

function main() {
  const files = loadRepositoryFiles();
  const output = readOutputChunks();
  const records = moduleRecords(files, buildImportGraph(files), output.chunks);
  if (process.argv.includes('--initialize-ledger')) {
    scaffoldLedger(records);
    return;
  }
  if (!fs.existsSync(ledgerPath)) throw new Error('Capability ledger is missing; run npm run capabilities:init first.');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  writeReports(records, ledger, output.available);
  const counts = records.reduce((result, record) => {
    const classification = record.transitiveUiImporters.length ? 'ui-reachable' : 'not-ui-reachable';
    result[classification] = (result[classification] ?? 0) + 1;
    return result;
  }, {});
  console.log(`Capability map: ${records.length} modules across engine, utils, services.`);
  for (const [classification, count] of Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${classification}: ${count}`);
  }
  console.log(`Reports: ${reportRoot}`);
  const errors = validateLedger(records, ledger);
  if (errors.length) {
    console.error(`Capability ledger check failed (${errors.length}):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Capability ledger check passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

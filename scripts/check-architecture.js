#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { buildImportGraph } from './capability-map.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ENGINE_DOMAINS = new Set([
  'assembly',
  'calculators',
  'costing',
  'export',
  'geometry',
  'hardware',
  'joinery',
  'materials',
  'optimizer',
  'project',
  'room',
  'workshop',
]);
const TARGET_LAYERS = new Map([
  ['app', 'src/app/'],
  ['features', 'src/features/'],
  ['ui', 'src/ui/'],
  ['store', 'src/store/'],
  ['platform', 'src/platform/'],
  ['workers', 'src/workers/'],
  ['engine', 'src/engine/'],
]);
const ALLOWED_LAYER_IMPORTS = new Map([
  ['app', new Set(['features'])],
  ['features', new Set(['ui', 'store'])],
  ['ui', new Set()],
  ['store', new Set(['store', 'engine', 'platform'])],
  ['platform', new Set(['workers'])],
  ['workers', new Set(['engine'])],
  ['engine', new Set(['engine'])],
]);
const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'HTMLElement',
  'Element',
  'Document',
  'Node',
  'Worker',
  'fetch',
]);
const DOM_CONTRACT_TYPES = new Set([
  ...BROWSER_GLOBALS,
  'AbortController',
  'Blob',
  'Event',
  'EventTarget',
  'File',
  'FormData',
  'Headers',
  'Request',
  'Response',
  'Storage',
  'URL',
  'URLSearchParams',
]);
const BASELINE_PATH = 'config/architecture-baseline.json';

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

function walkSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(filePath);
    return SOURCE_EXTENSIONS.has(path.extname(filePath)) ? [filePath] : [];
  });
}

function getEngineDomain(filePath) {
  if (!filePath.startsWith('src/engine/')) return null;
  const remainder = filePath.slice('src/engine/'.length);
  const [firstSegment, ...rest] = remainder.split('/');
  return rest.length > 0 && ENGINE_DOMAINS.has(firstSegment) ? firstSegment : 'core';
}

function getTargetLayer(filePath) {
  return [...TARGET_LAYERS].find(([, directory]) => filePath.startsWith(directory))?.[0] ?? null;
}

function isDomainBarrel(filePath) {
  return /^index\.[^.]+$/.test(path.posix.basename(filePath));
}

function addViolation(violations, violation) {
  const key = architectureViolationKey(violation);
  if (!violations.has(key)) violations.set(key, violation);
}

function findImportCycles(graph) {
  let nextIndex = 0;
  const indexes = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const cycles = [];

  function visit(filePath) {
    indexes.set(filePath, nextIndex);
    lowLinks.set(filePath, nextIndex);
    nextIndex += 1;
    stack.push(filePath);
    onStack.add(filePath);

    for (const { target } of graph.get(filePath) ?? []) {
      if (!graph.has(target)) continue;
      if (!indexes.has(target)) {
        visit(target);
        lowLinks.set(filePath, Math.min(lowLinks.get(filePath), lowLinks.get(target)));
      } else if (onStack.has(target)) {
        lowLinks.set(filePath, Math.min(lowLinks.get(filePath), indexes.get(target)));
      }
    }

    if (lowLinks.get(filePath) !== indexes.get(filePath)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== filePath);

    const hasSelfCycle =
      component.length === 1 && (graph.get(filePath) ?? []).some(({ target }) => target === filePath);
    if (component.length > 1 || hasSelfCycle) cycles.push(component.sort());
  }

  for (const filePath of graph.keys()) {
    if (!indexes.has(filePath)) visit(filePath);
  }
  return cycles;
}

/** @param {Readonly<Record<string, string>>} sources */
export function analyzeArchitecture(sources) {
  const normalizedSources = Object.fromEntries(
    Object.entries(sources).map(([filePath, source]) => [normalizePath(filePath), source]),
  );
  const graph = buildImportGraph(normalizedSources);
  const violations = new Map();

  for (const [from, edges] of graph) {
    const inEngine = from.startsWith('src/engine/');
    const inPlatform = from.startsWith('src/platform/');
    const inFeatures = from.startsWith('src/features/');
    const sourceLayer = getTargetLayer(from);

    for (const { target } of edges) {
      const targetLayer = getTargetLayer(target);
      if (
        sourceLayer &&
        targetLayer &&
        sourceLayer !== targetLayer &&
        !ALLOWED_LAYER_IMPORTS.get(sourceLayer)?.has(targetLayer)
      ) {
        addViolation(violations, {
          rule: 'target-layer-boundary',
          file: from,
          target,
          detail: `${sourceLayer} -> ${targetLayer}`,
        });
      }
      if (inEngine && !target.startsWith('src/engine/')) {
        addViolation(violations, { rule: 'engine-boundary', file: from, target });
      }
      if (inFeatures && target.startsWith('src/platform/')) {
        addViolation(violations, { rule: 'feature-platform-boundary', file: from, target });
      }

      const fromDomain = getEngineDomain(from);
      const targetDomain = getEngineDomain(target);
      if (fromDomain && targetDomain && fromDomain !== targetDomain && !isDomainBarrel(target)) {
        addViolation(violations, {
          rule: 'engine-domain-barrel',
          file: from,
          target,
          detail: `${fromDomain} -> ${targetDomain}`,
        });
      }
    }

    if (!inEngine && !inPlatform) continue;
    const sourceFile = ts.createSourceFile(
      from,
      normalizedSources[from],
      ts.ScriptTarget.Latest,
      true,
      from.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    function inspectModuleSpecifier(moduleSpecifier) {
      if (!ts.isStringLiteral(moduleSpecifier)) return;
      const specifier = moduleSpecifier.text;
      if (/^react(?:-dom)?(?:\/|$)/.test(specifier)) {
        addViolation(violations, { rule: 'react-in-pure-layer', file: from, target: specifier });
      }
      if (inEngine && !specifier.startsWith('.') && !specifier.startsWith('@/')) {
        addViolation(violations, { rule: 'engine-external-import', file: from, target: specifier });
      }
    }

    for (const statement of sourceFile.statements) {
      if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier) {
        inspectModuleSpecifier(statement.moduleSpecifier);
      }
    }

    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0]) {
        inspectModuleSpecifier(node.arguments[0]);
      }
      if (inEngine && ts.isIdentifier(node) && BROWSER_GLOBALS.has(node.text)) {
        addViolation(violations, { rule: 'browser-api-in-pure-layer', file: from, target: node.text });
      }
      if (
        inPlatform &&
        (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
        node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const contractName = node.name.text;
        const inspectContractType = (typeNode) => {
          if (ts.isIdentifier(typeNode) && DOM_CONTRACT_TYPES.has(typeNode.text)) {
            addViolation(violations, {
              rule: 'dom-type-in-platform-contract',
              file: from,
              target: `${contractName}:${typeNode.text}`,
            });
          }
          ts.forEachChild(typeNode, inspectContractType);
        };
        inspectContractType(node);
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  for (const files of findImportCycles(graph)) {
    addViolation(violations, { rule: 'import-cycle', files });
  }

  return [...violations.values()].sort((left, right) =>
    architectureViolationKey(left).localeCompare(architectureViolationKey(right)),
  );
}

export function architectureViolationKey(violation) {
  if (violation.rule === 'import-cycle') return `${violation.rule}|${violation.files.join('|')}`;
  return `${violation.rule}|${violation.file}|${violation.target}|${violation.detail ?? ''}`;
}

export function compareArchitectureBaseline(violations, baseline) {
  const known = new Set(baseline.violations.map(architectureViolationKey));
  const current = new Set(violations.map(architectureViolationKey));
  return {
    introduced: violations.filter((violation) => !known.has(architectureViolationKey(violation))),
    resolved: baseline.violations.filter((violation) => !current.has(architectureViolationKey(violation))),
  };
}

function readRepositorySources(repoRoot) {
  return Object.fromEntries(
    walkSourceFiles(path.join(repoRoot, 'src')).map((filePath) => [
      normalizePath(path.relative(repoRoot, filePath)),
      fs.readFileSync(filePath, 'utf8'),
    ]),
  );
}

function main() {
  const repoRoot = process.cwd();
  const baselinePath = path.join(repoRoot, BASELINE_PATH);
  const violations = analyzeArchitecture(readRepositorySources(repoRoot));

  if (process.argv.includes('--write-baseline')) {
    fs.writeFileSync(baselinePath, `${JSON.stringify({ schemaVersion: 1, violations }, null, 2)}\n`);
    console.log(`Wrote ${violations.length} current architecture violations to ${BASELINE_PATH}.`);
    return;
  }

  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Missing ${BASELINE_PATH}; inspect current violations and run with --write-baseline once.`);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const { introduced, resolved } = compareArchitectureBaseline(violations, baseline);
  const counts = new Map();
  for (const violation of violations) {
    const entries = counts.get(violation.rule) ?? [];
    entries.push(violation);
    counts.set(violation.rule, entries);
  }
  console.log(
    `Architecture baseline: ${baseline.violations.length} existing violations; current: ${violations.length}; resolved: ${resolved.length}; introduced: ${introduced.length}.`,
  );
  for (const [rule, entries] of counts) console.log(`  ${rule}: ${entries.length}`);
  for (const violation of introduced) console.error(`NEW ${architectureViolationKey(violation)}`);
  if (introduced.length > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();

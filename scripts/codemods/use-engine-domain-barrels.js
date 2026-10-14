#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ENGINE_ROOT = 'src/engine';
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const DOMAIN_BARREL_OVERRIDES = new Map([
  ['core', `${ENGINE_ROOT}/core/contracts/index.ts`],
  ['materials', `${ENGINE_ROOT}/materials/catalog/index.ts`],
]);

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

function getDomain(filePath) {
  if (!filePath.startsWith(`${ENGINE_ROOT}/`)) return null;
  const relative = filePath.slice(`${ENGINE_ROOT}/`.length);
  return relative.split('/')[0];
}

function walkSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(filePath);
    return SOURCE_EXTENSIONS.includes(path.extname(filePath)) ? [filePath] : [];
  });
}

function resolveModulePath(importer, specifier, knownFiles) {
  const cleanSpecifier = specifier.split(/[?#]/, 1)[0];
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

function collectImportReferences(sourceText, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const references = [];
  const addReference = (literal) => {
    if (ts.isStringLiteral(literal)) {
      references.push({ start: literal.getStart(sourceFile) + 1, end: literal.end - 1, specifier: literal.text });
    }
  };
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      addReference(node.moduleSpecifier);
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      addReference(node.argument.literal);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      addReference(node.arguments[0]);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'vi' &&
      ['mock', 'doMock'].includes(node.expression.name.text) &&
      node.arguments.length > 0
    ) {
      addReference(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
}

function formatBarrelSpecifier(importer, targetDomain, originalSpecifier) {
  const queryStart = originalSpecifier.search(/[?#]/);
  const suffix = queryStart < 0 ? '' : originalSpecifier.slice(queryStart);
  const originalPath = queryStart < 0 ? originalSpecifier : originalSpecifier.slice(0, queryStart);
  if (suffix.includes('?worker')) return null;
  const targetPath = DOMAIN_BARREL_OVERRIDES.get(targetDomain) ?? `${ENGINE_ROOT}/${targetDomain}/index.ts`;
  const extension = path.posix.extname(originalPath);
  const formattedTarget = extension
    ? `${targetPath.slice(0, -path.posix.extname(targetPath).length)}${extension}`
    : targetPath.slice(0, -path.posix.extname(targetPath).length);
  if (originalPath.startsWith('@/') && formattedTarget.startsWith('src/')) {
    return `@/${formattedTarget.slice('src/'.length)}${suffix}`;
  }
  let relative = path.posix.relative(path.posix.dirname(importer), formattedTarget);
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return `${relative}${suffix}`;
}

export function rewriteCrossDomainImports(sources) {
  const normalizedSources = new Map(Object.entries(sources).map(([file, text]) => [normalizePath(file), text]));
  const knownFiles = new Set(normalizedSources.keys());
  const rewritten = new Map();
  const changes = [];

  for (const [importer, sourceText] of normalizedSources) {
    const sourceDomain = getDomain(importer);
    if (!sourceDomain || importer === `${ENGINE_ROOT}/index.ts`) continue;
    const edits = [];
    for (const reference of collectImportReferences(sourceText, importer)) {
      const target = resolveModulePath(importer, reference.specifier, knownFiles);
      const targetDomain = target ? getDomain(target) : null;
      if (
        !targetDomain ||
        targetDomain === sourceDomain ||
        (path.posix.basename(target) === 'index.ts' && targetDomain !== 'core')
      ) {
        continue;
      }
      const newSpecifier = formatBarrelSpecifier(importer, targetDomain, reference.specifier);
      if (!newSpecifier || newSpecifier === reference.specifier) continue;
      edits.push({ ...reference, newSpecifier, target });
      changes.push({ importer, from: reference.specifier, to: newSpecifier, target });
    }
    let updated = sourceText;
    for (const edit of edits.toReversed()) {
      updated = `${updated.slice(0, edit.start)}${edit.newSpecifier}${updated.slice(edit.end)}`;
    }
    if (updated !== sourceText) rewritten.set(importer, updated);
  }
  return { rewritten, changes };
}

function writeAtomically(filePath, content) {
  const tempPath = `${filePath}.barrel-${process.pid}`;
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, filePath);
}

function applyRewrites(rewritten) {
  const originals = new Map([...rewritten.keys()].map((file) => [file, fs.readFileSync(file, 'utf8')]));
  const written = [];
  try {
    for (const [file, content] of rewritten) {
      writeAtomically(file, content);
      written.push(file);
    }
  } catch (error) {
    for (const file of written.reverse()) writeAtomically(file, originals.get(file));
    throw error;
  }
}

function main() {
  const files = walkSourceFiles(path.resolve(ENGINE_ROOT));
  const sources = Object.fromEntries(
    files.map((file) => [normalizePath(path.relative(process.cwd(), file)), fs.readFileSync(file, 'utf8')]),
  );
  const { rewritten, changes } = rewriteCrossDomainImports(sources);
  console.log(`Planned ${changes.length} cross-domain barrel rewrites across ${rewritten.size} engine files.`);
  for (const change of changes) console.log(`  ${change.importer}: ${change.from} -> ${change.to}`);
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Pass --apply to update cross-domain imports.');
    return;
  }
  applyRewrites(rewritten);
  console.log('Cross-domain imports rewritten to domain barrels.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();

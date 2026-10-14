#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const ENGINE_ROOT = 'src/engine';
const ROOT_BARREL = `${ENGINE_ROOT}/index.ts`;
const DOMAIN_NAMES = [
  'assembly',
  'calculators',
  'core',
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
];

function parseSource(fileName, text) {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function exportBindings(sourceFile) {
  const bindings = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause) continue;
    if (!ts.isNamedExports(statement.exportClause)) continue;
    for (const element of statement.exportClause.elements) {
      bindings.push({
        name: element.name.text,
        typeOnly: statement.isTypeOnly || element.isTypeOnly,
      });
    }
  }
  return bindings;
}

function bindingKey({ name, typeOnly }) {
  return `${typeOnly ? 'type' : 'value'}|${name}`;
}

function moduleSpecifierForDomain(specifier, domain) {
  const modulePath = specifier.slice(2);
  const targetPath = path.posix.join(ENGINE_ROOT, modulePath);
  let relativePath = path.posix.relative(path.posix.join(ENGINE_ROOT, domain), targetPath);
  if (!relativePath.startsWith('.')) relativePath = `./${relativePath}`;
  return relativePath;
}

function rewriteStatementSpecifier(statement, sourceFile, newSpecifier) {
  const originalSpecifier = statement.moduleSpecifier;
  const start = originalSpecifier.getStart(sourceFile) + 1;
  const end = originalSpecifier.end - 1;
  return `${sourceFile.text.slice(statement.getStart(sourceFile), start)}${newSpecifier}${sourceFile.text.slice(end, statement.end)}`;
}

function createPartialExport(statement, sourceFile, elements, newSpecifier) {
  const isTypeOnly = statement.isTypeOnly;
  const specifierText = statement.moduleSpecifier.getText(sourceFile);
  const quote = specifierText[0];
  const bindings = elements.map((element) => element.getText(sourceFile)).join(', ');
  return `export${isTypeOnly ? ' type' : ''} { ${bindings} } from ${quote}${newSpecifier}${quote};`;
}

function collectBarrelExportKeys(text, fileName) {
  if (!text) return new Set();
  return new Set(exportBindings(parseSource(fileName, text)).map(bindingKey));
}

export function buildCuratedBarrelPlan(rootText, existingBarrels = {}) {
  const rootSource = parseSource(ROOT_BARREL, rootText);
  const declarationsByDomain = new Map(DOMAIN_NAMES.map((domain) => [domain, []]));
  const externalDeclarations = [];
  const rootOwner = new Map();

  for (const statement of rootSource.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
    if (
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      throw new Error(
        `Unsupported root barrel export syntax at line ${rootSource.getLineAndCharacterOfPosition(statement.getStart(rootSource)).line + 1}.`,
      );
    }
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith('./')) {
      externalDeclarations.push(rootText.slice(statement.getFullStart(), statement.end).trim());
      continue;
    }
    const domain = specifier.slice(2).split('/')[0];
    const declarations = declarationsByDomain.get(domain);
    if (!declarations) throw new Error(`Unknown root export domain '${domain}' in ${specifier}.`);
    for (const binding of exportBindings(parseSource(ROOT_BARREL, statement.getText(rootSource)))) {
      const key = bindingKey(binding);
      const currentOwner = rootOwner.get(key);
      if (currentOwner && currentOwner !== domain) {
        throw new Error(`Root API name '${binding.name}' has multiple source domains: ${currentOwner}, ${domain}.`);
      }
      rootOwner.set(key, domain);
    }
    declarations.push({ statement, specifier, newSpecifier: moduleSpecifierForDomain(specifier, domain) });
  }

  const barrelTexts = new Map();
  for (const domain of DOMAIN_NAMES) {
    const fileName = `${ENGINE_ROOT}/${domain}/index.ts`;
    const existingText = existingBarrels[domain] ?? '';
    const knownBindings = collectBarrelExportKeys(existingText, fileName);
    const additions = [];
    for (const { statement, newSpecifier } of declarationsByDomain.get(domain)) {
      const elements = statement.exportClause.elements;
      const missing = elements.filter((element) => {
        const key = bindingKey({ name: element.name.text, typeOnly: statement.isTypeOnly || element.isTypeOnly });
        if (knownBindings.has(key)) return false;
        knownBindings.add(key);
        return true;
      });
      if (missing.length === 0) continue;
      additions.push(
        missing.length === elements.length
          ? rewriteStatementSpecifier(statement, rootSource, newSpecifier)
          : createPartialExport(statement, rootSource, missing, newSpecifier),
      );
    }
    const header = existingText.trimEnd();
    const prefix = header || `/** Curated public exports for the ${domain} engine domain. */`;
    barrelTexts.set(fileName, `${prefix}\n\n${additions.join('\n\n')}\n`);
  }

  const bindingDomains = new Map();
  for (const [fileName, text] of barrelTexts) {
    const domain = path.posix.basename(path.posix.dirname(fileName));
    for (const binding of exportBindings(parseSource(fileName, text))) {
      const key = bindingKey(binding);
      const domains = bindingDomains.get(key) ?? new Set();
      domains.add(domain);
      bindingDomains.set(key, domains);
    }
  }

  const explicitResolutions = [];
  for (const [key, domains] of bindingDomains) {
    if (domains.size < 2) continue;
    const domain = rootOwner.get(key);
    if (!domain) throw new Error(`Conflicting domain barrels expose '${key}' without a root API owner.`);
    const [namespace, name] = key.split('|');
    explicitResolutions.push(`export${namespace === 'type' ? ' type' : ''} { ${name} } from './${domain}/index';`);
  }

  const rootHeader = `/**\n * @packageDocumentation\n * Stable public engine API, composed from the curated domain barrels.\n */`;
  const domainExports = DOMAIN_NAMES.map((domain) => `export * from './${domain}/index';`);
  const rootTextOutput =
    [rootHeader, ...domainExports, ...externalDeclarations, ...explicitResolutions].join('\n\n') + '\n';
  return { barrelTexts, rootText: rootTextOutput, explicitResolutions };
}

function writeAtomically(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.barrel-${process.pid}`;
  fs.writeFileSync(temporaryPath, text);
  fs.renameSync(temporaryPath, filePath);
}

function applyBarrelPlan(barrelTexts, rootText) {
  const output = new Map([...barrelTexts, [ROOT_BARREL, rootText]]);
  const originals = new Map(
    [...output.keys()].map((filePath) => [
      filePath,
      fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null,
    ]),
  );
  const written = [];
  try {
    for (const [filePath, text] of output) {
      writeAtomically(filePath, text);
      written.push(filePath);
    }
  } catch (error) {
    for (const filePath of written.reverse()) {
      const original = originals.get(filePath);
      if (original === null) fs.rmSync(filePath, { force: true });
      else writeAtomically(filePath, original);
    }
    throw error;
  }
}

function main() {
  const rootText = fs.readFileSync(ROOT_BARREL, 'utf8');
  const existingBarrels = Object.fromEntries(
    DOMAIN_NAMES.filter((domain) => fs.existsSync(`${ENGINE_ROOT}/${domain}/index.ts`)).map((domain) => [
      domain,
      fs.readFileSync(`${ENGINE_ROOT}/${domain}/index.ts`, 'utf8'),
    ]),
  );
  const plan = buildCuratedBarrelPlan(rootText, existingBarrels);
  const additions = [...plan.barrelTexts].map(([file, text]) => ({ file, lines: text.split(/\r?\n/).length - 1 }));
  console.log(
    `Prepared ${plan.barrelTexts.size} curated domain barrels; root barrel will contain ${plan.rootText.split(/\r?\n/).length - 1} lines.`,
  );
  console.log(`Explicit root conflict resolutions: ${plan.explicitResolutions.length}.`);
  for (const { file, lines } of additions) console.log(`  ${file}: ${lines} lines`);
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Pass --apply to write the curated barrels and root re-export surface.');
    return;
  }
  applyBarrelPlan(plan.barrelTexts, plan.rootText);
  console.log('Curated domain barrels and root re-export surface written.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();

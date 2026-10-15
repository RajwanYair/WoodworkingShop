#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const ENGINE_ROOT = 'src/engine';
const SOURCE_ROOTS = ['src', 'tests'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const ROOT_BARREL = 'index';
const LEGACY_DIRECTORY_TARGETS = new Map([
  ['comparison', 'project/comparison'],
  ['inventory', 'workshop/inventory'],
  ['stock', 'workshop/stock'],
  ['templates', 'project/templates'],
  ['validation', 'core/validation'],
  ['waste', 'optimizer/waste'],
]);

export const DOMAIN_MODULES = {
  assembly: ['assembly', 'assembly-dag', 'assembly-dependency', 'assembly-timer', 'cut-checklist', 'time-estimator'],
  calculators: [
    'bandsaw-speed',
    'cove-cut',
    'crown-moulding',
    'drill-speed',
    'face-frame',
    'feed-rate',
    'finish-calculator',
    'finishing-coat',
    'frame-panel',
    'glue-coverage',
    'glue-up-time',
    'honing-guide',
    'iso7171',
    'kerf-bending',
    'kerf',
    'measurement-assistant',
    'miter-angle',
    'moisture-shrinkage',
    'pilot-hole',
    'planer-passes',
    'rafter-length',
    'screw-pullout',
    'pocket-hole',
    'router-circle',
    'router-depth',
    'shelf-deflection',
    'shelf-pin',
    'stair-stringer',
    'tablesaw-blade',
    'taper-jig',
    'wood-drying',
    'wood-turning',
  ],
  core: [
    'a11y-audit',
    'constraint-solver',
    'i18n-audit',
    'invariant',
    'memo',
    'parameter-expressions',
    'plugin',
    'plugin-events',
    'plugin-v2',
    'types',
    'validation',
    'zone-validator',
  ],
  costing: [
    'board-feet',
    'cabinet-weight',
    'cost-estimator',
    'cost-summary-export',
    'cost-variance',
    'material-cost-tracker',
    'material-usage-report',
  ],
  export: [
    'batch-export',
    'bom-filter',
    'erp-export',
    'export-format',
    'export-schema',
    'gcode-toolpath',
    'gcode-validator',
    'gltf-ifc-model',
  ],
  geometry: ['cabinet-door', 'dimensions', 'drawer-box', 'mirror-cabinet', 'parts', 'shelf-spacing'],
  hardware: [
    'drawer-runner',
    'drawer-slide',
    'edge-profile',
    'hardware',
    'hardware-catalog',
    'hardware-spec',
    'hinge-bore',
    'substitution',
  ],
  joinery: [
    'box-joint',
    'dado-rabbet',
    'dovetail-layout',
    'dowel-joint',
    'finger-joint',
    'half-lap',
    'joint-detail',
    'mortise-tenon',
    'router-template',
    'spline-joint',
  ],
  materials: [
    'community-catalog',
    'manufacturer-catalog',
    'material-textures',
    'material-yield',
    'materials',
    'pbr-materials',
  ],
  optimizer: [
    'bundle-strategy',
    'cut-list-grouping',
    'cut-optimizer',
    'cut-plan-summary',
    'grain-conflict',
    'grain-constraint',
    'grain-report',
    'layout-optimizer',
    'layout-suggestions',
    'multi-stock-optimizer',
    'nesting-patterns',
    'part-sort',
    'smart-optimizer',
  ],
  project: [
    'ai-assistant',
    'analytics',
    'audit-trail',
    'batch-replace',
    'cabinet-notes',
    'cloud-sync',
    'crdt-sync',
    'dark-mode-tokens',
    'lazy-features',
    'mobile-sync',
    'project-library',
    'plugin-marketplace',
    'project-settings',
    'project-sharing',
    'project-sync',
    'snapshot-tags',
    'version-history',
    'workspace',
  ],
  room: ['room-planner', 'webgl-probe', 'webgpu-renderer', 'webxr-placement'],
  workshop: [
    'cnc-job-queue',
    'dust-collection',
    'machine-profiles',
    'machining-job',
    'maintenance-scheduler',
    'multi-machine',
    'panel-label',
    'part-labeling',
    'tool-wear',
    'webserial',
    'webserial-v2',
  ],
};

const DOMAIN_BY_MODULE = new Map();
for (const [domain, modules] of Object.entries(DOMAIN_MODULES)) {
  for (const moduleName of modules) {
    if (DOMAIN_BY_MODULE.has(moduleName)) throw new Error(`Duplicate domain assignment: ${moduleName}`);
    DOMAIN_BY_MODULE.set(moduleName, domain);
  }
}

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

function walkSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(filePath);
    return SOURCE_EXTENSIONS.includes(path.extname(filePath)) ? [filePath] : [];
  });
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(filePath) : [filePath];
  });
}

function isRootEngineModule(filePath) {
  return filePath.startsWith(`${ENGINE_ROOT}/`) && !filePath.slice(`${ENGINE_ROOT}/`.length).includes('/');
}

export function buildEngineMovePlan(sourcePaths) {
  const normalizedPaths = sourcePaths.map(normalizePath);
  const knownPaths = new Set(normalizedPaths);
  const rootModules = normalizedPaths
    .filter(isRootEngineModule)
    .filter((filePath) => SOURCE_EXTENSIONS.includes(path.posix.extname(filePath)))
    .filter((filePath) => path.posix.basename(filePath, path.posix.extname(filePath)) !== ROOT_BARREL)
    .sort();
  const legacyDirectories = normalizedPaths
    .filter((filePath) => filePath.startsWith(`${ENGINE_ROOT}/`) && filePath.includes('/'))
    .flatMap((from) => {
      const remainder = from.slice(`${ENGINE_ROOT}/`.length);
      const [directory, ...rest] = remainder.split('/');
      const targetDirectory = LEGACY_DIRECTORY_TARGETS.get(directory);
      return targetDirectory
        ? [{ from, to: `${ENGINE_ROOT}/${targetDirectory}/${rest.join('/')}`, domain: targetDirectory.split('/')[0] }]
        : [];
    })
    .sort((left, right) => left.from.localeCompare(right.from));
  const modulesByName = new Map(
    rootModules.map((filePath) => [path.posix.basename(filePath, path.posix.extname(filePath)), filePath]),
  );
  const missingRoutes = [...modulesByName.keys()].filter((moduleName) => !DOMAIN_BY_MODULE.has(moduleName));
  const staleRoutes = [...DOMAIN_BY_MODULE.keys()].filter((moduleName) => {
    if (modulesByName.has(moduleName)) return false;
    const domain = DOMAIN_BY_MODULE.get(moduleName);
    return !knownPaths.has(`${ENGINE_ROOT}/${domain}/${moduleName}.ts`);
  });
  if (missingRoutes.length || staleRoutes.length) {
    throw new Error(
      [
        missingRoutes.length ? `Missing domain routes: ${missingRoutes.join(', ')}` : '',
        staleRoutes.length ? `Stale domain routes: ${staleRoutes.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const rootMoves = rootModules.map((from) => {
    const moduleName = path.posix.basename(from, path.posix.extname(from));
    const domain = DOMAIN_BY_MODULE.get(moduleName);
    return {
      from,
      to: `${ENGINE_ROOT}/${domain}/${path.posix.basename(from)}`,
      domain,
    };
  });
  return [...rootMoves, ...legacyDirectories];
}

function resolveImportTarget(importer, specifier, knownFiles) {
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

export function buildEngineTestMovePlan(testPaths, sources, knownPaths = Object.keys(sources)) {
  const knownFiles = new Set(knownPaths.map(normalizePath));
  return testPaths
    .map(normalizePath)
    .filter((testPath) => path.posix.dirname(testPath) === 'tests/engine')
    .flatMap((from) => {
      const sourceText = sources[from];
      if (!sourceText) return [];
      const domains = new Set();
      for (const { specifier } of collectImportReferences(sourceText, from)) {
        const target = resolveImportTarget(from, specifier, knownFiles);
        if (!target?.startsWith(`${ENGINE_ROOT}/`)) continue;
        const domain = target.slice(`${ENGINE_ROOT}/`.length).split('/')[0];
        if (Object.prototype.hasOwnProperty.call(DOMAIN_MODULES, domain)) domains.add(domain);
      }
      if (domains.size !== 1) return [];
      const [domain] = domains;
      return [{ from, to: `tests/engine/${domain}/${path.posix.basename(from)}`, domain }];
    })
    .sort((left, right) => left.from.localeCompare(right.from));
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

function sourceExtension(filePath) {
  const extension = path.posix.extname(filePath);
  return SOURCE_EXTENSIONS.includes(extension) ? extension : '';
}

function formatImportSpecifier(importer, target, originalSpecifier) {
  const queryStart = originalSpecifier.search(/[?#]/);
  const suffix = queryStart < 0 ? '' : originalSpecifier.slice(queryStart);
  const originalPath = queryStart < 0 ? originalSpecifier : originalSpecifier.slice(0, queryStart);
  const originalExtension = sourceExtension(originalPath);
  const targetExtension = sourceExtension(target);
  // Subtract from length. slice(0, -0) is slice(0, 0) and would drop a JSON path with no source extension.
  const extensionlessTarget = target.slice(0, target.length - targetExtension.length);
  const targetPath = originalExtension ? `${extensionlessTarget}${originalExtension}` : extensionlessTarget;
  if (originalPath.startsWith('@/') && target.startsWith('src/')) {
    return `@/${targetPath.slice('src/'.length)}${suffix}`;
  }
  let relativePath = path.posix.relative(path.posix.dirname(importer), targetPath);
  if (!relativePath.startsWith('.')) relativePath = `./${relativePath}`;
  return `${relativePath}${suffix}`;
}

export function rewriteImports(sources, movePlan, knownPaths = Object.keys(sources)) {
  const moveMap = new Map(movePlan.map(({ from, to }) => [from, to]));
  const knownFiles = new Set(knownPaths.map(normalizePath));
  const rewritten = new Map();
  let importCount = 0;
  const rewriteMovedImporter = (importer, sourceText) => {
    const movedImporter = moveMap.get(importer) ?? importer;
    const edits = [];
    for (const reference of collectImportReferences(sourceText, importer)) {
      const target = resolveImportTarget(importer, reference.specifier, knownFiles);
      if (!target || (!moveMap.has(importer) && !moveMap.has(target))) continue;
      const movedTarget = moveMap.get(target) ?? target;
      const newSpecifier = formatImportSpecifier(movedImporter, movedTarget, reference.specifier);
      if (newSpecifier !== reference.specifier) edits.push({ ...reference, newSpecifier });
    }
    return edits;
  };

  for (const [rawImporter, sourceText] of Object.entries(sources)) {
    const importer = normalizePath(rawImporter);
    const edits = rewriteMovedImporter(importer, sourceText);
    importCount += edits.length;
    let updatedText = sourceText;
    for (const edit of edits.toReversed()) {
      updatedText = `${updatedText.slice(0, edit.start)}${edit.newSpecifier}${updatedText.slice(edit.end)}`;
    }
    if (updatedText !== sourceText) rewritten.set(importer, updatedText);
  }

  return { rewritten, importCount };
}

function captureOriginalContents(repoRoot, movePlan, rewritten) {
  const originalContents = new Map();
  for (const { from } of movePlan) {
    originalContents.set(from, fs.readFileSync(path.join(repoRoot, from), 'utf8'));
  }
  for (const filePath of rewritten.keys()) {
    if (originalContents.has(filePath)) continue;
    originalContents.set(filePath, fs.readFileSync(path.join(repoRoot, filePath), 'utf8'));
  }
  return originalContents;
}

function assertNoTargetCollisions(repoRoot, movePlan) {
  for (const { to } of movePlan) {
    if (fs.existsSync(path.join(repoRoot, to))) throw new Error(`Refusing to overwrite existing file: ${to}`);
  }
}

function writeAtomically(repoRoot, filePath, content) {
  const absolutePath = path.join(repoRoot, filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.move-${process.pid}`;
  fs.writeFileSync(temporaryPath, content);
  fs.renameSync(temporaryPath, absolutePath);
}

function rollbackMovePlan(repoRoot, rewrittenFiles, removedSources, createdTargets, originalContents) {
  for (const filePath of rewrittenFiles) writeAtomically(repoRoot, filePath, originalContents.get(filePath));
  for (const filePath of removedSources) writeAtomically(repoRoot, filePath, originalContents.get(filePath));
  for (const filePath of createdTargets) fs.rmSync(path.join(repoRoot, filePath), { force: true });
}

export function applyMovePlan(repoRoot, movePlan, rewritten) {
  const createdTargets = [];
  const rewrittenFiles = [];
  const removedSources = [];
  const movedSources = new Set(movePlan.map(({ from }) => from));
  const originalContents = captureOriginalContents(repoRoot, movePlan, rewritten);
  assertNoTargetCollisions(repoRoot, movePlan);
  try {
    for (const { from, to } of movePlan) {
      const content = rewritten.get(from) ?? originalContents.get(from);
      writeAtomically(repoRoot, to, content);
      createdTargets.push(to);
    }
    for (const [filePath, content] of rewritten) {
      if (movedSources.has(filePath)) continue;
      writeAtomically(repoRoot, filePath, content);
      rewrittenFiles.push(filePath);
    }
    for (const { from } of movePlan) {
      removedSources.push(from);
      fs.rmSync(path.join(repoRoot, from));
    }
  } catch (error) {
    rollbackMovePlan(repoRoot, rewrittenFiles, removedSources, createdTargets, originalContents);
    throw error;
  }
}

function main() {
  const repoRoot = process.cwd();
  const repositoryFiles = SOURCE_ROOTS.flatMap((root) => walkFiles(path.join(repoRoot, root)));
  const knownPaths = repositoryFiles.map((filePath) => normalizePath(path.relative(repoRoot, filePath)));
  const sourceFiles = repositoryFiles
    .filter((filePath) => SOURCE_EXTENSIONS.includes(path.extname(filePath)))
    .map((filePath) => normalizePath(path.relative(repoRoot, filePath)));
  const engineFiles = walkFiles(path.join(repoRoot, ENGINE_ROOT)).map((filePath) =>
    normalizePath(path.relative(repoRoot, filePath)),
  );
  const movePlan = buildEngineMovePlan(engineFiles);
  const sources = Object.fromEntries(
    sourceFiles.map((filePath) => [filePath, fs.readFileSync(path.join(repoRoot, filePath), 'utf8')]),
  );
  const engineTestFiles = sourceFiles.filter((filePath) => /^tests\/engine\/[^/]+\.test\.[jt]sx?$/.test(filePath));
  const testMovePlan = buildEngineTestMovePlan(engineTestFiles, sources, knownPaths);
  const allMoves = [...movePlan, ...testMovePlan];
  const existingFiles = new Set(knownPaths);
  for (const { from, to } of allMoves) {
    if (from === to) continue;
    if (existingFiles.has(to)) throw new Error(`Refusing to overwrite existing file: ${to}`);
  }
  const { rewritten, importCount } = rewriteImports(sources, allMoves, knownPaths);
  const countByDomain = new Map();
  for (const move of movePlan) countByDomain.set(move.domain, (countByDomain.get(move.domain) ?? 0) + 1);
  console.log(
    `Planned ${movePlan.length} engine module moves, ${testMovePlan.length} engine test moves and ${importCount} import rewrites across ${rewritten.size} files.`,
  );
  for (const [domain, count] of [...countByDomain].sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${domain}: ${count}`);
  }
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Pass --apply to move files and rewrite imports.');
    return;
  }
  applyMovePlan(repoRoot, allMoves, rewritten);
  console.log('Engine modules and single-domain tests moved; affected import references rewritten.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();

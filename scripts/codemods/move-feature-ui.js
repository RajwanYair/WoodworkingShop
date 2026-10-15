#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMovePlan, rewriteImports } from './move-engine-domains.js';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const SOURCE_ROOTS = ['src', 'tests'];
const COMPONENT_ROOT = 'src/components';
const FEATURE_FOLDERS = new Set(['preview', 'optimizer', 'assembly', 'pdf']);
const SHELL_FILES = new Set([
  'ActiveCabinetSwitcher.tsx',
  'command-registry.ts',
  'CommandPalette.tsx',
  'DiagnosticsModal.tsx',
  'ErrorBoundary.tsx',
  'header-preload.ts',
  'Header.tsx',
  'HeaderMobileControls.tsx',
  'MobileTabBar.tsx',
  'OnboardingOverlay.tsx',
  'ShortcutsModal.tsx',
  'SkeletonPane.tsx',
  'SwUpdateBanner.tsx',
  'tab-icons.ts',
  'ToastContainer.tsx',
  'TouchGestureTutorial.tsx',
  'transition-tab.ts',
]);
const ICON_FILES = new Set(['Icons.tsx', 'icon-base.tsx', 'icons-extended.tsx']);
const WORKSPACE_FILES = new Set([
  'MarketplacePanel.tsx',
  'PluginRegistryPanel.tsx',
  'ProjectManagerModal.tsx',
  'RoomLayoutView.tsx',
  'Sidebar.tsx',
  'SidebarDetailPanels.tsx',
  'StorageQuotaBadge.tsx',
  'SnapshotDiffModal.tsx',
  'SnapshotPanel.tsx',
]);

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(filePath) : [filePath];
  });
}

export function calculatorBasenames(repoRoot) {
  const panelPath = path.join(repoRoot, COMPONENT_ROOT, 'configurator', 'CalculatorsPanel.tsx');
  const panel = fs.readFileSync(panelPath, 'utf8');
  const names = new Set(['calculator-catalog.ts', 'calculator-commands.ts', 'CalculatorsPanel.tsx']);
  for (const match of panel.matchAll(/import\('\.\/([^']+)'\)/g)) {
    const stem = match[1];
    const tsx = `${stem}.tsx`;
    const ts = `${stem}.ts`;
    if (fs.existsSync(path.join(repoRoot, COMPONENT_ROOT, 'configurator', tsx))) names.add(tsx);
    else if (fs.existsSync(path.join(repoRoot, COMPONENT_ROOT, 'configurator', ts))) names.add(ts);
    else throw new Error(`Calculator import has no source file: ${stem}`);
  }
  return names;
}

export function destinationForComponent(relativePath, calculatorFiles) {
  if (!relativePath.startsWith(`${COMPONENT_ROOT}/`)) return null;
  const rest = relativePath.slice(`${COMPONENT_ROOT}/`.length);
  const [folder, ...parts] = rest.split('/');
  const base = parts.at(-1);
  if (!base) throw new Error(`Unclassified component path: ${relativePath}`);
  if (folder === 'layout') {
    if (parts.length !== 1) throw new Error(`Nested layout file is not classified: ${relativePath}`);
    if (ICON_FILES.has(base)) return `src/ui/${base}`;
    if (SHELL_FILES.has(base)) return `src/app/${base}`;
    if (WORKSPACE_FILES.has(base)) return `src/features/workspace/${base}`;
    throw new Error(`Unclassified layout file: ${relativePath}`);
  }
  if (folder === 'configurator' && parts.length === 1 && calculatorFiles.has(base)) {
    return `src/features/calculators/${base}`;
  }
  if (folder === 'configurator') return `src/features/configurator/${parts.join('/')}`;
  if (FEATURE_FOLDERS.has(folder)) return `src/features/${rest}`;
  throw new Error(`Unclassified component file: ${relativePath}`);
}

export function buildFeatureMovePlan(componentPaths, calculatorFiles) {
  return componentPaths
    .map(normalizePath)
    .filter((filePath) => filePath.startsWith(`${COMPONENT_ROOT}/`))
    .map((from) => ({ from, to: destinationForComponent(from, calculatorFiles) }))
    .sort((left, right) => left.from.localeCompare(right.from));
}

function removeEmptyDirectories(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(path.join(directory, entry.name));
  }
  if (fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
}

function applyFeatureMovePlan(repoRoot, movePlan, rewritten) {
  applyMovePlan(repoRoot, movePlan, rewritten);
  removeEmptyDirectories(path.join(repoRoot, COMPONENT_ROOT));
}

function main() {
  const repoRoot = process.cwd();
  const calculatorFiles = calculatorBasenames(repoRoot);
  const repositoryFiles = SOURCE_ROOTS.flatMap((root) => walkFiles(path.join(repoRoot, root)));
  const knownPaths = repositoryFiles.map((filePath) => normalizePath(path.relative(repoRoot, filePath)));
  const sourceFiles = repositoryFiles
    .filter((filePath) => SOURCE_EXTENSIONS.includes(path.extname(filePath)))
    .map((filePath) => normalizePath(path.relative(repoRoot, filePath)));
  const movePlan = buildFeatureMovePlan(knownPaths, calculatorFiles);
  const sources = Object.fromEntries(
    sourceFiles.map((filePath) => [filePath, fs.readFileSync(path.join(repoRoot, filePath), 'utf8')]),
  );
  const { rewritten, importCount } = rewriteImports(sources, movePlan, knownPaths);
  const counts = new Map();
  for (const { to } of movePlan) {
    const folder = to.split('/')[1];
    counts.set(folder, (counts.get(folder) ?? 0) + 1);
  }
  console.log(`Planned ${movePlan.length} UI moves and ${importCount} import rewrites across ${rewritten.size} files.`);
  for (const [folder, count] of [...counts].sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${folder}: ${count}`);
  }
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Pass --apply to move files and rewrite imports.');
    return;
  }
  applyFeatureMovePlan(repoRoot, movePlan, rewritten);
  console.log('Feature UI moved and import references rewritten.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();

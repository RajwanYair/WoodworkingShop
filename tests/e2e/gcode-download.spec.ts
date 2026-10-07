import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures/app';
import type { Download, Page } from '@playwright/test';

type DxfPair = { code: number; value: string };
type DxfEntity = { type: string; groups: Map<number, string[]> };

test.setTimeout(60_000);

async function showFirstSheet(page: Page) {
  await page.keyboard.press('Alt+3');
  const wrapper = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(wrapper).toBeVisible({ timeout: 30_000 });
  await wrapper.scrollIntoViewIfNeeded();
}

async function readDownload(download: Download) {
  const path = await download.path();
  if (!path) throw new Error('Browser download did not produce a file');
  const bytes = await readFile(path);
  return { bytes, content: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
}

async function downloadDxf(page: Page) {
  await showFirstSheet(page);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('button[title="Download DXF for sheet 1"]').click();
  const download = await downloadPromise;
  return { filename: download.suggestedFilename(), ...(await readDownload(download)) };
}

async function downloadGcode(page: Page, configure?: (dialog: ReturnType<Page['getByRole']>) => Promise<void>) {
  await showFirstSheet(page);
  await page.getByRole('button', { name: 'Preview G-code for sheet 1' }).click();
  const dialog = page.getByRole('dialog', { name: 'G-code Toolpath Preview' });
  await expect(dialog).toBeVisible();
  if (configure) await configure(dialog);
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download' }).click();
  const download = await downloadPromise;
  return { filename: download.suggestedFilename(), ...(await readDownload(download)) };
}

function parseDxfPairs(content: string): DxfPair[] {
  const lines = content.split(/\r?\n/);
  const pairs: DxfPair[] = [];
  for (let index = 0; index + 1 < lines.length; index += 2) {
    const code = Number(lines[index]);
    if (!Number.isInteger(code)) throw new Error(`Invalid DXF group code: ${lines[index]}`);
    pairs.push({ code, value: lines[index + 1] ?? '' });
  }
  return pairs;
}

function parseDxfEntities(pairs: DxfPair[]): DxfEntity[] {
  const entityMarker = pairs.findIndex(
    (pair, index) => pair.code === 2 && pair.value === 'ENTITIES' && pairs[index - 1]?.value === 'SECTION',
  );
  const sectionEnd = pairs.findIndex(
    (pair, index) => index > entityMarker && pair.code === 0 && pair.value === 'ENDSEC',
  );
  if (entityMarker < 0 || sectionEnd < 0) throw new Error('DXF ENTITIES section is missing or incomplete');

  const entities: DxfEntity[] = [];
  let current: DxfEntity | undefined;
  for (const pair of pairs.slice(entityMarker + 1, sectionEnd)) {
    if (pair.code === 0) {
      if (current) entities.push(current);
      current = { type: pair.value, groups: new Map() };
    } else if (current) {
      const values = current.groups.get(pair.code) ?? [];
      values.push(pair.value);
      current.groups.set(pair.code, values);
    }
  }
  if (current) entities.push(current);
  return entities;
}

function groupValues(entity: DxfEntity, code: number): string[] {
  return entity.groups.get(code) ?? [];
}

function checksumIsValid(content: string): boolean {
  const checksum = content.match(/\n999\n; SHA-256: ([a-f\d]{64})\n0\nEOF$/);
  if (!checksum) return false;
  const body = content.replace(/\n999\n; SHA-256: [a-f\d]{64}\n0\nEOF$/, '\n0\nEOF');
  return createHash('sha256').update(body, 'utf8').digest('hex') === checksum[1];
}

function parseGcodeCoordinates(content: string): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  for (const line of content.split(/\r?\n/).filter((entry) => /^G[01]\b/.test(entry))) {
    for (const [, axis, value] of line.matchAll(/\b([XY])(-?\d+(?:\.\d+)?)/g)) {
      (axis === 'X' ? x : y).push(Number(value));
    }
  }
  return { x, y };
}

function gcodeSheetSize(content: string): { width: number; length: number } {
  const size = content.match(/^; Sheet size: (\d+(?:\.\d+)?) x (\d+(?:\.\d+)?) mm$/m);
  if (!size) throw new Error('G-code sheet dimensions are missing');
  return { width: Number(size[1]), length: Number(size[2]) };
}

test('DXF download uses the expected filename and schema metadata', async ({ appPage: page }) => {
  const artifact = await downloadDxf(page);
  expect(artifact.filename).toBe('cabinet-sheet-1.dxf');
  expect(artifact.content).toContain('WoodworkingShop DXF Export');
  expect(artifact.content).toContain('Schema: dxf-ac1015-v2');
});

test('DXF download has complete AC1015 sections and EOF marker', async ({ appPage: page }) => {
  const { content } = await downloadDxf(page);
  const pairs = parseDxfPairs(content);
  const sectionCount = pairs.filter((pair) => pair.code === 0 && pair.value === 'SECTION').length;
  const endSectionCount = pairs.filter((pair) => pair.code === 0 && pair.value === 'ENDSEC').length;
  expect(content).toContain('AC1015');
  expect(content.trimEnd()).toMatch(/0\nEOF$/);
  expect(sectionCount).toBe(endSectionCount);
});

test('DXF header declares millimetre metric units', async ({ appPage: page }) => {
  const pairs = parseDxfPairs((await downloadDxf(page)).content);
  const unitsIndex = pairs.findIndex((pair) => pair.code === 9 && pair.value === '$INSUNITS');
  const measureIndex = pairs.findIndex((pair) => pair.code === 9 && pair.value === '$MEASUREMENT');
  expect(pairs[unitsIndex + 1]).toEqual({ code: 70, value: '4' });
  expect(pairs[measureIndex + 1]).toEqual({ code: 70, value: '1' });
});

test('DXF sheet outline matches dimensions in the G-code artifact', async ({ appPage: page }) => {
  const entities = parseDxfEntities(parseDxfPairs((await downloadDxf(page)).content));
  const sheet = entities.find((entity) => entity.type === 'LWPOLYLINE' && groupValues(entity, 8)[0] === 'SHEET');
  expect(sheet).toBeDefined();
  expect(groupValues(sheet!, 90)).toEqual(['4']);
  expect(groupValues(sheet!, 70)).toEqual(['1']);
  expect(groupValues(sheet!, 10)).toHaveLength(4);
  expect(groupValues(sheet!, 20)).toHaveLength(4);
  const gcodeSize = gcodeSheetSize((await downloadGcode(page)).content);
  expect(Math.max(...groupValues(sheet!, 10).map(Number))).toBe(gcodeSize.width);
  expect(Math.max(...groupValues(sheet!, 20).map(Number))).toBe(gcodeSize.length);
});

test('DXF part polylines remain within the parsed sheet extents', async ({ appPage: page }) => {
  const entities = parseDxfEntities(parseDxfPairs((await downloadDxf(page)).content));
  const sheet = entities.find((entity) => entity.type === 'LWPOLYLINE' && groupValues(entity, 8)[0] === 'SHEET');
  const sheetX = groupValues(sheet!, 10).map(Number);
  const sheetY = groupValues(sheet!, 20).map(Number);
  const maxX = Math.max(...sheetX);
  const maxY = Math.max(...sheetY);
  const parts = entities.filter((entity) => entity.type === 'LWPOLYLINE' && groupValues(entity, 8)[0] !== 'SHEET');
  expect(parts.length).toBeGreaterThan(0);
  for (const part of parts) {
    expect(
      groupValues(part, 10)
        .map(Number)
        .every((value) => value >= 0 && value <= maxX),
    ).toBe(true);
    expect(
      groupValues(part, 20)
        .map(Number)
        .every((value) => value >= 0 && value <= maxY),
    ).toBe(true);
  }
});

test('DXF exports every part as a closed four-vertex profile', async ({ appPage: page }) => {
  const { content } = await downloadDxf(page);
  const entities = parseDxfEntities(parseDxfPairs(content));
  const parts = entities.filter((entity) => entity.type === 'LWPOLYLINE' && groupValues(entity, 8)[0] !== 'SHEET');
  const expectedParts = Number(content.match(/^999\nParts: (\d+)$/m)?.[1]);
  expect(parts.length).toBeGreaterThanOrEqual(expectedParts);
  expect(parts.every((part) => groupValues(part, 90)[0] === '4' && groupValues(part, 70)[0] === '1')).toBe(true);
});

test('DXF labels preserve part IDs and dimensions on the LABELS layer', async ({ appPage: page }) => {
  const { content } = await downloadDxf(page);
  const entities = parseDxfEntities(parseDxfPairs(content));
  const labels = entities.filter((entity) => entity.type === 'TEXT' && groupValues(entity, 8)[0] === 'LABELS');
  const expectedParts = Number(content.match(/^999\nParts: (\d+)$/m)?.[1]);
  expect(labels).toHaveLength(expectedParts);
  expect(labels.every((label) => /^P\d+ \d+x\d+$/.test(groupValues(label, 1)[0] ?? ''))).toBe(true);
});

test('DXF emits width and height dimensions for each part', async ({ appPage: page }) => {
  const { content } = await downloadDxf(page);
  const entities = parseDxfEntities(parseDxfPairs(content));
  const dimensions = entities.filter(
    (entity) => entity.type === 'DIMENSION' && groupValues(entity, 8)[0] === 'DIMENSIONS',
  );
  const expectedParts = Number(content.match(/^999\nParts: (\d+)$/m)?.[1]);
  expect(dimensions).toHaveLength(expectedParts * 2);
  expect(dimensions.filter((dimension) => groupValues(dimension, 70)[0] === '0')).toHaveLength(expectedParts);
  expect(dimensions.filter((dimension) => groupValues(dimension, 70)[0] === '1')).toHaveLength(expectedParts);
});

test('DXF declares the layers used by sheet, labels, dimensions, and parts', async ({ appPage: page }) => {
  const pairs = parseDxfPairs((await downloadDxf(page)).content);
  const layerNames = pairs
    .flatMap((pair, index) => (pair.code === 0 && pair.value === 'LAYER' ? [pairs[index + 1]?.value] : []))
    .filter((value): value is string => value !== undefined);
  expect(layerNames).toContain('SHEET');
  expect(layerNames).toContain('LABELS');
  expect(layerNames).toContain('DIMENSIONS');
  expect(layerNames.some((name) => name.startsWith('MAT_'))).toBe(true);
});

test('DXF SHA-256 checksum matches the downloaded artifact body', async ({ appPage: page }) => {
  const { content } = await downloadDxf(page);
  expect(checksumIsValid(content)).toBe(true);
});

test('DXF entity parser identifies profiles, labels, dimensions, and UTF-8 text', async ({ appPage: page }) => {
  const { bytes, content } = await downloadDxf(page);
  const entities = parseDxfEntities(parseDxfPairs(content));
  const types = new Set(entities.map((entity) => entity.type));
  expect(bytes.length).toBeGreaterThan(0);
  expect(content.charCodeAt(0)).not.toBe(0xfeff);
  expect(content).not.toContain('\ufffd');
  expect([...types]).toEqual(expect.arrayContaining(['LWPOLYLINE', 'TEXT', 'DIMENSION']));
});

test('G-code download uses the expected filename and versioned schema', async ({ appPage: page }) => {
  const artifact = await downloadGcode(page);
  expect(artifact.filename).toBe('cabinet-sheet-1.nc');
  expect(artifact.content).toMatch(/^; WoodworkingShop G-code Export$/m);
  expect(artifact.content).toMatch(/^; Version: .* Schema: gcode-v1$/m);
});

test('G-code declares metric units, absolute positioning, and spindle commands', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page);
  expect(content).toContain('G21 ; mm mode');
  expect(content).toContain('G90 ; absolute positioning');
  expect(content).toContain('M3 S18000 ; spindle on');
  expect(content).toContain('M5 ; spindle off');
});

test('G-code metadata identifies the first sheet and its dimensions', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page);
  expect(content).toMatch(/^; G-code for sheet 1 - .+ \d+mm$/m);
  expect(gcodeSheetSize(content).width).toBeGreaterThan(0);
  expect(gcodeSheetSize(content).length).toBeGreaterThan(0);
  const expectedParts = Number(content.match(/^; Parts: (\d+)$/m)?.[1]);
  const partLabels = content.match(/^; --- Cut: P\d+ .+ \(\d+x\d+\) ---$/gm) ?? [];
  expect(expectedParts).toBeGreaterThan(0);
  expect(partLabels).toHaveLength(expectedParts);
});

test('G-code safely retracts before cutting and ends at the origin', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page);
  const firstCut = content.indexOf('; --- Cut:');
  expect(content.indexOf('G0 Z5.0 ; retract to safe height')).toBeLessThan(firstCut);
  expect(content.trimEnd()).toMatch(
    /G0 Z5\.0 ; retract\nM5 ; spindle off\nG0 X0 Y0 ; return to origin\nM2 ; program end$/,
  );
});

test('G-code reports default tool diameter and feed settings', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page);
  expect(content).toContain('Tool diameter: 6 mm, Feed: 1500 mm/min');
  expect(content).toMatch(/^G1 X.* F1500$/m);
  const plunges = content.split(/\r?\n/).filter((line) => /^G1 Z-/.test(line));
  expect(plunges.length).toBeGreaterThan(0);
  expect(plunges.every((line) => line.endsWith('F600'))).toBe(true);
});

test('optimizer kerf changes are reflected in downloaded G-code coordinates', async ({ appPage: page }) => {
  const initial = await downloadGcode(page);
  const initialMoves = initial.content.split(/\r?\n/).filter((line) => /^G[01] X/.test(line));

  const kerf = page.getByRole('spinbutton', { name: 'Saw kerf' });
  await kerf.fill('8');
  await expect(kerf).toHaveValue('8');
  await expect(page.getByRole('status').filter({ hasText: 'Optimization complete' })).toBeVisible();

  const updated = await downloadGcode(page);
  const updatedMoves = updated.content.split(/\r?\n/).filter((line) => /^G[01] X/.test(line));
  expect(updatedMoves).not.toEqual(initialMoves);
});

test('G-code reaches the sheet thickness through bounded multi-pass depths', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page);
  const thickness = Number(content.match(/^; G-code for sheet 1 - .+ (\d+)mm$/m)?.[1]);
  const depths = content
    .split(/\r?\n/)
    .flatMap((line) => (line.match(/^G1 Z-(\d+(?:\.\d+)?)/) ?? []).slice(1).map(Number));
  expect(depths.length).toBeGreaterThan(1);
  expect(Math.max(...depths)).toBe(thickness);
  expect(depths.every((depth) => depth > 0 && depth <= thickness)).toBe(true);
});

test('G-code XY commands stay within sheet bounds plus the tool radius', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page);
  const coordinates = parseGcodeCoordinates(content);
  const { width, length } = gcodeSheetSize(content);
  const radius = Number(content.match(/^; Tool diameter: (\d+(?:\.\d+)?) mm/m)?.[1]) / 2;
  expect(coordinates.x.length).toBeGreaterThan(0);
  expect(coordinates.y.length).toBeGreaterThan(0);
  expect(coordinates.x.every((value) => value >= -radius && value <= width + radius)).toBe(true);
  expect(coordinates.y.every((value) => value >= -radius && value <= length + radius)).toBe(true);
});

test('G-code emits four profile edges per plunge pass', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page);
  const plungeCount = content.split(/\r?\n/).filter((line) => /^G1 Z-/.test(line)).length;
  const profileMoveCount = content.split(/\r?\n/).filter((line) => /^G1 X/.test(line)).length;
  expect(profileMoveCount).toBe(plungeCount * 4);
});

test('tool diameter edits update compensation in the downloaded G-code', async ({ appPage: page }) => {
  const original = await downloadGcode(page);
  const changed = await downloadGcode(page, async (dialog) => {
    await dialog.getByRole('button', { name: 'CNC Options' }).click();
    const toolDiameter = dialog.getByRole('spinbutton').nth(4);
    await toolDiameter.fill('8');
    await expect(toolDiameter).toHaveValue('8');
  });
  const firstRapidX = (content: string) => Number(content.match(/^G0 X(-?\d+(?:\.\d+)?)/m)?.[1]);
  expect(changed.content).toContain('Tool diameter: 8 mm');
  expect(firstRapidX(changed.content)).toBeCloseTo(firstRapidX(original.content) - 1, 2);
});

test('Shapeoko preset settings are reflected in the downloaded G-code', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page, async (dialog) => {
    await dialog.getByRole('button', { name: 'CNC Options' }).click();
    await dialog.getByRole('button', { name: 'Shapeoko 3' }).click();
  });
  expect(content).toContain('Tool diameter: 6 mm, Feed: 2000 mm/min');
  expect(content).toMatch(/^G1 Z-\d+(?:\.\d+)? F500$/m);
});

test('Genmitsu preset tool and feed settings are reflected in the downloaded G-code', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page, async (dialog) => {
    await dialog.getByRole('button', { name: 'CNC Options' }).click();
    await dialog.getByRole('button', { name: 'Genmitsu 3018 Pro' }).click();
  });
  expect(content).toContain('Tool diameter: 3.175 mm, Feed: 800 mm/min');
  expect(content).toMatch(/^G1 Z-\d+(?:\.\d+)? F300$/m);
});

test('manual feed-rate changes update cutting commands in the downloaded G-code', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page, async (dialog) => {
    await dialog.getByRole('button', { name: 'CNC Options' }).click();
    const feedRate = dialog.getByRole('spinbutton').first();
    await feedRate.fill('2200');
    await expect(feedRate).toHaveValue('2200');
  });
  expect(content).toContain('Feed: 2200 mm/min');
  expect(content).toMatch(/^G1 X.* F2200$/m);
});

test('tool-change option emits a safe pause and tool-change sequence between parts', async ({ appPage: page }) => {
  const { content } = await downloadGcode(page, async (dialog) => {
    await dialog.getByRole('button', { name: 'CNC Options' }).click();
    await dialog.getByRole('checkbox').nth(1).check();
  });
  expect(content).toMatch(
    /; --- Tool-change pause ---\nG0 Z5\.0 ; retract before tool change\nM5 ; spindle off\nM6 T1 ; tool change\nM3 S18000 ; spindle on/,
  );
});

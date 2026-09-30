import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures/app';
import type { Download, Page } from '@playwright/test';

type CsvArtifact = { filename: string; bytes: Buffer; content: string };

test.setTimeout(60_000);

async function showOptimizer(page: Page) {
  await page.getByRole('tablist', { name: 'Main navigation' }).getByRole('tab').nth(3).click();
  const wrapper = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(wrapper).toBeVisible({ timeout: 30_000 });
  await wrapper.scrollIntoViewIfNeeded();
}

async function readCsvDownload(download: Download): Promise<CsvArtifact> {
  const path = await download.path();
  if (!path) throw new Error('CSV export did not produce a downloadable file');
  const bytes = await readFile(path);
  return {
    filename: download.suggestedFilename(),
    bytes,
    content: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
  };
}

async function downloadBom(page: Page, buttonName = 'Export Bill of Materials CSV') {
  await showOptimizer(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName }).click();
  return readCsvDownload(await downloadPromise);
}

async function downloadHardware(page: Page, buttonName = 'Export Hardware List CSV') {
  await showOptimizer(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName }).click();
  return readCsvDownload(await downloadPromise);
}

async function renameCabinet(page: Page, name: string) {
  await page.getByRole('tab', { name: 'Configure' }).click();
  await page.getByRole('button', { name: /^Cabinet 1/ }).dblclick();
  const input = page.getByRole('textbox', { name: 'Cabinet name', exact: true });
  await input.fill(name);
  await input.press('Enter');
  await expect(input).toBeHidden();
}

async function selectLocale(page: Page, locale: string) {
  await page.locator('header select:visible').first().selectOption(locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'he' || locale === 'ar' ? 'rtl' : 'ltr');
  const optimizerTabs: Record<string, string> = {
    en: 'Cut Sheets',
    he: 'גיליונות חיתוך',
    es: 'Hojas de corte',
    de: 'Zuschnittplan',
    fr: 'Plans de découpe',
  };
  await expect(page.getByRole('tab', { name: optimizerTabs[locale] })).toBeVisible();
}

function parseCsv(content: string): string[][] {
  const source = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field');
  return rows;
}

function bomPartRows(rows: string[][]): string[][] {
  const headerIndex = rows.findIndex(
    (row) =>
      row.includes('Part ID') ||
      row.includes('ID Pieza') ||
      row.includes('ID Pièce') ||
      row.includes('Teile-ID') ||
      row.includes('מזהה'),
  );
  const hardwareIndex = rows.findIndex((row, index) => index > headerIndex && row[0] === '#');
  if (headerIndex < 0 || hardwareIndex < 0) throw new Error('BOM CSV is missing a parts or hardware header');
  return rows.slice(headerIndex + 1, hardwareIndex).filter((row) => /^\d+$/.test(row[0] ?? ''));
}

function metadataCounts(content: string) {
  const counts = content.match(/^# Cabinets: (\d+)  Parts: (\d+)  Hardware: (\d+),*$/m);
  if (!counts) throw new Error('BOM metadata counts are missing');
  return { cabinets: Number(counts[1]), parts: Number(counts[2]), hardware: Number(counts[3]) };
}

function allBomRows(content: string): string[][] {
  return parseCsv(content);
}

test('BOM browser download uses the project-specific filename', async ({ appPage: page }) => {
  const artifact = await downloadBom(page);
  expect(artifact.filename).toBe('cabinet-bill-of-materials.csv');
});

test('BOM browser download starts with the UTF-8 byte-order mark', async ({ appPage: page }) => {
  const { bytes } = await downloadBom(page);
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
});

test('BOM CSV includes its versioned schema and ISO generation timestamp', async ({ appPage: page }) => {
  const { content } = await downloadBom(page);
  expect(content).toContain('# Cabinet Planner BOM Export');
  expect(content).toContain('Schema: bom-csv-v1');
  expect(content).toMatch(/^# Generated: \d{4}-\d{2}-\d{2}T/m);
});

test('BOM metadata cabinet, part, and hardware counts reconcile to exported rows', async ({ appPage: page }) => {
  const { content } = await downloadBom(page);
  const counts = metadataCounts(content);
  const rows = allBomRows(content);
  const parts = bomPartRows(rows);
  const hardwareHeader = rows.findIndex((row) => row.includes('Hardware ID'));
  const hardware = rows.slice(hardwareHeader + 1).filter((row) => /^\d+$/.test(row[0] ?? ''));
  expect(counts.cabinets).toBe(1);
  expect(parts.reduce((sum, row) => sum + Number(row[4]), 0)).toBe(counts.parts);
  expect(hardware.reduce((sum, row) => sum + Number(row[4]), 0)).toBe(counts.hardware);
});

test('BOM CSV sections appear in metadata, material summary, parts, then hardware order', async ({ appPage: page }) => {
  const rows = allBomRows((await downloadBom(page)).content);
  const materialIndex = rows.findIndex((row) => row[0] === 'Material Summary');
  const partsIndex = rows.findIndex((row) => row.includes('Part ID'));
  const hardwareIndex = rows.findIndex((row) => row.includes('Hardware ID'));
  expect(materialIndex).toBeGreaterThan(0);
  expect(partsIndex).toBeGreaterThan(materialIndex);
  expect(hardwareIndex).toBeGreaterThan(partsIndex);
});

test('English BOM parts header contains the 13-column schema', async ({ appPage: page }) => {
  const rows = allBomRows((await downloadBom(page)).content);
  const header = rows.find((row) => row.includes('Part ID'));
  expect(header).toHaveLength(13);
  expect(header).toEqual([
    '#',
    'Cabinet',
    'Part ID',
    'Part Name',
    'Qty',
    'Material',
    'Thickness (mm)',
    'Length (mm)',
    'Width (mm)',
    'Area (m²)',
    'Edge Banding',
    'Weight (kg)',
    'Grain Direction',
  ]);
});

test('BOM part records have the same field count as the header', async ({ appPage: page }) => {
  const rows = allBomRows((await downloadBom(page)).content);
  const parts = bomPartRows(rows);
  expect(parts.length).toBeGreaterThan(0);
  expect(parts.every((row) => row.length === 13)).toBe(true);
});

test('BOM part rows use sequential indices and positive quantities', async ({ appPage: page }) => {
  const parts = bomPartRows(allBomRows((await downloadBom(page)).content));
  expect(parts.map((row) => Number(row[0]))).toEqual(parts.map((_, index) => index + 1));
  expect(parts.every((row) => Number(row[4]) > 0)).toBe(true);
});

test('BOM part quantities and material area are numeric and nonzero', async ({ appPage: page }) => {
  const rows = allBomRows((await downloadBom(page)).content);
  const parts = bomPartRows(rows);
  const areas = parts.map((row) => Number(row[9]));
  const materialIndex = rows.findIndex((row) => row[0] === 'Material Summary');
  const materialRows = rows.slice(
    materialIndex + 2,
    rows.findIndex((row) => row.includes('Part ID')),
  );
  expect(areas.every((area) => Number.isFinite(area) && area > 0)).toBe(true);
  expect(materialRows.some((row) => Number(row[1]) > 0)).toBe(true);
});

test('BOM material summary rows reconcile with part area totals', async ({ appPage: page }) => {
  const rows = allBomRows((await downloadBom(page)).content);
  const materialIndex = rows.findIndex((row) => row[0] === 'Material Summary');
  const parts = bomPartRows(rows);
  const summaryRows = rows.slice(
    materialIndex + 2,
    rows.findIndex((row) => row.includes('Part ID')),
  );
  const summaryArea = summaryRows.reduce((sum, row) => sum + (Number(row[1]) || 0), 0);
  const partsArea = parts.reduce((sum, row) => sum + Number(row[9]), 0);
  expect(summaryArea).toBeCloseTo(partsArea, 2);
});

test('BOM exports English part labels and material names', async ({ appPage: page }) => {
  const parts = bomPartRows(allBomRows((await downloadBom(page)).content));
  expect(parts.some((row) => row[3] === 'Side Panel')).toBe(true);
  expect(parts.every((row) => row[5].length > 0)).toBe(true);
});

test('Hebrew locale localizes BOM columns and part labels', async ({ appPage: page }) => {
  await selectLocale(page, 'he');
  const artifact = await downloadBom(page, 'ייצוא רשימת חומרים CSV');
  const rows = allBomRows(artifact.content);
  const header = rows.find((row) => row.includes('מזהה'));
  expect(header).toBeDefined();
  expect(header?.[1]).toBe('ארון');
  expect(bomPartRows(rows).some((row) => row[3] === 'דופן צד')).toBe(true);
});

test('Spanish locale localizes BOM headers', async ({ appPage: page }) => {
  await selectLocale(page, 'es');
  const rows = allBomRows((await downloadBom(page, 'Exportar lista de materiales CSV')).content);
  expect(rows.some((row) => row.includes('ID Pieza') && row.includes('Cant.'))).toBe(true);
});

test('German locale localizes BOM headers', async ({ appPage: page }) => {
  await selectLocale(page, 'de');
  const rows = allBomRows((await downloadBom(page, 'Stückliste CSV exportieren')).content);
  expect(rows.some((row) => row.includes('Teile-ID') && row.includes('Menge'))).toBe(true);
});

test('French locale localizes BOM headers', async ({ appPage: page }) => {
  await selectLocale(page, 'fr');
  const rows = allBomRows((await downloadBom(page, 'Exporter nomenclature CSV')).content);
  expect(rows.some((row) => row.includes('ID Pièce') && row.includes('Longueur (mm)'))).toBe(true);
});

test('BOM CSV quotes and round-trips commas and double quotes in cabinet names', async ({ appPage: page }) => {
  const cabinetName = 'Millwork, "North"';
  await renameCabinet(page, cabinetName);
  const rows = allBomRows((await downloadBom(page)).content);
  expect(bomPartRows(rows).every((row) => row[1] === cabinetName)).toBe(true);
});

test('BOM CSV neutralizes formula-like cabinet names in exported part rows', async ({ appPage: page }) => {
  await renameCabinet(page, '=1+1');
  const parts = bomPartRows(allBomRows((await downloadBom(page)).content));
  expect(parts.every((row) => row[1] === "'=1+1")).toBe(true);
  expect(parts.every((row) => !/^[=+\-@]/.test(row[1]))).toBe(true);
});

test('hardware CSV download uses the project-specific filename', async ({ appPage: page }) => {
  const artifact = await downloadHardware(page);
  expect(artifact.filename).toBe('cabinet-hardware-list.csv');
});

test('hardware CSV download starts with the UTF-8 byte-order mark', async ({ appPage: page }) => {
  const { bytes } = await downloadHardware(page);
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
});

test('hardware CSV uses the stable five-column procurement header', async ({ appPage: page }) => {
  const rows = parseCsv((await downloadHardware(page)).content);
  expect(rows[0]).toEqual(['Hardware ID', 'Hardware Name', 'Cabinet', 'Qty', 'Unit']);
});

test('hardware CSV records have five columns and positive quantities', async ({ appPage: page }) => {
  const rows = parseCsv((await downloadHardware(page)).content).slice(1);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((row) => row.length === 5 && Number(row[3]) > 0)).toBe(true);
});

test('hardware CSV row count and quantities match BOM metadata', async ({ appPage: page }) => {
  const bom = await downloadBom(page);
  const hardware = await downloadHardware(page);
  const expected = metadataCounts(bom.content).hardware;
  const rows = parseCsv(hardware.content).slice(1);
  expect(rows.reduce((sum, row) => sum + Number(row[3]), 0)).toBe(expected);
});

test('hardware CSV localizes item names while preserving the stable header', async ({ appPage: page }) => {
  await selectLocale(page, 'he');
  const artifact = await downloadHardware(page, 'ייצוא CSV רשימת פרזול');
  const rows = parseCsv(artifact.content);
  expect(rows[0]).toEqual(['Hardware ID', 'Hardware Name', 'Cabinet', 'Qty', 'Unit']);
  expect(rows.slice(1).some((row) => row[1].includes('ציר'))).toBe(true);
});

test('hardware CSV quotes and round-trips commas and double quotes in cabinet names', async ({ appPage: page }) => {
  const cabinetName = 'Hardware, "North"';
  await renameCabinet(page, cabinetName);
  const rows = parseCsv((await downloadHardware(page)).content).slice(1);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((row) => row[2] === cabinetName)).toBe(true);
});

test('hardware CSV neutralizes formula-like cabinet names', async ({ appPage: page }) => {
  await renameCabinet(page, '@SUM(A1:A2)');
  const rows = parseCsv((await downloadHardware(page)).content).slice(1);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((row) => row[2] === "'@SUM(A1:A2)")).toBe(true);
  expect(rows.every((row) => !/^[=+\-@]/.test(row[2]))).toBe(true);
});

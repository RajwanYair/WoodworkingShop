import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, test } from './fixtures/app';
import type { Page } from '@playwright/test';

test.setTimeout(120_000);

type PdfOptions = {
  includeCover?: boolean;
  pageSize?: 'A4' | 'LETTER';
  orientation?: 'portrait' | 'landscape';
  fullProject?: boolean;
};

type TextBounds = { pageNumber: number; text: string; left: number; top: number; right: number; bottom: number };

function normalizePdfText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function addNamedSecondCabinet(page: Page) {
  await page.getByRole('tab', { name: 'Configure' }).click();
  await page.getByRole('button', { name: /Add Cabinet/ }).click();
  await page.getByRole('button', { name: /^Cabinet 2/ }).dblclick();
  const nameInput = page.getByRole('textbox', { name: 'Cabinet name', exact: true });
  await nameInput.fill('Wall Cabinet');
  await nameInput.press('Enter');
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('800');
  await widthInput.press('Enter');
  await expect(widthInput).toHaveValue('800');
}

async function downloadPdf(page: Page, options: PdfOptions = {}) {
  if (options.fullProject) await addNamedSecondCabinet(page);
  await page.getByRole('tab', { name: /pdf/i }).click();
  await expect(page.getByRole('heading', { name: /^export pdf$/i })).toBeVisible({ timeout: 30_000 });
  if (options.includeCover === false) {
    await page.getByRole('checkbox', { name: 'Include cover page' }).uncheck();
  }
  if (options.pageSize) {
    await page.getByRole('combobox', { name: 'Page size' }).selectOption(options.pageSize);
  }
  if (options.orientation) {
    await page.getByRole('combobox', { name: 'Orientation' }).selectOption(options.orientation);
  }

  const diagnostics: string[] = [];
  const onConsole = (message: import('@playwright/test').ConsoleMessage) => {
    if (message.type() === 'warning' || message.type() === 'error') diagnostics.push(message.text());
  };
  const onPageError = (error: Error) => diagnostics.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  const downloadPromise = page.waitForEvent('download');
  const buttonName = options.fullProject
    ? 'Export Full Project (2 cabinets)'
    : options.fullProject === false
      ? 'Export current cabinet only'
      : 'Generate PDF';
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  const download = await downloadPromise;
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  const path = await download.path();
  if (!path) throw new Error('PDF export did not produce a downloadable file');

  const bytes = new Uint8Array(await readFile(path));
  const document = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const pages: string[] = [];
  const pageSizes: { width: number; height: number }[] = [];
  const textBounds: TextBounds[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const pdfPage = await document.getPage(pageNumber);
    const text = await pdfPage.getTextContent();
    pages.push(text.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    const viewport = pdfPage.getViewport({ scale: 1 });
    const { width, height } = viewport;
    pageSizes.push({ width, height });
    for (const item of text.items) {
      if (!('str' in item) || !('transform' in item) || !item.str.trim()) continue;
      const [left, top, right, bottom] = viewport.convertToViewportRectangle([
        item.transform[4],
        item.transform[5] - item.height,
        item.transform[4] + item.width,
        item.transform[5],
      ]);
      textBounds.push({
        pageNumber,
        text: item.str,
        left: Math.min(left, right),
        top: Math.min(top, bottom),
        right: Math.max(left, right),
        bottom: Math.max(top, bottom),
      });
    }
  }

  return { filename: download.suggestedFilename(), bytes, pages, pageSizes, textBounds, diagnostics };
}

test('PDF browser download uses the current-cabinet filename pattern', async ({ appPage }) => {
  const artifact = await downloadPdf(appPage);
  expect(artifact.filename).toMatch(/-1000x2000x600\.pdf$/i);
});

test('PDF browser download starts with the PDF signature', async ({ appPage }) => {
  const { bytes } = await downloadPdf(appPage);
  expect(new TextDecoder('ascii').decode(bytes.subarray(0, 5))).toBe('%PDF-');
});

test('PDF browser download stays within the configured size range', async ({ appPage }) => {
  const { bytes } = await downloadPdf(appPage);
  expect(bytes.byteLength).toBeGreaterThan(1024);
  expect(bytes.byteLength).toBeLessThanOrEqual(8_000_000);
});

test('PDF parser reports multiple rendered pages', async ({ appPage }) => {
  const { pageSizes } = await downloadPdf(appPage);
  expect(pageSizes.length).toBeGreaterThan(5);
});

test('PDF text extraction includes the default cover title', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(pages.join(' ')).toContain('CABINET BUILD PLAN');
});

test('PDF text extraction includes the configured cabinet dimensions', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(normalizePdfText(pages.join(' '))).toContain('1000 × 2000 × 600 mm');
});

test('PDF text extraction includes cabinet specifications', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(pages.join(' ')).toContain('Cabinet Specifications');
  expect(pages.join(' ')).toContain('Estimated panel weight');
  expect(pages.join(' ')).toContain('Estimated build time');
});

test('PDF text extraction includes the parts list', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(pages.join(' ')).toContain('Parts List');
});

test('PDF text extraction includes the hardware list', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(pages.join(' ')).toContain('Hardware List');
});

test('PDF text extraction includes the cut-sheet section', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(pages.join(' ')).toContain('Cut Sheet');
});

test('PDF text extraction includes the drilling guide', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(pages.join(' ')).toContain('Drilling & Boring Guide');
});

test('PDF text extraction includes the assembly sequence', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(pages.join(' ')).toContain('Assembly Sequence');
});

test('PDF text extraction includes the shopping list', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage);
  expect(pages.join(' ')).toContain('Shopping List');
});

test('cover-page option is enabled by default', async ({ appPage }) => {
  await appPage.getByRole('tab', { name: /pdf/i }).click();
  await expect(appPage.getByRole('checkbox', { name: 'Include cover page' })).toBeChecked();
});

test('disabling the cover omits only cover content from the PDF', async ({ appPage }) => {
  const withCover = await downloadPdf(appPage);
  const withoutCover = await downloadPdf(appPage, { includeCover: false });
  expect(withoutCover.pages.length).toBe(withCover.pages.length - 1);
  expect(withoutCover.pages[0]).toContain('Cabinet Specifications');
});

test('default content page geometry is A4 portrait', async ({ appPage }) => {
  const { pageSizes } = await downloadPdf(appPage, { includeCover: false });
  expect(pageSizes[0]?.width).toBeCloseTo(595.28, 0);
  expect(pageSizes[0]?.height).toBeCloseTo(841.89, 0);
});

test('Letter page-size option changes parsed page geometry', async ({ appPage }) => {
  const { pageSizes } = await downloadPdf(appPage, { includeCover: false, pageSize: 'LETTER' });
  expect(pageSizes[0]?.width).toBeCloseTo(612, 0);
  expect(pageSizes[0]?.height).toBeCloseTo(792, 0);
});

test('landscape orientation changes non-cut-sheet content pages', async ({ appPage }) => {
  const { pageSizes } = await downloadPdf(appPage, {
    includeCover: false,
    orientation: 'landscape',
  });
  expect(pageSizes[0]!.width).toBeGreaterThan(pageSizes[0]!.height);
});

test('full-project filename reports cabinet count and part total', async ({ appPage }) => {
  const { filename } = await downloadPdf(appPage, { fullProject: true });
  expect(filename).toMatch(/-2-cabinets-18-parts\.pdf$/i);
});

test('full-project PDF contains both cabinet names', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage, { fullProject: true });
  const text = pages.join(' ');
  expect(text).toContain('Cabinet 1');
  expect(text).toContain('Wall Cabinet');
});

test('full-project PDF contains each cabinet’s distinct dimensions', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage, { fullProject: true });
  const text = pages.join(' ');
  expect(text).toContain('1000×2000×600');
  expect(text).toContain('800×2000×600');
});

test('full-project PDF reports both cabinets in its cover text', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage, { fullProject: true });
  expect(normalizePdfText(pages.join(' '))).toContain('2 cabinets');
});

test('full-project PDF has cabinet sections and project hardware pages', async ({ appPage }) => {
  const { pages } = await downloadPdf(appPage, { fullProject: true });
  const text = pages.join(' ');
  expect(text).toContain('Wall Cabinet');
  expect(text).toContain('Project Hardware');
  expect(pages.length).toBeGreaterThan(5);
});

test('PDF text remains within each page’s printable bounds', async ({ appPage }) => {
  const { textBounds, pageSizes } = await downloadPdf(appPage);
  expect(textBounds.length).toBeGreaterThan(0);
  for (const bounds of textBounds) {
    const pageSize = pageSizes[bounds.pageNumber - 1];
    expect(
      bounds.right,
      `Text clipped at right edge: ${JSON.stringify(bounds)} ${JSON.stringify(pageSize)}`,
    ).toBeLessThanOrEqual(pageSize!.width + 1);
    expect(
      bounds.bottom,
      `Text clipped at bottom edge: ${JSON.stringify(bounds)} ${JSON.stringify(pageSize)}`,
    ).toBeLessThanOrEqual(pageSize!.height + 1);
    expect(
      bounds.left,
      `Text clipped at left edge: ${JSON.stringify(bounds)} ${JSON.stringify(pageSize)}`,
    ).toBeGreaterThanOrEqual(-1);
    expect(
      bounds.top,
      `Text clipped at top edge: ${JSON.stringify(bounds)} ${JSON.stringify(pageSize)}`,
    ).toBeGreaterThanOrEqual(-1);
  }
});

test('PDF generation produces no browser warnings or errors', async ({ appPage }) => {
  const { diagnostics } = await downloadPdf(appPage);
  expect(diagnostics).toEqual([]);
});

test('PDF export returns the generation button to an enabled state', async ({ appPage }) => {
  await downloadPdf(appPage);
  await expect(appPage.getByRole('button', { name: 'Generate PDF', exact: true })).toBeEnabled();
});

test('PDF export option controls expose supported values', async ({ appPage }) => {
  await appPage.getByRole('tab', { name: /pdf/i }).click();
  await expect(appPage.getByRole('combobox', { name: 'Page size' }).locator('option')).toHaveCount(2);
  await expect(appPage.getByRole('combobox', { name: 'Orientation' }).locator('option')).toHaveCount(2);
});

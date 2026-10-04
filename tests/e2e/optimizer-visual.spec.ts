import type { Locator } from '@playwright/test';
import WORKSPACE_CONTROL_INVENTORY from '../fixtures/workspace-control-inventory.json' with { type: 'json' };
import { test, expect } from './fixtures/app';
import { DEFAULT_CONFIG, getMaterial } from '../../src/engine/materials';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import { generateParts } from '../../src/engine/parts';
import { analyzeWaste, formatAreaM2 } from '../../src/engine/inventory/waste';
import { buildGrainReport } from '../../src/engine/grain-report';

function getAccessibleTableControl(main: Locator, table: Locator, control: object) {
  if (!('role' in control) || typeof control.role !== 'string') {
    throw new Error('Optimizer table inventory control has no role');
  }
  if (!('accessibleName' in control) || typeof control.accessibleName !== 'string') {
    throw new Error('Optimizer table inventory control has no accessible name');
  }

  const options = { name: control.accessibleName, exact: true };
  switch (control.role) {
    case 'button':
      return table.getByRole('button', options);
    case 'combobox':
      return main.getByRole('combobox', options);
    case 'searchbox':
      return main.getByRole('searchbox', options);
    default:
      throw new Error(`Unsupported optimizer table control role: ${control.role}`);
  }
}

// Sprint 105 — smoke test for the optimizer view's new yield bars and hint
// banners introduced in Sprint A3 p2. Keeping this as a behavioral test
// rather than a pixel-snapshot test so it stays stable across OS font
// rendering and Chromium upgrades.

test('optimizer analytics and reports reconcile with engine oracles', async ({ appPage: page }) => {
  test.setTimeout(60_000);
  const parts = generateParts(DEFAULT_CONFIG);
  const optimization = optimizeCutSheets(parts);
  const waste = analyzeWaste(optimization);
  const grain = buildGrainReport(parts);

  await expect(page.getByRole('tablist')).toBeVisible();
  await page.keyboard.press('Alt+3');
  await expect(page.getByRole('status')).toContainText('Optimization complete');
  // OptimizerView is lazy-loaded; wait for the Suspense boundary to resolve.
  // The virtual-sheet-wrapper placeholder is rendered before real content.
  const wrapper = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(wrapper).toBeVisible({ timeout: 30_000 });
  // Scroll the wrapper into view to trigger the IntersectionObserver so the
  // real sheet card (including the YieldBar meter) replaces the placeholder.
  await wrapper.scrollIntoViewIfNeeded();
  // Use attribute selector to avoid ARIA-role lookup quirks in headless browsers.
  const meter = page.getByRole('meter').first();
  await expect(meter).toBeVisible({ timeout: 20_000 });
  const firstSheet = optimization.sheets[0];
  expect(firstSheet).toBeDefined();
  await expect(meter).toHaveAttribute('aria-valuemin', '0');
  await expect(meter).toHaveAttribute('aria-valuemax', '100');
  await expect(meter).toHaveAttribute('aria-valuenow', String(firstSheet.yieldPercent));
  await expect(meter).toHaveAttribute('aria-label', `Yield ${firstSheet.yieldPercent}%`);

  const wasteToggle = page.getByRole('button', { name: /Waste Analytics/ });
  await wasteToggle.click();
  await expect(wasteToggle).toHaveAttribute('aria-expanded', 'true');
  const wastePanel = wasteToggle.locator('..');
  const wasteStat = (label: string) => wastePanel.getByText(label, { exact: true }).locator('..').locator('dd');
  await expect(wasteStat('Total Sheets')).toHaveText(String(waste.totalSheets));
  await expect(wasteStat('Total Waste')).toHaveText(formatAreaM2(waste.totalWasteMm2));
  await expect(wasteStat('Offcut Candidates')).toHaveText(String(waste.offcutCandidateCount));
  await expect(wasteStat('Recoverable Area')).toHaveText(formatAreaM2(waste.offcutCandidateAreaMm2));
  await expect(wasteToggle).toContainText(`${waste.overallWastePercent.toFixed(1)}%`);

  const wasteRows = wastePanel.getByRole('table').getByRole('row');
  for (const expected of waste.byMaterial) {
    const row = wasteRows.filter({ hasText: expected.material });
    await expect(row.locator('td').nth(1)).toHaveText(String(expected.sheetCount));
    await expect(row.locator('td').nth(2)).toHaveText(formatAreaM2(expected.usedAreaMm2));
    await expect(row.locator('td').nth(3)).toHaveText(`${expected.wastePercent.toFixed(1)}%`);
  }

  const grainToggle = page.getByRole('button', { name: /Grain Direction Report/ });
  await grainToggle.click();
  await expect(grainToggle).toHaveAttribute('aria-expanded', 'true');
  const grainPanel = grainToggle.locator('..');
  await expect(grainPanel).toContainText(
    `${grain.totalConstrained} of ${grain.totalParts} part instances have grain direction constraints.`,
  );
  const grainGroup = grain.groups.find((group) => group.grainSensitiveParts.length > 0);
  expect(grainGroup).toBeDefined();
  const grainGroupToggle = grainPanel.getByRole('button').filter({ hasText: grainGroup!.materialName });
  await grainGroupToggle.click();
  await expect(grainGroupToggle).toContainText(`${grainGroup!.constrainedInstances}/${grainGroup!.totalInstances}`);
  const grainPart = grainGroup!.grainSensitiveParts[0];
  expect(grainPart).toBeDefined();
  const grainPartRow = grainPanel.getByRole('listitem').filter({ hasText: grainPart.name.en }).last();
  await expect(grainPartRow).toContainText(`${grainPart.length}×${grainPart.width}`);

  const materialSummaryToggle = page.getByRole('button', { name: /Material Usage Summary/ });
  const materialRows = materialSummaryToggle.locator('..').getByRole('table').getByRole('row');
  for (const expected of waste.byMaterial) {
    const material = getMaterial(expected.material);
    const row = materialRows.filter({ hasText: `${material.name.en} ${material.thickness} mm` });
    await expect(row.locator('td').nth(1)).toHaveText(`×${expected.sheetCount}`);
    await expect(row.locator('td').nth(2)).toHaveText(formatAreaM2(expected.totalAreaMm2));
    const totalCost = (material.pricePerSheet ?? 0) * expected.sheetCount;
    await expect(row.locator('td').nth(3)).toHaveText(totalCost > 0 ? `₪${totalCost.toFixed(0)}` : '—');
  }

  const shoppingListToggle = page.getByRole('button', { name: /Shopping List/ });
  await expect(shoppingListToggle).toHaveAttribute('aria-expanded', 'true');
  const shoppingList = shoppingListToggle.locator('..');
  const shoppingTotal = waste.byMaterial.reduce(
    (total, item) => total + (getMaterial(item.material).pricePerSheet ?? 0) * item.sheetCount,
    0,
  );
  await expect(shoppingListToggle).toContainText(
    `${optimization.sheets.length} sheets required · ₪${shoppingTotal.toFixed(0)}`,
  );
  for (const expected of waste.byMaterial) {
    const material = getMaterial(expected.material);
    const row = shoppingList.getByText(`${material.name.en} ${material.thickness} mm`, { exact: true }).locator('..');
    await expect(row).toContainText(`×${expected.sheetCount}`);
    const totalCost = (material.pricePerSheet ?? 0) * expected.sheetCount;
    await expect(row).toContainText(totalCost > 0 ? `₪${totalCost.toFixed(0)}` : '—');
  }
});

test('smart optimizer candidates flow through config, parts, sheets, and the cut checklist', async ({
  appPage: page,
}) => {
  test.setTimeout(60_000);
  await page.keyboard.press('Alt+3');

  const smartPanel = page.getByRole('heading', { name: 'Smart Optimizer' }).locator('..').locator('..');
  for (const strategy of ['Co-Nest Strips', 'Adjust Width', 'Adjust Height', 'Material Swap']) {
    await smartPanel.getByRole('checkbox', { name: strategy }).uncheck();
  }
  await smartPanel.getByRole('button', { name: 'Find Optimizations' }).click();

  const compareButton = smartPanel.getByRole('button', { name: 'Compare' }).first();
  await expect(compareButton).toBeVisible();
  await compareButton.click();
  const comparison = smartPanel.getByRole('heading', { name: 'Original vs Optimized' }).locator('..');
  const originalCard = comparison.getByText('Original', { exact: true }).locator('..');
  const optimizedCard = comparison.getByText('Optimized', { exact: true }).locator('..');
  const readDepth = async (card: typeof originalCard) => {
    const match = (await card.innerText()).match(/Depth\s+(\d+)\s+mm/);
    expect(match).not.toBeNull();
    return Number(match?.[1]);
  };
  const originalDepth = await readDepth(originalCard);
  const optimizedDepth = await readDepth(optimizedCard);
  expect(originalDepth).toBe(600);
  expect(optimizedDepth).not.toBe(originalDepth);
  expect(Math.abs(optimizedDepth - originalDepth)).toBeLessThanOrEqual(20);

  await smartPanel.getByRole('button', { name: 'Apply', exact: true }).first().click();
  await page.keyboard.press('Alt+1');
  await expect(page.getByRole('spinbutton', { name: 'Depth' })).toHaveValue(String(optimizedDepth));

  await page.keyboard.press('Alt+3');
  const partsTable = page.getByRole('table').first();
  const sidePanelRow = partsTable.getByRole('row').filter({ hasText: 'Side Panel' }).first();
  await expect(sidePanelRow.locator('td').nth(5)).toHaveText(String(optimizedDepth));

  const firstSheet = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(firstSheet.getByTestId('virtual-sheet-placeholder')).toBeVisible();
  await firstSheet.scrollIntoViewIfNeeded();
  const drawing = firstSheet.getByRole('img', { name: 'Cut sheet 1' });
  await expect(drawing).toBeVisible();
  const renderedSidePanel = await drawing.locator('title').filter({ hasText: 'P01: Side Panel' }).first().textContent();
  expect(renderedSidePanel ?? '').toMatch(new RegExp(`P01: Side Panel\\s+${optimizedDepth} × \\d+ mm`));

  const checklistButton = page.getByRole('button', { name: /Part Cutting Checklist/ });
  await checklistButton.scrollIntoViewIfNeeded();
  await checklistButton.click();
  await expect(checklistButton).toHaveAttribute('aria-expanded', 'true');
  const checklistPanel = checklistButton.locator('..');
  const firstCutPart = checklistPanel.getByRole('checkbox').first();
  await firstCutPart.check();
  await expect(firstCutPart).toBeChecked();
  await expect(checklistButton).toContainText('1/9');
});

test('optimizer controls update settings and rendered part presentation', async ({ appPage: page }) => {
  test.setTimeout(60_000);
  await page.keyboard.press('Alt+3');

  const wrapper = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(wrapper).toBeVisible({ timeout: 30_000 });
  await wrapper.scrollIntoViewIfNeeded();

  const drawing = page.getByRole('img', { name: 'Cut sheet 1' });
  await expect(drawing).toBeVisible();

  const placementCoordinates = () =>
    drawing.locator('g[style*="cursor: pointer"]').evaluateAll((parts) =>
      parts.map((part) => {
        const rect = part.querySelector('rect');
        return `${rect?.getAttribute('x')}:${rect?.getAttribute('y')}`;
      }),
    );
  const initialPlacements = await placementCoordinates();
  const kerf = page.getByRole('spinbutton', { name: 'Saw kerf' });
  await kerf.fill('8');
  await expect(kerf).toHaveValue('8');
  await expect(page.getByRole('status')).toContainText('Optimization complete');
  await expect.poll(placementCoordinates).not.toEqual(initialPlacements);

  const guillotine = page.getByRole('checkbox', { name: 'Guillotine cuts (panel saw compatible)' });
  const firstPartRationale = drawing.locator('title').first();
  await guillotine.check();
  await expect(guillotine).toBeChecked();
  await expect.poll(() => firstPartRationale.textContent()).toContain('Guillotine(');

  const autoCoNest = page.getByRole('checkbox', { name: 'Auto co-nest materials' });
  await autoCoNest.check();
  await expect(autoCoNest).toBeChecked();

  const firstPart = drawing.locator('rect').nth(2);
  const originalFill = await firstPart.getAttribute('fill');
  const colorBlindMode = page.getByRole('button', { name: 'CB' });
  await colorBlindMode.click();
  await expect(colorBlindMode).toHaveAttribute('aria-pressed', 'true');
  await expect(firstPart).not.toHaveAttribute('fill', originalFill ?? '');

  const labels = page.getByRole('button', { name: 'Labels' });
  const initialTextCount = await drawing.locator('text').count();
  await labels.click();
  await expect(labels).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => drawing.locator('text').count()).toBeGreaterThan(initialTextCount);

  const grainHatch = page.getByRole('button', { name: 'Grain hatch' });
  await grainHatch.click();
  await expect(grainHatch).toHaveAttribute('aria-pressed', 'true');
  await expect(drawing.getByTestId(/grain-overlay-/).first()).toBeVisible();

  const lockRotation = wrapper.getByRole('button', { name: /^Lock rotation/ }).first();
  await lockRotation.click();
  await expect(page.getByRole('button', { name: /^Unlock rotation/ }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toContainText('Optimization complete');

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('woodworkingshop:session')))
    .toContain('"autoCoNest":true');
  await page.reload();
  await page.keyboard.press('Alt+3');
  await expect(page.getByRole('spinbutton', { name: 'Saw kerf' })).toHaveValue('8');
  await expect(page.getByRole('checkbox', { name: 'Guillotine cuts (panel saw compatible)' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Auto co-nest materials' })).toBeChecked();
});

test('sheet dimensions and cost overrides update visible optimizer summaries', async ({ appPage: page }) => {
  test.setTimeout(60_000);
  await page.keyboard.press('Alt+3');

  const wrapper = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(wrapper).toBeVisible({ timeout: 30_000 });
  await wrapper.scrollIntoViewIfNeeded();

  const drawing = page.getByRole('img', { name: 'Cut sheet 1' });
  await expect(drawing).toBeVisible();
  await page.locator('button[title="Override sheet size"]').first().click();
  await page.getByRole('spinbutton', { name: 'Sheet width mm' }).fill('1200');
  await page.getByRole('spinbutton', { name: 'Sheet length mm' }).fill('2400');
  await page.getByRole('spinbutton', { name: 'Sheet width mm' }).locator('..').locator('button[title="Apply"]').click();
  await expect(drawing).toContainText('1200 mm');
  await expect(drawing).toContainText('2400 mm');

  const sidebar = page.getByRole('complementary', { name: 'Cabinet summary' });
  await expect(sidebar).toBeVisible();
  const totalCost = sidebar.getByText('Estimated Total', { exact: true }).locator('..').locator('span').last();
  const readTotal = async () => Number((await totalCost.innerText()).replace(/[^\d]/g, ''));
  const increaseCost = async (edit: () => Promise<void>) => {
    const previousTotal = await readTotal();
    await edit();
    await expect.poll(readTotal).toBeGreaterThan(previousTotal);
  };

  await increaseCost(async () => {
    await sidebar.locator('button[title="Click to override price per sheet"]').first().click();
    const input = sidebar.getByRole('spinbutton', { name: /^Price per sheet for/ });
    await input.fill('10000');
    await input.press('Enter');
  });

  await increaseCost(async () => {
    await sidebar.locator('button[title="Click to set edge banding rate (₪/m)"]').click();
    const input = sidebar.getByRole('spinbutton', { name: 'Edge banding rate per meter' });
    await input.fill('12');
    await input.press('Enter');
  });

  await increaseCost(async () => {
    await sidebar.locator('button[title="Click to set estimated labour hours"]').click();
    const input = sidebar.getByRole('spinbutton', { name: 'Labour hours' });
    await input.fill('4');
    await input.press('Enter');
  });

  await increaseCost(async () => {
    await sidebar.locator('button[title="Click to override labour rate (₪/hr)"]').click();
    const input = sidebar.getByRole('spinbutton', { name: 'Labour rate per hour' });
    await input.fill('120');
    await input.press('Enter');
  });

  await increaseCost(async () => {
    await sidebar.locator('button[title="Click to set finish/paint cost"]').click();
    const input = sidebar.getByRole('spinbutton', { name: 'Finish/paint cost' });
    await input.fill('400');
    await input.press('Enter');
  });
});

test('optimizer parts and hardware table controls match the browser-derived inventory', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+3');

  const inventory = WORKSPACE_CONTROL_INVENTORY.panels.find(
    (panel) => panel.name === 'Optimizer parts and hardware tables',
  );
  if (!inventory) throw new Error('Optimizer table control inventory is missing');
  const main = page.getByRole('main');

  for (const control of inventory.controls) {
    if (!('scope' in control) || typeof control.scope !== 'string') {
      throw new Error('Optimizer table inventory control has no table scope');
    }
    const table = page.getByRole('table', { name: control.scope, exact: true });
    await expect(table).toBeVisible();
    await expect(getAccessibleTableControl(main, table, control)).toHaveCount(1);
    expect('positiveTest' in control && typeof control.positiveTest === 'string').toBe(true);
    expect(
      ('negativeTest' in control && typeof control.negativeTest === 'string') ||
        ('negativeWaiver' in control && typeof control.negativeWaiver === 'string'),
    ).toBe(true);
  }
});

test('parts and hardware tables search, filter, and sort visible rows', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+3');

  const partsTable = page.getByRole('table').nth(0);
  const hardwareTable = page.getByRole('table').nth(1);
  const partsSearch = page.getByRole('searchbox', { name: 'Search parts' });
  const hardwareSearch = page.getByRole('searchbox', { name: 'Search hardware' });
  const partRows = partsTable.locator('tbody tr');
  const hardwareRows = hardwareTable.locator('tbody tr');

  await expect(partRows.first()).toBeVisible();
  const partId = (await partRows.first().locator('td').first().innerText()).trim();
  await partsSearch.fill(partId);
  await expect(partRows).toHaveCount(1);
  await expect(partRows.first()).toContainText(partId);
  await partsSearch.fill('no matching part');
  await expect(partsTable.getByRole('status')).toBeVisible();

  await partsSearch.clear();
  const materialFilter = page.getByRole('combobox', { name: 'Filter by material' });
  await expect.poll(() => materialFilter.locator('option').count()).toBeGreaterThan(1);
  await materialFilter.selectOption({ index: 1 });
  const selectedMaterial = await materialFilter.locator('option:checked').innerText();
  await expect(partRows.first().locator('td').nth(3)).toHaveText(selectedMaterial);

  const partNameHeader = partsTable.getByRole('columnheader', { name: 'Name' });
  await partNameHeader.getByRole('button').click();
  await expect(partNameHeader).toHaveAttribute('aria-sort', 'ascending');
  const partNames = await partRows.locator('td').nth(1).allTextContents();
  expect(partNames).toEqual([...partNames].sort((left, right) => left.localeCompare(right)));

  await expect(hardwareRows.first()).toBeVisible();
  const hardwareName = (await hardwareRows.first().locator('td').first().innerText()).trim();
  await hardwareSearch.fill(hardwareName);
  await expect(hardwareRows).toHaveCount(1);
  await expect(hardwareRows.first()).toContainText(hardwareName);
  await hardwareSearch.fill('no matching hardware');
  await expect(hardwareTable.getByRole('status')).toBeVisible();
  await hardwareSearch.clear();

  const quantityHeader = hardwareTable.getByRole('columnheader', { name: 'Qty' });
  await quantityHeader.getByRole('button').click();
  await expect(quantityHeader).toHaveAttribute('aria-sort', 'ascending');
  const quantities = () =>
    hardwareRows
      .locator('input[type="number"]')
      .evaluateAll((inputs) => inputs.map((input) => Number((input as HTMLInputElement).value)));
  await expect
    .poll(async () => {
      const values = await quantities();
      return values.every((value, index) => index === 0 || values[index - 1] <= value);
    })
    .toBe(true);
  await quantityHeader.getByRole('button').click();
  await expect(quantityHeader).toHaveAttribute('aria-sort', 'descending');
  await expect
    .poll(async () => {
      const values = await quantities();
      return values.every((value, index) => index === 0 || values[index - 1] >= value);
    })
    .toBe(true);
});

test('stock inventory changes persist across reload and can be removed', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+3');

  const stockTracker = page.getByRole('button', { name: /Stock Tracker/ });
  await stockTracker.click();
  await expect(stockTracker).toHaveAttribute('aria-expanded', 'true');
  await page.getByText('+ Add stock item').click();
  await page.getByRole('textbox', { name: 'Material key' }).fill('e2e-stock-sheet');
  await page.getByRole('spinbutton', { name: 'On Hand' }).fill('7');
  await page.getByRole('spinbutton', { name: 'Reorder at' }).fill('2');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('e2e-stock-sheet', { exact: true })).toBeVisible();
  const stockTable = page.getByRole('table', { name: 'Material stock availability table' });
  const demandedMaterial = stockTable.locator('tbody tr').first();
  await expect(demandedMaterial).toBeVisible();
  const demandedMaterialKey = (await demandedMaterial.locator('td').first().innerText()).trim();
  await page.getByRole('textbox', { name: 'Material key' }).fill(demandedMaterialKey);
  await page.getByRole('spinbutton', { name: 'On Hand' }).fill('0');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await demandedMaterial.locator('td').nth(2).getByRole('button').click();
  const quantityInput = page.getByRole('spinbutton', { name: `Edit on-hand quantity for ${demandedMaterialKey}` });
  await quantityInput.fill('12');
  await quantityInput.press('Enter');
  await expect(demandedMaterial.locator('td').nth(2)).toHaveText('12');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('woodworkingshop:stocktracker')))
    .toContain('e2e-stock-sheet');

  await page.reload();
  await page.keyboard.press('Alt+3');
  await page.getByRole('button', { name: /Stock Tracker/ }).click();
  await expect(page.getByText('e2e-stock-sheet', { exact: true })).toBeVisible();
  const restoredDemandRow = page
    .getByRole('table', { name: 'Material stock availability table' })
    .getByRole('row')
    .filter({ hasText: demandedMaterialKey });
  await expect(restoredDemandRow.locator('td').nth(2)).toHaveText('12');

  await page.getByRole('button', { name: 'Remove e2e-stock-sheet from stock' }).click();
  await expect(page.getByText('e2e-stock-sheet', { exact: true })).toHaveCount(0);
});

test('defect zones can be added, edited, rendered on the sheet, and removed', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+3');

  const sheetWrapper = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(sheetWrapper).toBeVisible({ timeout: 30_000 });
  await sheetWrapper.scrollIntoViewIfNeeded();
  const sheetHeading = await sheetWrapper.locator('h3').innerText();

  const defectToggle = page.getByRole('button', { name: /Sheet Defect Zones/ });
  await defectToggle.scrollIntoViewIfNeeded();
  await defectToggle.click();

  const defectPanel = defectToggle.locator('..');
  const materialSelect = defectPanel.getByRole('combobox');
  await expect.poll(() => materialSelect.locator('option').count()).toBeGreaterThan(1);
  const partsMaterialFilter = page.getByRole('combobox', { name: 'Filter by material' });
  const displayedMaterialOptions = await partsMaterialFilter.locator('option').allTextContents();
  const displayedMaterialIndex = displayedMaterialOptions.findIndex((label) => sheetHeading.includes(label.trim()));
  const matchingMaterial = partsMaterialFilter.locator('option').nth(displayedMaterialIndex);
  const materialKey = await matchingMaterial.getAttribute('value');
  if (!materialKey) throw new Error('Expected an optimizer sheet material option.');
  await materialSelect.selectOption(materialKey);

  const dimensions = defectPanel.getByRole('spinbutton');
  await dimensions.nth(0).fill('12');
  await dimensions.nth(1).fill('20');
  await dimensions.nth(2).fill('300');
  await dimensions.nth(3).fill('400');
  await defectPanel.getByRole('button', { name: 'Add zone' }).click();

  const zone = defectPanel.getByRole('listitem').filter({ hasText: materialKey });
  await expect(zone).toContainText('x=12 y=20 300×400 mm');
  await sheetWrapper.scrollIntoViewIfNeeded();
  const drawing = sheetWrapper.getByRole('img');
  await expect(drawing.locator('rect[fill^="url(#defect-"]')).toBeVisible();

  await zone.getByRole('button', { name: `Edit ${materialKey}` }).click();
  await dimensions.nth(2).fill('350');
  await defectPanel.getByRole('button', { name: 'Save' }).click();
  await expect(zone).toContainText('x=12 y=20 350×400 mm');

  await zone.getByRole('button', { name: `Remove zone ${materialKey}` }).click();
  await expect(zone).toHaveCount(0);
  await sheetWrapper.scrollIntoViewIfNeeded();
  await expect(drawing.locator('rect[fill^="url(#defect-"]')).toHaveCount(0);
});

test('offcuts can be saved to and removed from the catalog', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+3');

  const saveButton = page.getByRole('button', { name: 'Save to offcut catalog' }).first();
  await expect(saveButton).toBeVisible({ timeout: 30_000 });
  await saveButton.click();
  await expect(page.getByText('Saved offcut catalog (1)')).toBeVisible();

  await page.getByRole('button', { name: 'Remove from catalog' }).click();
  await expect(page.getByText('Saved offcut catalog (1)')).toHaveCount(0);
});

test('bulk material replacement updates the active cabinet', async ({ appPage: page }) => {
  await page.keyboard.press('Alt+3');
  await page.getByRole('button', { name: 'Bulk Material Replace' }).click();

  const dialog = page.getByRole('dialog', { name: 'Bulk Material Replace' });
  const fromSelect = dialog.getByLabel('Replace');
  const toSelect = dialog.getByLabel('With');
  const sourceMaterial = await fromSelect.inputValue();
  const targetOption = toSelect.locator('option').first();
  const targetMaterial = await targetOption.getAttribute('value');
  if (!targetMaterial) throw new Error('Expected a target material option.');
  await toSelect.selectOption(targetMaterial);
  await dialog.getByRole('button', { name: 'Apply to All' }).click();
  await expect(dialog.getByText('Done! Use Ctrl+Z to undo.')).toBeVisible();

  await page.keyboard.press('Alt+1');
  const carcassMaterial = page.getByRole('combobox', { name: 'Carcass Material' });
  expect(sourceMaterial).not.toBe(targetMaterial);
  await expect(carcassMaterial).toHaveValue(targetMaterial);
});

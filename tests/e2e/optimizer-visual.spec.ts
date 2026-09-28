import { test, expect } from './fixtures/app';

// Sprint 105 — smoke test for the optimizer view's new yield bars and hint
// banners introduced in Sprint A3 p2. Keeping this as a behavioral test
// rather than a pixel-snapshot test so it stays stable across OS font
// rendering and Chromium upgrades.

test('optimizer view exposes a yield meter for at least one sheet', async ({ appPage: page }) => {
  test.setTimeout(60_000);
  await expect(page.getByRole('tablist')).toBeVisible();
  await page.keyboard.press('Alt+3');
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

  const valueNow = await meter.getAttribute('aria-valuenow');
  expect(valueNow).not.toBeNull();
  const n = Number(valueNow);
  expect(n).toBeGreaterThanOrEqual(0);
  expect(n).toBeLessThanOrEqual(100);
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

  const lockRotation = page.getByRole('button', { name: /^Lock rotation/ }).first();
  await lockRotation.click();
  const unlockRotation = page.getByRole('button', { name: /^Unlock rotation/ }).first();
  await expect(unlockRotation).toHaveAttribute('aria-pressed', 'true');
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
  await expect(partRows).toHaveCount(0);

  await partsSearch.clear();
  const materialFilter = page.getByRole('combobox', { name: 'Filter by material' });
  await expect.poll(() => materialFilter.locator('option').count()).toBeGreaterThan(1);
  await materialFilter.selectOption({ index: 1 });
  const selectedMaterial = await materialFilter.locator('option:checked').innerText();
  await expect(partRows.first().locator('td').nth(3)).toHaveText(selectedMaterial);

  await expect(hardwareRows.first()).toBeVisible();
  const hardwareName = (await hardwareRows.first().locator('td').first().innerText()).trim();
  await hardwareSearch.fill(hardwareName);
  await expect(hardwareRows).toHaveCount(1);
  await expect(hardwareRows.first()).toContainText(hardwareName);
  await hardwareSearch.fill('no matching hardware');
  await expect(hardwareRows).toHaveCount(0);
  await hardwareSearch.clear();

  const quantityHeader = hardwareTable.getByRole('columnheader', { name: 'Qty' });
  await quantityHeader.getByRole('button').click();
  await expect(quantityHeader).toHaveAttribute('aria-sort', 'ascending');
  await quantityHeader.getByRole('button').click();
  await expect(quantityHeader).toHaveAttribute('aria-sort', 'descending');
});

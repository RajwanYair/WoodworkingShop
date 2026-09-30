import { expect, test } from './fixtures/app';

test.setTimeout(60_000);

async function showOptimizer(page: import('@playwright/test').Page) {
  await page.keyboard.press('Alt+3');
  const wrapper = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(wrapper).toBeVisible({ timeout: 30_000 });
  await wrapper.scrollIntoViewIfNeeded();
}

async function openPartLabels(page: import('@playwright/test').Page) {
  await showOptimizer(page);
  const toggle = page.getByRole('button', { name: /Part Label Sheet/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  return page.getByRole('list', { name: 'Part label cards' });
}

async function printLabels(page: import('@playwright/test').Page) {
  const list = await openPartLabels(page);
  const visibleLabels = (await list.getByRole('listitem').allTextContents()).map((text) => text.match(/P-\d{3}/)?.[0]);
  const popupPromise = page.waitForEvent('popup').then(async (popup) => {
    await popup.evaluate(() => {
      window.print = () => {};
    });
    return popup;
  });
  await page.getByRole('button', { name: 'Print Labels' }).click({ noWaitAfter: true });
  const popup = await popupPromise;
  await expect(popup.locator('.label').first()).toBeVisible();
  return { list, popup, visibleLabels };
}

test('label sheet starts collapsed and can be opened and closed', async ({ appPage: page }) => {
  await showOptimizer(page);
  const toggle = page.getByRole('button', { name: /Part Label Sheet/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('list', { name: 'Part label cards' })).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('list', { name: 'Part label cards' })).toHaveCount(0);
});

test('label preview uses a named semantic list', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  await expect(list).toBeVisible();
  await expect(list.getByRole('listitem').first()).toBeVisible();
});

test('label count badge matches the number of grouped part cards', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  const count = await list.getByRole('listitem').count();
  await expect(page.getByRole('button', { name: new RegExp(`Part Label Sheet ${count}`) })).toBeVisible();
});

test('grouped labels use unique sequential P-NNN identifiers starting at P-001', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  const identifiers = await list.locator('li > span:first-child').allTextContents();
  expect(identifiers.length).toBeGreaterThan(0);
  expect(identifiers.every((identifier) => /^P-\d{3}$/.test(identifier))).toBe(true);
  expect(new Set(identifiers).size).toBe(identifiers.length);
  expect(identifiers[0]).toBe('P-001');
  expect(identifiers.map((label) => Number(label.slice(2)))).toEqual(identifiers.map((_, index) => index + 1));
});

test('each label card presents a name, dimensions and material', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  const names = await list.locator('li > span:nth-child(2)').allTextContents();
  const dimensions = await list.locator('li > span:nth-child(3)').allTextContents();
  const materials = await list.locator('li > span:nth-child(4)').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  expect(names.every((name) => name.trim().length > 0)).toBe(true);
  expect(dimensions.every((value) => /^\d+\s*×\s*\d+$/.test(value.trim()))).toBe(true);
  expect(materials.length).toBe(names.length);
  expect(materials.every((material) => material.trim().length > 0)).toBe(true);
});

test('grouped quantity badges appear when a part quantity exceeds one', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  const cardTexts = await list.getByRole('listitem').allTextContents();
  expect(cardTexts.some((text) => /×\d+/.test(text))).toBe(true);
});

test('quantity expansion control starts unchecked', async ({ appPage: page }) => {
  await openPartLabels(page);
  await expect(page.getByRole('checkbox', { name: 'Expand multi-qty parts (one label per piece)' })).not.toBeChecked();
});

test('quantity expansion produces one card per physical part', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  const cards = list.getByRole('listitem');
  const groupedCount = await cards.count();
  await page.getByRole('checkbox', { name: 'Expand multi-qty parts (one label per piece)' }).check();
  expect(await cards.count()).toBeGreaterThan(groupedCount);
});

test('expanded multi-quantity labels carry alphabetic piece suffixes', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  await page.getByRole('checkbox', { name: 'Expand multi-qty parts (one label per piece)' }).check();
  const identifiers = await list.locator('li > span:first-child').allTextContents();
  expect(identifiers.some((identifier) => /^P-\d{3}[a-z]$/.test(identifier))).toBe(true);
});

test('expanded piece labels remain unique', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  await page.getByRole('checkbox', { name: 'Expand multi-qty parts (one label per piece)' }).check();
  const identifiers = await list.locator('li > span:first-child').allTextContents();
  expect(new Set(identifiers).size).toBe(identifiers.length);
});

test('expanded piece cards do not display grouped quantity badges', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  await page.getByRole('checkbox', { name: 'Expand multi-qty parts (one label per piece)' }).check();
  const badges = list.locator('li > span:nth-child(5)');
  await expect(badges).toHaveCount(0);
});

test('collapsing quantity expansion restores the original grouped card count', async ({ appPage: page }) => {
  const list = await openPartLabels(page);
  const cards = list.getByRole('listitem');
  const groupedCount = await cards.count();
  const expand = page.getByRole('checkbox', { name: 'Expand multi-qty parts (one label per piece)' });
  await expand.check();
  await expand.uncheck();
  await expect(cards).toHaveCount(groupedCount);
});

test('print action is available when labels exist', async ({ appPage: page }) => {
  await openPartLabels(page);
  await expect(page.getByRole('button', { name: 'Print Labels' })).toBeEnabled();
});

test('print popup uses the translated part-label title', async ({ appPage: page }) => {
  const { popup } = await printLabels(page);
  await expect(popup).toHaveTitle('Part Labels');
});

test('print popup declares UTF-8 document encoding', async ({ appPage: page }) => {
  const { popup } = await printLabels(page);
  await expect(popup.locator('meta[charset="utf-8"]')).toHaveCount(1);
});

test('print popup preserves the preview label count', async ({ appPage: page }) => {
  const { popup, visibleLabels } = await printLabels(page);
  const printedLabels = await popup.locator('.label').allTextContents();
  expect(printedLabels.length).toBe(visibleLabels.length);
});

test('print popup preserves label identifiers and ordering', async ({ appPage: page }) => {
  const { popup, visibleLabels } = await printLabels(page);
  const printedLabels = await popup.locator('.label').allTextContents();
  expect(printedLabels.map((text) => text.match(/P-\d{3}/)?.[0])).toEqual(visibleLabels);
});

test('print popup contains each preview part name', async ({ appPage: page }) => {
  const { list, popup } = await printLabels(page);
  const names = await list.locator('li > span:nth-child(2)').allTextContents();
  const printText = await popup.locator('.label').allTextContents();
  expect(names.every((name) => printText.some((text) => text.includes(name)))).toBe(true);
});

test('print popup preserves part dimensions and material identifiers', async ({ appPage: page }) => {
  const { list, popup } = await printLabels(page);
  const details = await list
    .locator('li')
    .evaluateAll((cards) =>
      cards.map((card) => [
        card.querySelector('span:nth-child(3)')?.textContent,
        card.querySelector('span:nth-child(4)')?.textContent,
      ]),
    );
  const printText = await popup.locator('.label').allTextContents();
  const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();
  expect(
    details.every(([dimensions, material]) =>
      printText.some(
        (text) =>
          normalizeWhitespace(text).includes(normalizeWhitespace(dimensions ?? '')) &&
          normalizeWhitespace(text).includes(normalizeWhitespace(material ?? '')),
      ),
    ),
  ).toBe(true);
});

test('print popup requests A4 portrait with 8 mm margins', async ({ appPage: page }) => {
  const { popup } = await printLabels(page);
  const printCss = await popup.locator('style').textContent();
  expect(printCss).toContain('@page{size:A4 portrait;margin:8mm}');
});

test('print popup lays labels out in three responsive columns', async ({ appPage: page }) => {
  const { popup } = await printLabels(page);
  const printCss = await popup.locator('style').textContent();
  expect(printCss).toContain('grid-template-columns:repeat(3,minmax(0,1fr))');
  expect(await popup.locator('main.label-grid').count()).toBe(1);
});

test('print popup prevents label cards from splitting across pages', async ({ appPage: page }) => {
  const { popup } = await printLabels(page);
  const printCss = await popup.locator('style').textContent();
  expect(printCss).toContain('break-inside:avoid');
  expect(printCss).toContain('page-break-inside:avoid');
});

test('print popup assigns stable minimum height and flexible width to each card', async ({ appPage: page }) => {
  const { popup } = await printLabels(page);
  const printCss = await popup.locator('style').textContent();
  expect(printCss).toContain('min-height:30mm');
  expect(printCss).toContain('min-width:0');
  expect(printCss).toContain('overflow-wrap:anywhere');
});

test('print popup contains one card for every source label', async ({ appPage: page }) => {
  const { list, popup } = await printLabels(page);
  await expect(popup.locator('.label')).toHaveCount(await list.getByRole('listitem').count());
});

test('print popup includes a main printable region', async ({ appPage: page }) => {
  const { popup } = await printLabels(page);
  await expect(popup.locator('main.label-grid')).toBeVisible();
  await expect(popup.locator('main.label-grid .label').first()).toBeVisible();

  const printCss = await popup.locator('style').textContent();
  expect(printCss).toContain('@page{size:A4 portrait;margin:8mm}');
  expect(printCss).toContain('grid-template-columns:repeat(3,minmax(0,1fr))');
  expect(printCss).toContain('break-inside:avoid');
  expect(printCss).toContain('page-break-inside:avoid');
  expect(await popup.locator('main.label-grid').count()).toBe(1);
});

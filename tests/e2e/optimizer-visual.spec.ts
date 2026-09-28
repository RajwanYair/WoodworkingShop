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

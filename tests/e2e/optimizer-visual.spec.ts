import { test, expect } from '@playwright/test';

// Sprint 105 — smoke test for the optimizer view's new yield bars and hint
// banners introduced in Sprint A3 p2. Keeping this as a behavioral test
// rather than a pixel-snapshot test so it stays stable across OS font
// rendering and Chromium upgrades.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('onboarding-seen', '1');
    } catch {
      /* noop */
    }
  });
});

test('optimizer view exposes a yield meter for at least one sheet', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();
  await page.keyboard.press('Alt+3');
  // OptimizerView is lazy-loaded; wait for the chunk and the rendered meter.
  // Use attribute selector to avoid ARIA-role lookup quirks in headless browsers.
  const meter = page.locator('[role="meter"]').first();
  await expect(meter).toBeVisible({ timeout: 20_000 });

  const valueNow = await meter.getAttribute('aria-valuenow');
  expect(valueNow).not.toBeNull();
  const n = Number(valueNow);
  expect(n).toBeGreaterThanOrEqual(0);
  expect(n).toBeLessThanOrEqual(100);
});

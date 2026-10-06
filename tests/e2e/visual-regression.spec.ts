/**
 * Visual regression tests for key Cabinet Planner views.
 *
 * On first run (no baseline snapshots), Playwright creates reference images
 * in `tests/e2e/__screenshots__/`. Subsequent runs compare against those
 * baselines with a 5 % pixel diff threshold to handle font rendering
 * differences across OS/CI environments.
 *
 * Run to update baselines:
 *   npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots
 */
import { test, expect } from './fixtures/app';

test('configurator tab — default view screenshot @visual', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  await expect(page.getByRole('slider').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot('configurator-default.png', {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  });
});

test('preview tab — cabinet SVG screenshot @visual', async ({ appPage: page }) => {
  // Navigate to Preview (Alt+2) and wait for the SVG to render.
  await page.keyboard.press('Alt+2');
  await expect(page.getByRole('main').getByRole('img').first()).toBeVisible({ timeout: 8_000 });
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot('preview-tab.png', {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  });
});

test('optimizer tab — cut sheets screenshot @visual', async ({ appPage: page }) => {
  // Navigate to Optimizer (Alt+3).
  await page.keyboard.press('Alt+3');
  await expect(page.getByRole('heading', { name: 'Parts List' })).toBeVisible({ timeout: 8_000 });
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot('optimizer-tab.png', {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  });
});

test('dark mode toggle — header appearance @visual', async ({ appPage: page }) => {
  // Activate dark mode via Alt+D shortcut.
  await page.keyboard.press('Alt+d');
  await expect(page.getByRole('banner').getByRole('button', { name: 'Light mode' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByRole('banner')).toHaveScreenshot('header-dark-mode.png', {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  });
});

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
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Dismiss onboarding overlay so screenshots are deterministic.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('onboarding-seen', '1');
    } catch {
      /* storage may be unavailable */
    }
  });
});

test('configurator tab — default view screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Ensure the configurator panel is visible before snapping.
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('slider').first()).toBeVisible();

  await expect(page).toHaveScreenshot('configurator-default.png', {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  });
});

test('preview tab — cabinet SVG screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Navigate to Preview (Alt+2) and wait for the SVG to render.
  await page.keyboard.press('Alt+2');
  await expect(page.locator('[role="main"] svg[role="img"]').first()).toBeVisible({ timeout: 8_000 });

  await expect(page).toHaveScreenshot('preview-tab.png', {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  });
});

test('optimizer tab — cut sheets screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Navigate to Optimizer (Alt+3).
  await page.keyboard.press('Alt+3');
  // Wait for the optimizer content area to appear.
  await expect(page.locator('[role="main"]')).toBeVisible({ timeout: 8_000 });

  await expect(page).toHaveScreenshot('optimizer-tab.png', {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  });
});

test('dark mode toggle — header appearance', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Activate dark mode via Alt+D shortcut.
  await page.keyboard.press('Alt+d');
  // Give Tailwind dark-mode class time to apply.
  await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 3_000 });

  await expect(page.getByRole('banner')).toHaveScreenshot('header-dark-mode.png', {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  });
});

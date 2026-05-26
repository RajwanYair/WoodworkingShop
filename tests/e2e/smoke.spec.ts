import { test, expect } from '@playwright/test';

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  // Pre-dismiss overlays before any app code runs.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('onboarding-seen', '1');
      localStorage.setItem('woodworkingshop:preview-toured', '1');
    } catch {
      /* storage may be unavailable on about:blank */
    }
  });
});

test.afterEach(() => {
  // Allow the i18next promo banner (printed via console.log, not error).
  const real = consoleErrors.filter((e) => !/locize/i.test(e));
  expect(real, `Console errors:\n${real.join('\n')}`).toEqual([]);
});

test('app boots and renders header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page).toHaveTitle(/cabinet|wood/i);
});

test('configurator tab is reachable and renders dimension controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();
  // At least one dimension slider must be on the page.
  await expect(page.getByRole('slider').first()).toBeVisible();
});

test('keyboard shortcut Alt+2 switches to preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();
  await page.keyboard.press('Alt+2');
  // Preview tab content exposes the cabinet drawing SVG (role="img").
  // Avoid locator('svg').first() which can resolve to aria-hidden icon SVGs.
  await expect(page.locator('[role="main"] svg[role="img"]').first()).toBeVisible({ timeout: 5_000 });
});

test('PWA service worker registers', async ({ page }) => {
  await page.goto('/');
  // Registration happens inside a load-event listener; poll for activation.
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          if (!('serviceWorker' in navigator)) return false;
          const reg = await navigator.serviceWorker.getRegistration();
          return !!reg;
        }),
      { timeout: 15_000, intervals: [200, 500, 1000] },
    )
    .toBe(true);
});

test('PDF panel renders generate button and content summary', async ({ page }) => {
  await page.goto('/');
  // Switch to the PDF tab explicitly to avoid focus/timing variance in CI.
  await page.getByRole('tab', { name: /pdf/i }).click();
  // The lazy-loaded PDF panel includes @react-pdf/renderer (~1.6 MB); give it
  // extra time to resolve on CI where Vite serves every sub-module individually.
  const heading = page.getByRole('heading', { name: /^export pdf$/i });
  await expect(heading).toBeVisible({ timeout: 30_000 });
  // Generate button must be enabled (not in generating state).
  const generateBtn = page.getByRole('button', { name: /generate pdf/i });
  await expect(generateBtn).toBeEnabled();
  // Content summary list items — use getByRole('listitem') to avoid matching the
  // description paragraph which also contains "parts list" and "cut sheet"
  // (strict-mode violation when two elements resolve to the same locator).
  await expect(page.getByRole('listitem').filter({ hasText: /parts list/i })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: /cut sheet/i })).toBeVisible();
});

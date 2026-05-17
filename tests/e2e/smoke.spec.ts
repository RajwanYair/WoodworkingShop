import { test, expect } from '@playwright/test';

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  // Pre-dismiss the onboarding overlay before any app code runs.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('onboarding-seen', '1');
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
  // Preview tab content should now expose at least one <svg>.
  await expect(page.locator('svg').first()).toBeVisible();
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

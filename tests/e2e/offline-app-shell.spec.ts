import { expect, test } from './fixtures/app';

test('reloads the cached app shell after the network is unavailable', async ({ appPage: page }) => {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          if (!('serviceWorker' in navigator)) return false;
          const registration = await navigator.serviceWorker.ready;
          return registration.active !== null;
        }),
      { timeout: 15_000, intervals: [200, 500, 1000] },
    )
    .toBe(true);

  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });
  await page.context().setOffline(true);
  await page.reload();

  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('tablist')).toBeVisible();
});

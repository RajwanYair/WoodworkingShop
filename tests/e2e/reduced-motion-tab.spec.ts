import { expect, test } from './fixtures/app';

test('changes tabs without starting a view transition when reduced motion is active', async ({ appPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(true);

  await page.evaluate(() => {
    document.documentElement.dataset.viewTransitionCalls = '0';
    Reflect.set(document, 'startViewTransition', (update: () => void) => {
      const calls = Number(document.documentElement.dataset.viewTransitionCalls ?? '0') + 1;
      document.documentElement.dataset.viewTransitionCalls = String(calls);
      update();
    });
  });

  const configureTab = page.getByRole('tab', { name: 'Configure' });
  await configureTab.click();
  await expect(configureTab).toHaveAttribute('aria-selected', 'true');

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.viewTransitionCalls)).toBe('0');
});

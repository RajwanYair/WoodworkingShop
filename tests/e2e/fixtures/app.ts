import { expect, test as base, type Page } from '@playwright/test';

type AppFixtures = {
  appPage: Page;
};

export const test = base.extend<AppFixtures>({
  appPage: async ({ page }, use) => {
    await page.clock.setFixedTime(new Date('2026-09-28T12:00:00.000Z'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const initialized = sessionStorage.getItem('woodworkingshop:e2e-initialized') === '1';
      if (!initialized) {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('onboarding-seen', '1');
        localStorage.setItem('woodworkingshop:preview-toured', '1');
        sessionStorage.setItem('woodworkingshop:e2e-initialized', '1');
      }
    });
    await page.goto('./');
    await expect(page.getByRole('banner')).toBeVisible();
    await use(page);
  },
});

export { expect };

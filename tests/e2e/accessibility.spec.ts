/**
 * Accessibility E2E tests using @axe-core/playwright (v4.13.0)
 *
 * Runs axe-core against the main application routes and verifies there are
 * no WCAG 2.2 Level AA violations. Failures here mean real user-facing
 * accessibility regressions that must be fixed before merging.
 */

import { test, expect } from './fixtures/app';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('homepage passes axe WCAG 2.2 AA checks', async ({ appPage: page }) => {
  test.setTimeout(60_000);
  // Wait for the app to fully render (header must be present).
  await expect(page.getByRole('banner')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const violations = results.violations;

  // Report violations clearly before failing
  if (violations.length > 0) {
    const summary = violations
      .map(
        (v) =>
          `[${v.impact?.toUpperCase() ?? 'UNKNOWN'}] ${v.id}: ${v.description}\n` +
          v.nodes.map((n) => `  → ${n.html}`).join('\n'),
      )
      .join('\n\n');
    console.error(`\n=== axe Violations ===\n${summary}\n`);
  }

  expect(violations, `Found ${violations.length} accessibility violation(s)`).toHaveLength(0);
});

test('configurator tab passes axe WCAG 2.2 AA checks', async ({ appPage: page }) => {
  test.setTimeout(60_000);
  await expect(page.getByRole('tablist')).toBeVisible();

  await page.getByRole('tab', { name: 'Configure' }).click();

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const violations = results.violations;

  expect(violations, `Found ${violations.length} accessibility violation(s) in configurator`).toHaveLength(0);
});

test('first-visit mobile navigation and onboarding pass axe WCAG 2.2 AA checks', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.removeItem('onboarding-seen');
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
      configurable: true,
      get: () => 1,
    });
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      const mediaQueryList = nativeMatchMedia(query);
      if (query === '(pointer: coarse)') Object.defineProperty(mediaQueryList, 'matches', { value: true });
      return mediaQueryList;
    };
  });
  await page.goto('./');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  expect(
    results.violations,
    `Found ${results.violations.length} first-visit mobile accessibility violation(s)`,
  ).toHaveLength(0);

  await page.getByRole('dialog', { name: 'Configure your cabinet' }).getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('dialog', { name: 'Configure your cabinet' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Touch Gestures' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

const locales = [
  { code: 'en', direction: 'ltr' },
  { code: 'he', direction: 'rtl' },
  { code: 'ar', direction: 'rtl' },
  { code: 'de', direction: 'ltr' },
  { code: 'es', direction: 'ltr' },
  { code: 'fr', direction: 'ltr' },
] as const;

for (const locale of locales) {
  test(`primary tabs pass axe WCAG 2.2 AA in ${locale.code} across themes @a11y-matrix`, async ({
    appPage: page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'The full accessibility matrix runs in Chromium.');
    test.setTimeout(60_000);

    const themes = ['light', 'dark'] as const;
    const languageSelect = page.getByRole('banner').getByRole('combobox').first();
    const themeButton = page.getByRole('banner').getByRole('button', { name: /^(Dark mode|Light mode)$/ });
    const primaryTabs = page.getByRole('tablist', { name: 'Main navigation' }).getByRole('tab');

    await languageSelect.selectOption(locale.code);
    await expect(page.locator('html')).toHaveAttribute('dir', locale.direction);

    for (const theme of themes) {
      const themeAction = await themeButton.getAttribute('aria-label');
      if ((theme === 'dark' && themeAction === 'Dark mode') || (theme === 'light' && themeAction === 'Light mode')) {
        await themeButton.click();
      }
      await expect(themeButton).toHaveAttribute('aria-label', theme === 'dark' ? 'Light mode' : 'Dark mode');

      for (let index = 0; index < (await primaryTabs.count()); index += 1) {
        const tab = primaryTabs.nth(index);
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible({
          timeout: index === 5 ? 30_000 : 5_000,
        });

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        const summary = results.violations
          .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
          .join('\n');

        expect(results.violations, `${locale.code}/${theme}/tab ${index}:\n${summary}`).toHaveLength(0);
      }
    }
  });
}

test('shortcuts, project import errors, and G-code export dialog pass axe WCAG 2.2 AA', async ({ appPage: page }) => {
  test.setTimeout(60_000);

  const expectAccessibleState = async (state: string) => {
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('.animate-fade-in')).every(
        (element) => getComputedStyle(element).opacity === '1',
      ),
    );
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const summary = results.violations
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
      .join('\n');
    expect(results.violations, `${state}:\n${summary}`).toHaveLength(0);
  };

  const shortcutsButton = page.getByRole('button', { name: 'Keyboard shortcuts' });
  await shortcutsButton.click();
  await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();
  await expectAccessibleState('keyboard shortcuts dialog');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Project Manager' }).click();
  const projectDialog = page.getByRole('dialog', { name: 'Project Manager' });
  await expect(projectDialog).toBeVisible();
  await expectAccessibleState('project manager dialog');
  await projectDialog.getByLabel('Import JSON').setInputFiles({
    name: 'corrupt.cabinet-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ invalid json'),
  });
  await expect(page.getByText('Invalid project file')).toBeVisible();
  await expectAccessibleState('project import error');
  await projectDialog.getByText('Close', { exact: true }).click();

  await page.keyboard.press('Alt+3');
  await expect(page.getByRole('status').filter({ hasText: 'Optimization complete' })).toBeAttached();
  const sheetWrapper = page.locator('[data-testid="virtual-sheet-wrapper"]').first();
  await expect(sheetWrapper).toBeVisible({ timeout: 30_000 });
  await sheetWrapper.scrollIntoViewIfNeeded();
  const gcodeButton = page.getByRole('button', { name: /Preview G-code for sheet/ }).first();
  await expect(gcodeButton).toBeVisible({ timeout: 20_000 });
  await gcodeButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectAccessibleState('G-code export preview dialog');
});

test('command palette opens with Ctrl+K, passes axe, and restores focus on Escape', async ({ appPage: page }) => {
  const activeTab = page.getByRole('tab', { name: 'Workspace' });
  await activeTab.focus();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', { name: 'Search commands' });
  await expect(search).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, 'command palette').toHaveLength(0);

  await search.fill('preview');
  await expect(page.getByRole('option', { name: /Preview/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  await expect(activeTab).toBeFocused();
});

test('optimizer loading and error recovery states pass axe WCAG 2.2 AA', async ({ appPage: page }) => {
  test.setTimeout(60_000);

  let signalOptimizerChunkRequested: (() => void) | undefined;
  let releaseOptimizerChunk: (() => void) | undefined;
  const optimizerChunkRequested = new Promise<void>((resolve) => {
    signalOptimizerChunkRequested = resolve;
  });

  await page.route('**/assets/OptimizerView-*.js', async (route) => {
    signalOptimizerChunkRequested?.();
    await new Promise<void>((resolve) => {
      releaseOptimizerChunk = resolve;
    });
    await route.abort();
  });

  await page.keyboard.press('Alt+3');
  await optimizerChunkRequested;
  await expect(page.getByTestId('skeleton-pane')).toBeVisible();

  const scanState = async (state: string) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const summary = results.violations
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
      .join('\n');
    expect(results.violations, `${state}:\n${summary}`).toHaveLength(0);
  };

  await scanState('optimizer loading state');
  releaseOptimizerChunk?.();
  await expect(page.getByRole('alert')).toContainText(/failed to render/i);
  await scanState('optimizer error recovery state');
});

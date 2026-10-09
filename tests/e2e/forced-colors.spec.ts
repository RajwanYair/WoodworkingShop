import { expect, test } from './fixtures/app';

test('preserves system colors and visible keyboard focus in forced-colors mode', async ({
  appPage: page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Forced-colors emulation is verified in Chromium.');

  await page.emulateMedia({ forcedColors: 'active' });

  await expect.poll(() => page.evaluate(() => window.matchMedia('(forced-colors: active)').matches)).toBe(true);

  const systemTokens = await page.evaluate(() => {
    const styles = window.getComputedStyle(document.documentElement);
    return {
      canvas: styles.getPropertyValue('--wood-50').trim(),
      canvasText: styles.getPropertyValue('--wood-900').trim(),
    };
  });
  expect(systemTokens).toEqual({ canvas: 'Canvas', canvasText: 'CanvasText' });

  const workspaceTab = page.getByRole('tab', { name: 'Workspace' });
  const buttonBorder = await workspaceTab.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return { width: styles.borderTopWidth, style: styles.borderTopStyle };
  });
  expect(buttonBorder).toEqual({ width: '2px', style: 'solid' });

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  const hasVisibleFocusIndicator = await skipLink.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return (styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px') || styles.boxShadow !== 'none';
  });
  expect(hasVisibleFocusIndicator).toBe(true);
});

import { expect, test } from './fixtures/app';

const views = ['Front (Closed)', 'Front (Open)', 'Side', 'Top', 'Back', '3D'] as const;

test('preview stays within the viewport and renders all views @preview-acceptance', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  const tabList = page.getByRole('tablist', { name: 'Cabinet view selector' });
  const viewTabs = tabList.getByRole('tab');
  const dimensionsToggle = page.getByRole('checkbox', { name: 'Dimensions' });

  for (const [index, label] of views.entries()) {
    const viewTab = viewTabs.nth(index);
    await viewTab.click();
    await expect(viewTab).toHaveAttribute('aria-selected', 'true');
    const drawing =
      label === '3D'
        ? page.getByRole('img', { name: '3D isometric cabinet drawing' })
        : page.getByRole('group', { name: 'Cabinet drawing' });
    await expect(drawing).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

    await dimensionsToggle.uncheck();
    await dimensionsToggle.check();
  }

  if (page.viewportSize()!.width <= 768) {
    await expect(page.getByRole('navigation', { name: 'Tab navigation' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Tab navigation' }).getByRole('button', { name: 'Configure' }).click();
    await expect(page.getByRole('tab', { name: 'Configure' })).toHaveAttribute('aria-selected', 'true');
  }
});

test('six preview views match canonical cabinet and bookshelf theme/RTL baselines @preview-acceptance', async ({
  appPage: page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Visual baselines are canonical in Chromium.');

  const scenarios = [
    { name: 'cabinet-light-ltr', furniture: 'Cabinet', language: 'en', dark: false },
    { name: 'cabinet-dark-ltr', furniture: 'Cabinet', language: 'en', dark: true },
    { name: 'bookshelf-light-rtl', furniture: 'Bookshelf', language: 'he', dark: false },
    { name: 'bookshelf-dark-rtl', furniture: 'Bookshelf', language: 'he', dark: true },
  ] as const;
  const mainTabs = page.getByRole('tablist', { name: 'Main navigation' }).getByRole('tab');

  for (const scenario of scenarios) {
    await mainTabs.nth(1).click();
    if (scenario.furniture === 'Bookshelf') {
      await page.locator('input[name="furnitureType"][value="bookshelf"]').check({ force: true });
    }

    const languageSelect = page.locator('header').getByRole('combobox').first();
    await languageSelect.selectOption(scenario.language);
    await expect(page.locator('html')).toHaveAttribute('dir', scenario.language === 'he' ? 'rtl' : 'ltr');

    const currentThemeControl = page.getByRole('banner').getByRole('button', { name: /^(Dark mode|Light mode)$/ });
    const currentThemeLabel = await currentThemeControl.getAttribute('aria-label');
    if (scenario.dark && currentThemeLabel === 'Dark mode') {
      await currentThemeControl.click();
    } else if (!scenario.dark && currentThemeLabel === 'Light mode') {
      await currentThemeControl.click();
    }
    await expect(
      page.getByRole('banner').getByRole('button', { name: scenario.dark ? 'Light mode' : 'Dark mode' }),
    ).toBeVisible();

    await mainTabs.nth(2).click();
    await page.evaluate(() => document.fonts.ready);
    const tabList = page.getByRole('tablist', { name: 'Cabinet view selector' });

    for (const [index, view] of views.entries()) {
      await tabList.getByRole('tab').nth(index).click();
      const drawing =
        view === '3D'
          ? page.getByRole('img', { name: '3D isometric cabinet drawing' })
          : page.getByRole('group', { name: 'Cabinet drawing' });
      await expect(drawing).toBeVisible();
      await expect(drawing).toHaveScreenshot(`preview-${scenario.name}-${index}.png`, {
        animations: 'disabled',
      });
    }
  }
});

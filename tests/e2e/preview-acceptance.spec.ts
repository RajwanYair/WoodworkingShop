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

    if (index === 0) {
      await dimensionsToggle.uncheck();
      await dimensionsToggle.check();
    }
  }

  if (page.viewportSize()!.width <= 768) {
    await expect(page.getByRole('navigation', { name: 'Tab navigation' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Tab navigation' }).getByRole('button', { name: 'Configure' }).click();
    await expect(page.getByRole('tab', { name: 'Configure' })).toHaveAttribute('aria-selected', 'true');
  }
});

test('preview remains reachable without horizontal overflow across the responsive width matrix', async ({
  appPage: page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Responsive width matrix runs in Chromium.');

  const languageSelect = page.getByRole('banner').getByRole('combobox').first();
  const widths = [320, 375, 768, 1024, 1440];
  const scenarios = [
    { locale: 'en', direction: 'ltr' },
    { locale: 'he', direction: 'rtl' },
  ] as const;

  await page.getByRole('tab', { name: 'Preview' }).click();

  for (const scenario of scenarios) {
    await languageSelect.selectOption(scenario.locale);
    await expect(page.locator('html')).toHaveAttribute('dir', scenario.direction);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });

      const dimensions = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.documentWidth, `${scenario.locale} at ${width}px`).toBeLessThanOrEqual(
        dimensions.viewportWidth,
      );

      const viewTabs = page.getByRole('tablist', { name: 'Cabinet view selector' }).getByRole('tab');
      await expect(viewTabs.first()).toBeVisible();
      await viewTabs.first().click();
      await expect(viewTabs.first()).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('group', { name: 'Cabinet drawing' })).toBeVisible();

      if (width <= 768) {
        const mobileNavigation = page.getByRole('navigation');
        await expect(mobileNavigation).toBeVisible();
        await expect(mobileNavigation.getByRole('button').first()).toBeVisible();

        const buttonBounds = await mobileNavigation.getByRole('button').evaluateAll((buttons) =>
          buttons.map((button) => {
            const buttonRect = button.getBoundingClientRect();
            const labelRect = button.querySelector('span:last-child')?.getBoundingClientRect();

            return {
              left: buttonRect.left,
              right: buttonRect.right,
              labelLeft: labelRect?.left ?? Number.NaN,
              labelRight: labelRect?.right ?? Number.NaN,
            };
          }),
        );
        const orderedBounds = [...buttonBounds].sort((left, right) => left.left - right.left);

        expect(buttonBounds).toHaveLength(7);
        for (const [index, bounds] of orderedBounds.entries()) {
          expect(bounds.left, `${scenario.locale} at ${width}px: button left edge`).toBeGreaterThanOrEqual(0);
          expect(bounds.right, `${scenario.locale} at ${width}px: button right edge`).toBeLessThanOrEqual(width);
          expect(bounds.labelLeft, `${scenario.locale} at ${width}px: label left edge`).toBeGreaterThanOrEqual(
            bounds.left,
          );
          expect(bounds.labelRight, `${scenario.locale} at ${width}px: label right edge`).toBeLessThanOrEqual(
            bounds.right,
          );
          if (index > 0) {
            expect(bounds.left, `${scenario.locale} at ${width}px: overlapping mobile actions`).toBeGreaterThanOrEqual(
              orderedBounds[index - 1].right,
            );
          }
        }
      }
    }
  }
});

test('primary panel controls stay within the viewport without clipped text across widths in LTR and RTL @preview-acceptance', async ({
  appPage: page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Panel reachability matrix runs in Chromium.');
  test.setTimeout(60_000);

  const languageSelect = page.getByRole('banner').getByRole('combobox').first();
  const widths = [320, 375, 768, 1024, 1440];
  const scenarios = [
    { locale: 'en', direction: 'ltr' },
    { locale: 'he', direction: 'rtl' },
  ] as const;

  for (const scenario of scenarios) {
    await languageSelect.selectOption(scenario.locale);
    await expect(page.locator('html')).toHaveAttribute('dir', scenario.direction);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const primaryTabs = page.getByRole('tablist', { name: 'Main navigation' }).getByRole('tab');
      for (let index = 0; index < (await primaryTabs.count()); index += 1) {
        const tab = primaryTabs.nth(index);
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();

        const bounds = await page.getByRole('main').evaluate((main) => {
          const viewportWidth = document.documentElement.clientWidth;
          const controls = Array.from(
            main.querySelectorAll(
              'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="slider"], label',
            ),
          );
          const offscreenControls = controls
            .filter((element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 1 || rect.height <= 1) {
                return false;
              }

              for (
                let ancestor = element.parentElement;
                ancestor && ancestor !== main;
                ancestor = ancestor.parentElement
              ) {
                const overflowX = getComputedStyle(ancestor).overflowX;
                if (overflowX === 'auto' || overflowX === 'scroll') return false;
              }

              return rect.left < 0 || rect.right > viewportWidth;
            })
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return `${element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName}: ${Math.round(rect.left)}-${Math.round(rect.right)}`;
            });
          const clippedText = Array.from(main.querySelectorAll('*')).flatMap((element) => {
            const text = Array.from(element.childNodes)
              .filter((node) => node.nodeType === Node.TEXT_NODE)
              .map((node) => node.textContent?.trim() ?? '')
              .filter(Boolean)
              .join(' ');
            if (!text) return [];

            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 1 || rect.height <= 1) {
              return [];
            }

            for (
              let ancestor: Element | null = element;
              ancestor && ancestor !== main;
              ancestor = ancestor.parentElement
            ) {
              const ancestorStyle = getComputedStyle(ancestor);
              const clipsText =
                ['hidden', 'clip'].includes(ancestorStyle.overflowX) ||
                ['hidden', 'clip'].includes(ancestorStyle.overflowY) ||
                ancestorStyle.textOverflow === 'ellipsis' ||
                ancestorStyle.webkitLineClamp !== 'none';
              if (
                clipsText &&
                (ancestor.scrollWidth > ancestor.clientWidth + 1 || ancestor.scrollHeight > ancestor.clientHeight + 1)
              ) {
                return [`${text.slice(0, 80)} (${ancestor.tagName.toLowerCase()})`];
              }
            }

            return [];
          });
          const visibleActions = Array.from(main.querySelectorAll('button, a[href], [role="button"]')).flatMap(
            (element) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 1 || rect.height <= 1) {
                return [];
              }
              return [{ element, rect }];
            },
          );
          const overlappingActions = visibleActions.flatMap(({ element, rect }, index) =>
            visibleActions.slice(index + 1).flatMap(({ element: otherElement, rect: otherRect }) => {
              const overlapWidth = Math.min(rect.right, otherRect.right) - Math.max(rect.left, otherRect.left);
              const overlapHeight = Math.min(rect.bottom, otherRect.bottom) - Math.max(rect.top, otherRect.top);
              if (overlapWidth <= 1 || overlapHeight <= 1) return [];

              const name = (action: Element) =>
                action.getAttribute('aria-label') || action.textContent?.trim() || action.tagName;
              return [`${name(element)} overlaps ${name(otherElement)}`];
            }),
          );

          return {
            viewportWidth,
            documentWidth: document.documentElement.scrollWidth,
            offscreenControls,
            clippedText,
            overlappingActions,
          };
        });

        const tabName = (await tab.innerText()).replace(/\s+/g, ' ').trim();
        const scenarioName = `${scenario.locale} ${width}px ${tabName}`;
        expect(bounds.documentWidth, scenarioName).toBeLessThanOrEqual(bounds.viewportWidth);
        expect(bounds.offscreenControls, scenarioName).toEqual([]);
        expect(bounds.clippedText, scenarioName).toEqual([]);
        expect(bounds.overlappingActions, scenarioName).toEqual([]);
      }
    }
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

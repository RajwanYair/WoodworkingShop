import { test, expect } from './fixtures/app';

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
});

test.afterEach(() => {
  // Allow the i18next promo banner (printed via console.log, not error).
  const real = consoleErrors.filter((e) => !/locize/i.test(e));
  expect(real, `Console errors:\n${real.join('\n')}`).toEqual([]);
});

test('app boots and renders header', async ({ appPage: page }) => {
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page).toHaveTitle(/cabinet|wood/i);
});

test('configurator tab is reachable and renders dimension controls', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Cabinet 1/ })).toBeVisible();
  // At least one dimension slider must be on the page.
  await expect(page.getByRole('slider').first()).toBeVisible();
});

test('keyboard shortcut Alt+2 switches to preview', async ({ appPage: page }) => {
  await expect(page.getByRole('tablist')).toBeVisible();
  await page.keyboard.press('Alt+2');
  // Preview tab content exposes the cabinet drawing SVG (role="img").
  await expect(page.getByRole('main').getByRole('img').first()).toBeVisible({ timeout: 5_000 });
});

test('Alt shortcuts and tab clicks render their corresponding panels', async ({ appPage: page }) => {
  const journeys = [
    ['Alt+1', 'Configure', page.getByRole('spinbutton', { name: 'Width' })],
    ['Alt+2', 'Preview', page.getByRole('main').getByRole('img').first()],
    ['Alt+3', 'Cut Sheets', page.getByRole('heading', { name: 'Parts List' })],
    ['Alt+4', 'Assembly', page.getByRole('heading', { name: 'Assembly Guide' })],
    ['Alt+5', 'PDF', page.getByRole('heading', { name: /^export pdf$/i })],
    ['Alt+6', 'Calculators', page.getByRole('heading', { name: 'Calculators' })],
  ] as const;

  for (const [shortcut, tabName, panelContent] of journeys) {
    await page.keyboard.press(shortcut);
    const tab = page.getByRole('tab', { name: tabName });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(panelContent).toBeVisible({ timeout: tabName === 'PDF' ? 30_000 : 5_000 });

    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(panelContent).toBeVisible({ timeout: tabName === 'PDF' ? 30_000 : 5_000 });
  }
});

test('tab shortcuts do not interrupt editing a dimension', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  await configuratorTab.click();
  const dimensionInput = page.getByRole('spinbutton').first();
  await dimensionInput.focus();
  await dimensionInput.press('Alt+2');

  await expect(configuratorTab).toHaveAttribute('aria-selected', 'true');
});

test('tab navigation follows browser back and forward', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const previewTab = page.getByRole('tab', { name: 'Preview' });

  await configuratorTab.click();
  await previewTab.click();
  await expect(previewTab).toHaveAttribute('aria-selected', 'true');

  await page.goBack();
  await expect(configuratorTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('spinbutton', { name: 'Width' })).toBeVisible();

  await page.goForward();
  await expect(previewTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('main').getByRole('img').first()).toBeVisible();
});

test('direct tab URLs select and render each requested panel', async ({ appPage: page }) => {
  const journeys = [
    ['workspace', 'Workspace', page.getByRole('main').getByRole('heading', { name: 'Cabinet Planner' })],
    ['configurator', 'Configure', page.getByRole('spinbutton', { name: 'Width' })],
    ['preview', 'Preview', page.getByRole('main').getByRole('img').first()],
    ['optimizer', 'Cut Sheets', page.getByRole('heading', { name: 'Parts List' })],
    ['assembly', 'Assembly', page.getByRole('heading', { name: 'Assembly Guide' })],
    ['pdf', 'PDF', page.getByRole('heading', { name: /^export pdf$/i })],
    ['calculators', 'Calculators', page.getByRole('heading', { name: 'Calculators' })],
  ] as const;

  for (const [route, tabName, panelContent] of journeys) {
    await page.goto(`./?tab=${route}`);
    await expect(page.getByRole('tab', { name: tabName })).toHaveAttribute('aria-selected', 'true');
    await expect(panelContent).toBeVisible({ timeout: tabName === 'PDF' ? 30_000 : 5_000 });
  }
});

test('invalid tab URL falls back to the workspace tab', async ({ appPage: page }) => {
  await page.goto('./?tab=invalid-tab');

  await expect(page.getByRole('tab', { name: 'Workspace' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Cabinet Planner' })).toBeVisible();
  await expect(page).toHaveURL(/tab=workspace/);
});

test('undo and redo restore dimensions and generated parts', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const optimizerTab = page.getByRole('tab', { name: 'Cut Sheets' });
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  const topPanelRow = page.getByRole('row').filter({ hasText: 'Top Panel' });
  const topPanelLength = topPanelRow.getByRole('cell').nth(4);

  await configuratorTab.click();
  const originalWidth = await widthInput.inputValue();
  await optimizerTab.click();
  const originalPartLength = await topPanelLength.innerText();

  await configuratorTab.click();
  await widthInput.fill('800');
  await widthInput.press('Enter');
  await expect(widthInput).toHaveValue('800');
  await optimizerTab.click();
  const updatedPartLength = await topPanelLength.innerText();
  expect(updatedPartLength).not.toBe(originalPartLength);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(topPanelLength).toHaveText(originalPartLength);
  await configuratorTab.click();
  await expect(widthInput).toHaveValue(originalWidth);

  await page.keyboard.press('Control+Shift+z');
  await configuratorTab.click();
  await expect(widthInput).toHaveValue('800');
  await optimizerTab.click();
  await expect(topPanelLength).toHaveText(updatedPartLength);

  await page.keyboard.press('Control+z');
  await configuratorTab.click();
  await expect(widthInput).toHaveValue(originalWidth);
  await page.keyboard.press('Control+y');
  await expect(widthInput).toHaveValue('800');
  await optimizerTab.click();
  await expect(topPanelLength).toHaveText(updatedPartLength);
});

test('dimension controls synchronize values, generated parts, preview, limits, and reset', async ({
  appPage: page,
}) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const optimizerTab = page.getByRole('tab', { name: 'Cut Sheets' });
  const previewTab = page.getByRole('tab', { name: 'Preview' });
  const dimensions = [
    ['Width', 300, 1200],
    ['Height', 300, 2400],
    ['Depth', 200, 800],
  ] as const;

  await previewTab.click();
  const drawing = page.getByRole('main').getByRole('img', { name: 'Cabinet drawing' });
  const initialPreviewTitles = await drawing.locator('title').allTextContents();
  await optimizerTab.click();
  const topPanelLength = page.getByRole('row').filter({ hasText: 'Top Panel' }).getByRole('cell').nth(4);
  const originalPartLength = Number.parseFloat(await topPanelLength.innerText());

  await configuratorTab.click();
  const defaultValues = new Map(
    await Promise.all(
      dimensions.map(
        async ([label]) =>
          [label, await page.getByRole('spinbutton', { name: label, exact: true }).inputValue()] as const,
      ),
    ),
  );
  for (const [label, softMin, softMax] of dimensions) {
    const slider = page.getByRole('slider', { name: `${label} (mm)` });
    const entry = page.getByRole('spinbutton', { name: label, exact: true });
    const originalValue = Number(await entry.inputValue());
    const step = Number(await slider.getAttribute('step'));

    await expect(slider).toHaveAttribute('min', String(softMin));
    await expect(slider).toHaveAttribute('max', String(softMax));
    await slider.press('ArrowRight');
    await expect(entry).toHaveValue(String(originalValue + step));

    const enteredValue = originalValue + step * 2;
    await entry.fill(String(enteredValue));
    await entry.press('Enter');
    await expect(slider).toHaveValue(String(enteredValue));
  }

  await optimizerTab.click();
  await expect(topPanelLength).toHaveText(String(originalPartLength + 20));
  await previewTab.click();
  const updatedPreviewTitles = await drawing.locator('title').allTextContents();
  expect(updatedPreviewTitles).not.toEqual(initialPreviewTitles);

  await configuratorTab.click();
  const widthEntry = page.getByRole('spinbutton', { name: 'Width' });
  const widthSlider = page.getByRole('slider', { name: 'Width (mm)' });
  await widthEntry.fill('1300');
  await widthEntry.press('Enter');
  await expect(widthEntry).toHaveValue('1300');
  await expect(widthEntry).not.toHaveAttribute('aria-invalid', 'true');
  await expect(widthSlider).toHaveValue('1200');

  await widthEntry.fill('99');
  await expect(widthEntry).toHaveAttribute('aria-invalid', 'true');
  await widthEntry.press('Enter');
  await expect(widthEntry).toHaveValue('1300');

  const resetPrompt = page.waitForEvent('dialog', { timeout: 2_000 });
  const resetClick = page.getByRole('button', { name: 'Reset to Defaults' }).click();
  const resetDialog = await resetPrompt;
  expect(resetDialog.type()).toBe('confirm');
  await resetDialog.accept();
  await resetClick;
  await expect(widthEntry).toHaveValue(defaultValues.get('Width') ?? '');
  await expect(page.getByRole('spinbutton', { name: 'Height', exact: true })).toHaveValue(
    defaultValues.get('Height') ?? '',
  );
  await expect(page.getByRole('spinbutton', { name: 'Depth', exact: true })).toHaveValue(
    defaultValues.get('Depth') ?? '',
  );
});

test('theme, units, and all supported locales update visibly', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();

  const html = page.locator('html');
  const themeButton = page.getByRole('button', { name: /^(Dark mode|Light mode)$/ });
  const darkBefore = await html.evaluate((element) => element.classList.contains('dark'));
  await themeButton.click();
  await expect.poll(() => html.evaluate((element) => element.classList.contains('dark'))).toBe(!darkBefore);

  await page.keyboard.press('Alt+d');
  await expect.poll(() => html.evaluate((element) => element.classList.contains('dark'))).toBe(darkBefore);

  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  const metricWidth = Number(await widthInput.inputValue());
  await page.getByRole('button', { name: 'Switch to imperial' }).click();
  await expect(widthInput).toHaveValue((metricWidth / 25.4).toFixed(2));
  await page.getByRole('button', { name: 'Switch to metric' }).click();
  await expect(widthInput).toHaveValue(String(metricWidth));

  await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
  const languageSelect = page.locator('header select:visible');
  const locales = [
    ['he', 'rtl', 'הגדרות'],
    ['ar', 'rtl', 'تهيئة'],
    ['de', 'ltr', 'Konfigurieren'],
    ['es', 'ltr', 'Configurar'],
    ['fr', 'ltr', 'Configurer'],
    ['en', 'ltr', 'Configure'],
  ] as const;

  for (const [locale, direction, configuratorLabel] of locales) {
    await languageSelect.selectOption(locale);
    await expect(languageSelect).toHaveValue(locale);
    await expect(html).toHaveAttribute('dir', direction);
    await expect(page.getByRole('tab', { name: configuratorLabel })).toBeVisible();
  }
});

test('focus mode hides navigation and can be exited with its shortcut', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  await page.keyboard.press('Control+Shift+k');

  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Width' })).toBeVisible();

  await page.keyboard.press('Control+Shift+k');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('tablist')).toBeVisible();
});

test('onboarding and shortcut dialogs close on Escape and restore focus', async ({ appPage: page }) => {
  const helpButton = page.getByRole('button', { name: 'Help' });
  await helpButton.click();
  const onboardingDialog = page.getByRole('dialog');
  await expect(onboardingDialog.getByRole('heading', { name: 'Configure your cabinet' })).toBeVisible();
  await onboardingDialog.getByRole('button', { name: 'Next' }).click();
  await expect(onboardingDialog.getByRole('heading', { name: 'Optimise cut sheets' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(onboardingDialog).toHaveCount(0);
  await expect(helpButton).toBeFocused();

  await helpButton.click();
  const reopenedOnboarding = page.getByRole('dialog');
  await reopenedOnboarding.getByRole('button', { name: 'Next' }).click();
  await reopenedOnboarding.getByRole('button', { name: 'Next' }).click();
  await expect(reopenedOnboarding.getByRole('heading', { name: 'Export & build' })).toBeVisible();
  await reopenedOnboarding.getByRole('button', { name: 'Get Started' }).click();
  await expect(reopenedOnboarding).toHaveCount(0);
  await expect(helpButton).toBeFocused();

  const shortcutsButton = page.getByRole('button', { name: 'Keyboard shortcuts' });
  await shortcutsButton.click();
  const shortcutsDialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
  await expect(shortcutsDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shortcutsDialog).toHaveCount(0);
  await expect(shortcutsButton).toBeFocused();

  await page.keyboard.press('?');
  await expect(shortcutsDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shortcutsDialog).toHaveCount(0);
  await expect(shortcutsButton).toBeFocused();
});

test('reset requires confirmation and preserves edits when canceled', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  const originalWidth = await widthInput.inputValue();
  await widthInput.fill('800');
  await widthInput.press('Enter');
  await expect(widthInput).toHaveValue('800');

  const cancelPrompt = page.waitForEvent('dialog', { timeout: 2_000 });
  const cancelClick = page.getByRole('button', { name: 'Reset to Defaults' }).click();
  const canceledDialog = await cancelPrompt;
  expect(canceledDialog.type()).toBe('confirm');
  await canceledDialog.dismiss();
  await cancelClick;
  await expect(widthInput).toHaveValue('800');

  const acceptPrompt = page.waitForEvent('dialog', { timeout: 2_000 });
  const acceptClick = page.getByRole('button', { name: 'Reset to Defaults' }).click();
  const acceptedDialog = await acceptPrompt;
  await acceptedDialog.accept();
  await acceptClick;
  await expect(widthInput).toHaveValue(originalWidth);
});

test('cabinet add, switch, rename, reload, and shortcut toast stay in sync', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  const originalWidth = await widthInput.inputValue();

  await page.getByRole('button', { name: /Add Cabinet/ }).click();
  const secondCabinet = page.getByRole('button', { name: /^Cabinet 2\d+ parts$/ });
  await expect(secondCabinet).toBeVisible();
  await expect(page).toHaveURL(/cab=1/);

  await widthInput.fill('800');
  await widthInput.press('Enter');
  await expect(widthInput).toHaveValue('800');
  await page.getByRole('button', { name: /^Cabinet 1\d+ parts$/ }).click();
  await expect(widthInput).toHaveValue(originalWidth);
  await expect(page).not.toHaveURL(/cab=/);

  await secondCabinet.click();
  await expect(widthInput).toHaveValue('800');
  await expect(page).toHaveURL(/cab=1/);
  await secondCabinet.dblclick();
  const cabinetNameInput = page.getByRole('textbox', { name: 'Cabinet name', exact: true });
  await cabinetNameInput.fill('Millwork');
  await cabinetNameInput.press('Enter');
  await expect(page.getByRole('button', { name: /^Millwork\d+ parts$/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Preview' }).click();
  const activeCabinet = page.getByRole('button', { name: 'Millwork' });
  await expect(activeCabinet).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/cab=1/);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('woodworkingshop:session');
        if (!raw) return false;
        const session = JSON.parse(raw) as {
          activeCabinetIndex?: number;
          cabinets?: { name: string; config: { width: number } }[];
        };
        return session.activeCabinetIndex === 1 && session.cabinets?.[1]?.name === 'Millwork';
      }),
    )
    .toBe(true);

  await page.evaluate(() => {
    const rawSession = localStorage.getItem('woodworkingshop:session');
    if (!rawSession) throw new Error('Expected the project session to be persisted before reload.');
    const session = JSON.parse(rawSession) as { activeCabinetIndex?: number };
    session.activeCabinetIndex = 0;
    localStorage.setItem('woodworkingshop:session', JSON.stringify(session));
  });
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Millwork' })).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/cab=1/);

  await page.keyboard.press('Control+Shift+n');
  await expect(page.getByRole('button', { name: 'Cabinet 3', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Cabinet added');
  await expect(page).toHaveURL(/cab=2/);
});

test('PWA service worker registers', async ({ appPage: page }) => {
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

test('PDF panel renders generate button and content summary', async ({ appPage: page }) => {
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

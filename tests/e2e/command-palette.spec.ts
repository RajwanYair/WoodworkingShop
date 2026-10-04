import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/app';

test('command palette filters, runs a command, passes axe, and restores focus', async ({ appPage: page }) => {
  const triggers = page.getByRole('button', { name: 'Command Palette' });
  const trigger = triggers.last();

  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Command Palette' });
  const search = dialog.getByRole('combobox', { name: 'Search commands and actions...' });
  await expect(search).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations)).toHaveLength(0);

  await search.fill('calculators');
  await search.press('Enter');
  await expect(page.getByRole('tab', { name: 'Calculators' })).toHaveAttribute('aria-selected', 'true');
  await expect(dialog).toHaveCount(0);

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('opens a calculator from the palette and lists it in recent commands', async ({ appPage: page }) => {
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Command Palette' });
  const search = dialog.getByRole('combobox', { name: 'Search commands and actions...' });
  await search.fill('shelf sag');
  await search.press('Enter');

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Calculators' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Shelf Sag Calculator' })).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Control+k');
  const recentCommands = dialog.getByRole('group', { name: 'Recent commands' });
  await expect(recentCommands.getByRole('option', { name: 'Shelf Sag Calculator', exact: true })).toBeVisible();
});

test('Ctrl+K does not open the command palette while editing a dimension', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  await configuratorTab.click();
  const width = page.getByRole('spinbutton', { name: 'Width' });
  await width.focus();
  await width.press('Control+k');

  await expect(page.getByRole('dialog', { name: 'Command Palette' })).toHaveCount(0);
  await expect(configuratorTab).toHaveAttribute('aria-selected', 'true');
});

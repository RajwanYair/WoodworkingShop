import { expect, test } from './fixtures/app';

test('shows a storage warning when usage reaches the quota threshold', async ({ appPage: page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => ({ usage: 85 * 1024 * 1024, quota: 100 * 1024 * 1024 }),
      },
    });
  });
  await page.reload();

  await page.getByRole('button', { name: 'Project Manager' }).click();
  await expect(
    page.getByRole('status', { name: 'Storage nearly full — consider exporting and deleting old projects' }),
  ).toBeVisible();
});

test('keeps project saving available when storage estimates fail', async ({ appPage: page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => {
          throw new Error('Storage estimate unavailable');
        },
      },
    });
  });
  await page.reload();

  const projectName = 'Storage recovery project';
  const openProjectManager = () => page.getByRole('button', { name: 'Project Manager' }).click();
  await openProjectManager();

  const dialog = page.getByRole('dialog', { name: 'Project Manager' });
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await dialog.getByPlaceholder('Project name…').fill(projectName);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText(projectName, { exact: true })).toBeVisible();

  await page.reload();
  await openProjectManager();

  const reloadedDialog = page.getByRole('dialog', { name: 'Project Manager' });
  await expect(reloadedDialog.getByText(projectName, { exact: true })).toBeVisible();
});

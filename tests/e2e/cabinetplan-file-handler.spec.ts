import { expect, test } from './fixtures/app';

test('loads launched cabinet plans and recovers from invalid or unsupported files', async ({ appPage: page }) => {
  await page.addInitScript(() => {
    type LaunchFile = { getFile: () => Promise<File> };
    type LaunchParams = { files: LaunchFile[] };
    type LaunchConsumer = (params: LaunchParams) => Promise<void>;

    Object.defineProperty(window, '__e2eLaunchConsumer', { configurable: true, value: undefined });
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: {
        setConsumer: (consumer: LaunchConsumer) => {
          Object.defineProperty(window, '__e2eLaunchConsumer', { configurable: true, value: consumer });
        },
      },
    });
  });
  await page.reload();

  await expect
    .poll(() => page.evaluate(() => typeof (window as Window & { __e2eLaunchConsumer?: unknown }).__e2eLaunchConsumer))
    .toBe('function');

  const validProject = JSON.stringify({
    id: 'project-launch-test',
    name: 'Launch test',
    savedAt: '2026-10-09T12:00:00.000Z',
    schemaVersion: '1.0',
    cabinets: [
      {
        name: 'Launched cabinet',
        config: {
          furnitureType: 'cabinet',
          width: 777,
          height: 1800,
          depth: 500,
          shelfCount: 3,
          shelfSpacing: 'equal',
          customShelfPositions: [],
          carcassMaterial: 'plywood-17',
          backPanelMaterial: 'plywood-4',
          doorCount: 2,
          doorStyle: 'flat',
          doorReveal: 3,
          drawerCount: 0,
          kickHeight: 100,
          handleStyle: 'bar',
          edgeBanding: 'all-visible',
          lang: 'en',
        },
      },
    ],
  });

  await page.evaluate(async (text) => {
    type LaunchFile = { getFile: () => Promise<File> };
    type LaunchParams = { files: LaunchFile[] };
    type LaunchConsumer = (params: LaunchParams) => Promise<void>;
    const consumer = (window as Window & { __e2eLaunchConsumer?: LaunchConsumer }).__e2eLaunchConsumer;
    if (!consumer) throw new Error('File handler consumer was not registered');
    const file = new File([text], 'launch.cabinetplan', { type: 'application/cabinet-plan' });
    await consumer({ files: [{ getFile: async () => file }] });
  }, validProject);

  await page.getByRole('tab', { name: 'Configure', exact: true }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width', exact: true });
  await expect(widthInput).toHaveValue('777');

  await page.evaluate(async () => {
    type LaunchFile = { getFile: () => Promise<File> };
    type LaunchParams = { files: LaunchFile[] };
    type LaunchConsumer = (params: LaunchParams) => Promise<void>;
    const consumer = (window as Window & { __e2eLaunchConsumer?: LaunchConsumer }).__e2eLaunchConsumer;
    if (!consumer) throw new Error('File handler consumer was not registered');
    const launch = (name: string, type: string, text: string) => {
      const file = new File([text], name, { type });
      return consumer({ files: [{ getFile: async () => file }] });
    };
    await launch('corrupt.cabinetplan', 'application/cabinet-plan', '{ invalid json');
    await launch('notes.txt', 'text/plain', '{"cabinets":[]}');
    await consumer({ files: [{ getFile: async () => Promise.reject(new Error('File unavailable')) }] });
  });

  await expect(widthInput).toHaveValue('777');
  await expect(page.getByRole('banner')).toBeVisible();
});

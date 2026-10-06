import { expect, test } from './fixtures/app';

test('room editor pen drag preserves 1 mm cabinet positioning precision', async ({ appPage: page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'room-layouts',
      JSON.stringify({
        state: {
          layouts: [
            {
              id: 'e2e-kitchen',
              name: 'E2E Kitchen',
              roomWidth: 4000,
              roomDepth: 3000,
              cabinets: [{ id: 'e2e-base', name: 'E2E Base Unit', x: 100, y: 100, width: 600, depth: 580 }],
            },
          ],
          activeLayoutId: 'e2e-kitchen',
        },
        version: 0,
      }),
    );
  });
  await page.reload();
  await page.getByRole('tab', { name: 'Configure', exact: true }).click();

  const room = page.getByRole('region', { name: 'Room floor plan', exact: true });
  await expect(room.getByRole('heading', { name: 'Room Layout: E2E Kitchen' })).toBeVisible();
  const svg = room.locator('svg');
  const cabinetLabel = svg.getByText('(1) E2E Base Unit', { exact: true });
  const svgBounds = await svg.boundingBox();
  if (!svgBounds) throw new Error('Room editor SVG geometry is unavailable');

  const scale = Math.min(576 / 4000, 336 / 3000);
  const offsetX = 32 + (576 - 4000 * scale) / 2;
  const offsetY = 32 + (336 - 3000 * scale) / 2;
  const clientX = svgBounds.x + ((offsetX + (100 + 300) * scale) * svgBounds.width) / 640;
  const clientY = svgBounds.y + ((offsetY + (100 + 290) * scale) * svgBounds.height) / 400;
  const movement = (0.6 * scale * svgBounds.width) / 640;
  await cabinetLabel.dispatchEvent('pointerdown', {
    pointerId: 7,
    pointerType: 'pen',
    clientX,
    clientY,
  });
  await svg.dispatchEvent('pointermove', {
    pointerId: 7,
    pointerType: 'pen',
    clientX: clientX + movement,
    clientY,
  });
  await svg.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'pen', clientX, clientY });

  await expect(room.getByRole('spinbutton', { name: 'X position (mm)', exact: true })).toHaveValue('101');
});

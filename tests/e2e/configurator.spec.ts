import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures/app';

async function showParts(page: Page) {
  await page.getByRole('tab', { name: 'Cut Sheets' }).click();
  await expect(page.getByRole('heading', { name: 'Parts List' })).toBeVisible();
}

function partRow(page: Page, name: string) {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });
}

test('furniture and joinery options select correctly and update controls and parts', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const furnitureTypes = [
    ['Cabinet', 'Door', true, true],
    ['Bookshelf', 'Adjustable Shelf', false, false],
    ['Desk', 'Desktop', false, false],
    ['Wardrobe', 'Hanging Rail', true, true],
    ['Panel', 'Panel', false, false],
  ] as const;

  for (const [furnitureType, expectedPart, hasDoors, hasDrawers] of furnitureTypes) {
    await configuratorTab.click();
    const furnitureChoice = page.getByRole('radio', { name: furnitureType, exact: true });
    await page.getByText(furnitureType, { exact: true }).click();
    await expect(furnitureChoice).toBeChecked();
    await expect(page.getByRole('group', { name: /Shelves/ })).toHaveCount(furnitureType === 'Panel' ? 0 : 1);
    await expect(page.getByRole('group', { name: /Doors/ })).toHaveCount(hasDoors ? 1 : 0);
    await expect(page.getByRole('group', { name: /Drawers/ })).toHaveCount(hasDrawers ? 1 : 0);

    if (furnitureType === 'Panel') {
      await expect(page.getByRole('slider', { name: 'Depth (mm)' })).toHaveCount(0);
      await page.getByRole('combobox', { name: 'Carcass Material' }).selectOption('mdf-18');
      await page.getByRole('combobox', { name: 'Back Panel Material' }).selectOption('mdf-3');

      const panelSource = page.getByRole('radio', { name: 'Carcass material', exact: true });
      await page.getByText('Carcass material', { exact: true }).click();
      await expect(panelSource).toBeChecked();
      await showParts(page);
      await expect(partRow(page, 'Panel').getByRole('cell').nth(6)).toHaveText('18');

      await configuratorTab.click();
      const backSource = page.getByRole('radio', { name: 'Back panel material', exact: true });
      await page.getByText('Back panel material', { exact: true }).click();
      await expect(backSource).toBeChecked();
      await showParts(page);
      await expect(partRow(page, 'Panel').getByRole('cell').nth(6)).toHaveText('3');
    } else {
      await showParts(page);
      await expect(partRow(page, expectedPart)).toHaveCount(1);
    }
  }

  await configuratorTab.click();
  const joineryOptions = [
    'Through-Screw',
    'Pocket Screw',
    'Dado Groove',
    'Dowel',
    'Biscuit',
    'Mortise & Tenon',
    'Dovetail',
  ];
  for (const option of joineryOptions) {
    const choice = page.getByRole('radio', { name: option, exact: true });
    await page.getByText(option, { exact: true }).click();
    await expect(choice).toBeChecked();
  }
});

test('preview views render expected geometry and dimension visibility', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  const views = [
    { label: 'Front (Closed)', isometric: false, viewBox: '0 0 290 490', hiddenViewBox: '0 0 260 460' },
    { label: 'Front (Open)', isometric: false, viewBox: '0 0 290 490', hiddenViewBox: '0 0 260 460' },
    { label: 'Side', isometric: false, viewBox: '0 0 210 490', hiddenViewBox: '0 0 180 460' },
    { label: 'Top', isometric: false, viewBox: '0 0 290 210', hiddenViewBox: '0 0 260 180' },
    { label: 'Back', isometric: false, viewBox: '0 0 290 490', hiddenViewBox: '0 0 260 460' },
    { label: '3D', isometric: true },
  ] as const;
  const dimensionsToggle = page.getByRole('checkbox', { name: 'Dimensions' });

  for (const view of views) {
    const tab = page.getByRole('tab', { name: view.label, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');

    const drawing = view.isometric
      ? page.getByRole('img', { name: '3D isometric cabinet drawing' })
      : page.getByRole('img', { name: 'Cabinet drawing' });
    await expect(drawing).toBeVisible();
    const initialViewBox = await drawing.getAttribute('viewBox');
    const initialTextCount = await drawing.locator('text').count();
    if (view.isometric) {
      expect(initialViewBox).toMatch(/^0 0 \d+(\.\d+)? \d+(\.\d+)?$/);
    } else {
      expect(initialViewBox).toBe(view.viewBox);
    }
    expect(await drawing.locator('polygon, rect').count()).toBeGreaterThan(1);

    await dimensionsToggle.uncheck();
    const hiddenTextCount = await drawing.locator('text').count();
    expect(hiddenTextCount).toBeLessThan(initialTextCount);
    if (view.isometric) {
      const [initialWidth, initialHeight] = (initialViewBox ?? '').split(' ').slice(2).map(Number);
      const hiddenViewBox = await drawing.getAttribute('viewBox');
      const [hiddenWidth, hiddenHeight] = hiddenViewBox!.split(' ').slice(2).map(Number);
      expect(hiddenWidth).toBe(initialWidth - 60);
      expect(hiddenHeight).toBe(initialHeight - 60);
    } else {
      await expect(drawing).toHaveAttribute('viewBox', view.hiddenViewBox);
    }
    await dimensionsToggle.check();
    await expect(drawing).toHaveAttribute('viewBox', initialViewBox ?? '');
  }
});

test('preview exports contain the selected view with valid SVG and PNG data', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  await page.getByRole('tab', { name: 'Side', exact: true }).click();

  const svgDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' }).click();
  const svgDownload = await svgDownloadPromise;
  expect(svgDownload.suggestedFilename()).toBe('cabinet-side.svg');
  expect(svgDownload.suggestedFilename()).toMatch(/^[a-z0-9-]+\.svg$/);
  const svgText = await readFile(await svgDownload.path(), 'utf8');
  const svgData = await page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, 'image/svg+xml');
    const svg = document.documentElement;
    return {
      rootName: svg.localName,
      hasParserError: document.querySelector('parsererror') !== null,
      viewBox: svg.getAttribute('viewBox'),
      rectangleCount: svg.querySelectorAll('rect').length,
      dimensionLabels: [...svg.querySelectorAll('text')].map((element) => element.textContent),
    };
  }, svgText);
  expect(svgData.rootName).toBe('svg');
  expect(svgData.hasParserError).toBe(false);
  expect(svgData.viewBox).toBe('0 0 210 490');
  expect(svgData.rectangleCount).toBeGreaterThan(1);
  expect(svgData.dimensionLabels).toContain('600 mm');

  await page.getByRole('tab', { name: 'Top', exact: true }).click();
  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG (2×)' }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe('cabinet-top.png');
  expect(pngDownload.suggestedFilename()).toMatch(/^[a-z0-9-]+\.png$/);
  const pngData = await readFile(await pngDownload.path());
  expect([...pngData.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(pngData.toString('ascii', 12, 16)).toBe('IHDR');
  expect(pngData.readUInt32BE(16)).toBe(580);
  expect(pngData.readUInt32BE(20)).toBe(420);
});

test('preview 3D orbit and touch gestures respect zoom bounds and cancellation', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  await page.getByRole('tab', { name: '3D', exact: true }).click();
  const drawing = page.getByRole('img', { name: '3D isometric cabinet drawing' });
  const orbitSurface = drawing.locator('xpath=..');

  await orbitSurface.dispatchEvent('wheel', { deltaY: -10000 });
  await expect(page.getByText(/Drag to rotate.*240%/)).toBeVisible();
  await orbitSurface.dispatchEvent('wheel', { deltaY: 10000 });
  await expect(page.getByText(/Drag to rotate.*60%/)).toBeVisible();

  const bounds = await orbitSurface.boundingBox();
  if (!bounds) throw new Error('3D orbit surface is not laid out');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height / 2 + 20);
  await expect(orbitSurface).toHaveAttribute('style', /rotateY\(20deg\)/);
  await orbitSurface.dispatchEvent('pointercancel', {
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });
  await expect(orbitSurface).toHaveClass(/(?:^|\s)cursor-grab(?:\s|$)/);
  await page.mouse.up();

  await page.getByRole('tab', { name: 'Front (Closed)', exact: true }).click();
  const frontTab = page.getByRole('tab', { name: 'Front (Closed)', exact: true });
  const frontDrawing = page.getByRole('img', { name: 'Cabinet drawing' });
  await dispatchTouch(frontDrawing, 'touchstart', [{ x: 250, y: 250 }]);
  await dispatchTouch(frontDrawing, 'touchend', [], [{ x: 350, y: 250 }]);
  await expect(frontTab).toHaveAttribute('aria-selected', 'true');

  await dispatchTouch(frontDrawing, 'touchstart', [{ x: 250, y: 250 }]);
  await dispatchTouch(frontDrawing, 'touchend', [], [{ x: 150, y: 250 }]);
  const frontOpenTab = page.getByRole('tab', { name: 'Front (Open)', exact: true });
  await expect(frontOpenTab).toHaveAttribute('aria-selected', 'true');

  const openDrawing = page.getByRole('img', { name: 'Cabinet drawing' });
  const zoomContainer = openDrawing.locator('xpath=..');
  await dispatchTouch(openDrawing, 'touchstart', [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ]);
  await dispatchTouch(openDrawing, 'touchmove', [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ]);
  await expect(zoomContainer).toHaveAttribute('style', /scale\(2\)/);
  await dispatchTouch(openDrawing, 'touchend', [{ x: 100, y: 100 }], [{ x: 300, y: 100 }]);
  await dispatchTouch(openDrawing, 'touchcancel', [], [{ x: 500, y: 100 }]);
  await dispatchTouch(openDrawing, 'touchend', [], [{ x: 500, y: 100 }]);
  await expect(frontOpenTab).toHaveAttribute('aria-selected', 'true');
  await dispatchTouch(openDrawing, 'touchstart', [{ x: 200, y: 100 }]);
  await dispatchTouch(openDrawing, 'touchend', [], [{ x: 100, y: 100 }]);
  await expect(zoomContainer).toHaveAttribute('style', /scale\(1\)/);
  await expect(page.getByRole('tab', { name: 'Side', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('interactive 3D panel renders and controls update its scene', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  const panel = page.getByRole('region', { name: 'Interactive 3D Preview' });
  await expect(panel).toBeVisible();
  const canvas = panel.locator('canvas');
  await expect(canvas).toBeVisible();
  const initialPixels = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) throw new Error('2D canvas context is unavailable');
    const { data } = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
    const colors = new Set<string>();
    for (let offset = 0; offset < data.length; offset += 4 * 16) {
      colors.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`);
    }
    return colors.size;
  });
  expect(initialPixels).toBeGreaterThan(2);

  const explodeSlider = panel.getByRole('slider', { name: /Explode view/ });
  await explodeSlider.focus();
  await explodeSlider.press('End');
  await expect(explodeSlider).toHaveAttribute('aria-valuenow', '1');
  await expect(panel.getByText('Explode view (100%)')).toBeVisible();

  const wireframe = panel.getByRole('checkbox', { name: 'Wireframe' });
  await wireframe.check();
  await expect(wireframe).toBeChecked();
  const edgeBanding = panel.getByRole('checkbox', { name: 'Edge banding' });
  await edgeBanding.uncheck();
  await expect(edgeBanding).not.toBeChecked();
  await panel.getByRole('button', { name: 'Zoom in' }).click();
  await panel.getByRole('button', { name: 'Reset camera' }).click();
  await expect(explodeSlider).toHaveAttribute('aria-valuenow', '0');
  await expect(panel.getByText('Explode view (0%)')).toBeVisible();
});

test('optional WebGL preview respects its feature flag and capability fallback', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Preview' }).click();
  await page.getByRole('tab', { name: '3D', exact: true }).click();
  const fallback = page.getByTestId('webgl-fallback');
  const canvas = page.getByTestId('webgl-preview-canvas');

  await expect.poll(async () => (await fallback.count()) + (await canvas.count())).toBeLessThanOrEqual(1);
  if (await fallback.isVisible()) {
    await expect(fallback).toHaveAttribute('aria-label', /WebGL not supported/);
  } else if (await canvas.isVisible()) {
    await expect
      .poll(async () =>
        canvas.evaluate((element) => {
          const canvasElement = element as HTMLCanvasElement;
          const gl = canvasElement.getContext('webgl');
          if (!gl) return 0;
          const pixels = new Uint8Array(canvasElement.width * canvasElement.height * 4);
          gl.readPixels(0, 0, canvasElement.width, canvasElement.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const colors = new Set<string>();
          for (let offset = 0; offset < pixels.length; offset += 4 * 32) {
            colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
          }
          return colors.size;
        }),
      )
      .toBeGreaterThan(1);
    const modeToggle = page.getByRole('button', { name: 'Animate' });
    await expect(modeToggle).toBeVisible();
    await modeToggle.click();
    await expect(page.getByRole('button', { name: 'Isometric' })).toHaveAttribute('aria-pressed', 'false');
  } else {
    await expect(fallback).toHaveCount(0);
    await expect(canvas).toHaveCount(0);
  }
});

async function dispatchTouch(
  target: import('@playwright/test').Locator,
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  touches: { x: number; y: number }[],
  changedTouches = touches,
) {
  await target.evaluate(
    (element, event) => {
      const createTouches = (points: { x: number; y: number }[]) =>
        points.map(
          (point, identifier) =>
            new Touch({
              identifier,
              target: element,
              clientX: point.x,
              clientY: point.y,
            }),
        );
      element.dispatchEvent(
        new TouchEvent(event.type, {
          bubbles: true,
          cancelable: true,
          touches: createTouches(event.touches),
          changedTouches: createTouches(event.changedTouches),
        }),
      );
    },
    { type, touches, changedTouches },
  );
}

test('materials, back panel, shelf options, and edge banding update generated parts', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const carcassMaterial = page.getByRole('combobox', { name: 'Carcass Material' });
  const backMaterial = page.getByRole('combobox', { name: 'Back Panel Material' });

  await configuratorTab.click();
  await carcassMaterial.selectOption('plywood-18');
  await backMaterial.selectOption('mdf-3');
  await showParts(page);
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(3)).toHaveText('Birch Plywood 18 mm');
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(6)).toHaveText('18');
  await expect(partRow(page, 'Back Panel').getByRole('cell').nth(3)).toHaveText('MDF/HDF 3 mm (back)');
  await expect(partRow(page, 'Back Panel').getByRole('cell').nth(6)).toHaveText('3');

  await configuratorTab.click();
  const hasBack = page.getByRole('checkbox', { name: 'Include back panel' });
  await hasBack.uncheck();
  await expect(backMaterial).toBeDisabled();
  await showParts(page);
  await expect(partRow(page, 'Back Panel')).toHaveCount(0);
  await configuratorTab.click();
  await hasBack.check();
  await expect(backMaterial).toBeEnabled();

  const shelfCount = page.getByRole('spinbutton', { name: 'Number of Shelves' });
  await shelfCount.fill('2');
  await shelfCount.press('Enter');
  await showParts(page);
  await expect(partRow(page, 'Adjustable Shelf').getByRole('cell').nth(2)).toHaveText('2');

  await page.getByRole('tab', { name: 'Configure' }).click();
  const supportCount = page.getByRole('spinbutton', { name: 'Centre Supports' });
  await supportCount.fill('1');
  await supportCount.press('Enter');
  await showParts(page);
  await expect(partRow(page, 'Centre Support').getByRole('cell').nth(2)).toHaveText('1');

  await configuratorTab.click();
  const customSpacing = page.getByRole('radio', { name: 'Custom', exact: true });
  await customSpacing.check();
  await expect(customSpacing).toBeChecked();
  await expect(page.getByRole('spinbutton', { name: 'Shelf 1 position in mm' })).toBeVisible();
  const equalSpacing = page.getByRole('radio', { name: 'Equal', exact: true });
  await equalSpacing.check();
  await expect(equalSpacing).toBeChecked();
  await expect(page.getByRole('spinbutton', { name: 'Shelf 1 position in mm' })).toHaveCount(0);

  const edgeBanding = page.getByRole('combobox', { name: 'Edge Banding' });
  for (const [mode, carcassEdge, doorEdge] of [
    ['all-visible', 'Front edge', 'All 4 edges'],
    ['doors-only', 'None', 'All 4 edges'],
    ['none', 'None', 'None'],
  ] as const) {
    await edgeBanding.selectOption(mode);
    await showParts(page);
    await expect(partRow(page, 'Top Panel').getByRole('cell').nth(7)).toHaveText(carcassEdge);
    await expect(partRow(page, 'Door').getByRole('cell').nth(7)).toHaveText(doorEdge);
    await configuratorTab.click();
  }
});

test('custom materials can be added, edited, and deleted', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const editor = page.getByRole('group', { name: 'Custom Materials' });
  await editor.getByRole('button', { name: 'Add custom material' }).click();
  await editor.getByRole('textbox', { name: 'Name' }).fill('Test Birch');
  await editor.getByRole('button', { name: 'Add Material' }).click();

  const material = editor.getByRole('listitem').filter({ hasText: 'Test Birch' });
  await expect(material).toBeVisible();
  await material.getByRole('button', { name: 'Edit Test Birch' }).click();
  await editor.getByRole('textbox', { name: 'Name' }).first().fill('Test Oak');
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor.getByText('Test Oak (18 mm, ₪100)')).toBeVisible();

  await editor.getByRole('listitem').filter({ hasText: 'Test Oak' }).getByRole('button', { name: 'Remove' }).click();
  await expect(editor.getByText('Test Oak (18 mm, ₪100)')).toHaveCount(0);
});

test('community catalog import previews valid data and rejects invalid data without partial writes', async ({
  appPage: page,
}) => {
  const material = {
    id: 'community-birch-18',
    name: 'Community Birch 18 mm',
    pricePerSqM: 45,
    currency: 'USD',
    thickness: 18,
    hasGrain: true,
    submittedAt: '2026-09-28T12:00:00.000Z',
    votes: 3,
  };
  await page.evaluate((validMaterial) => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith('https://catalog.example/')) return originalFetch(input, init);
      const invalid = url.endsWith('/invalid.json');
      return new Response(
        JSON.stringify({
          schemaVersion: '1.0',
          generatedAt: '2026-09-28T12:00:00.000Z',
          materials: invalid ? [validMaterial, { ...validMaterial, id: '', name: '' }] : [validMaterial],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };
  }, material);

  await page.getByRole('tab', { name: 'Configure' }).click();
  const importPanel = page.getByRole('heading', { name: 'Import Community Catalog' }).locator('..');
  const urlInput = importPanel.getByRole('textbox', { name: 'Catalog URL' });
  await urlInput.fill('https://catalog.example/valid.json');
  await importPanel.getByRole('button', { name: 'Import' }).click();
  await expect(importPanel.getByText('1 material found')).toBeVisible();
  await importPanel.getByRole('button', { name: 'Add selected to my materials' }).click();
  await expect(importPanel.getByText('1 material added')).toBeVisible();
  const importedMaterial = page.getByRole('group', { name: 'Custom Materials' }).getByText('Community Birch 18 mm');
  await expect(importedMaterial).toBeVisible();

  await urlInput.fill('https://catalog.example/invalid.json');
  await importPanel.getByRole('button', { name: 'Import' }).click();
  await expect(importPanel.getByText(/Catalog JSON does not match schema/)).toBeVisible();
  await expect(importedMaterial).toBeVisible();
  await expect(page.getByRole('group', { name: /Custom Materials/ }).getByRole('listitem')).toHaveCount(1);
});

test('hardware catalog import supports merge and replace and rejects invalid files atomically', async ({
  appPage: page,
}) => {
  const panel = page.getByRole('heading', { name: 'Import Hardware Catalog' }).locator('..');
  const fileInput = panel.getByLabel('Catalog JSON file');
  const firstItem = {
    id: 'catalog-hinge',
    name: 'Imported Hinge',
    category: 'hinge',
    sku: 'HINGE-1',
    manufacturer: 'Workshop',
    unitPrice: 2.5,
    packSize: 1,
    description: 'Soft close',
    tags: ['soft-close'],
  };
  const upload = async (items: unknown[]) => {
    await fileInput.setInputFiles({
      name: 'hardware-catalog.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ schemaVersion: '1.0', items })),
    });
  };

  await page.getByRole('tab', { name: 'Configure' }).click();
  await upload([firstItem]);
  await expect(panel.getByText('1 hardware items validated.')).toBeVisible();
  await panel.getByRole('button', { name: 'Import catalog' }).click();
  await expect(panel.getByText('Imported Hinge', { exact: true })).toBeVisible();

  const updatedItem = { ...firstItem, name: 'Updated Hinge' };
  const newItem = { ...firstItem, id: 'catalog-handle', category: 'handle', name: 'Imported Handle' };
  await upload([updatedItem, newItem]);
  await panel.getByRole('radio', { name: /Merge:/ }).check();
  await panel.getByRole('button', { name: 'Import catalog' }).click();
  await expect(panel.getByText('Updated Hinge', { exact: true })).toBeVisible();
  await expect(panel.getByText('Imported Handle', { exact: true })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Custom hardware (2)' })).toBeVisible();

  await upload([updatedItem, { ...newItem, id: '' }]);
  await expect(panel.getByRole('alert')).toContainText('Invalid hardware item at index 1');
  await expect(panel.getByText('Updated Hinge', { exact: true })).toBeVisible();
  await expect(panel.getByText('Imported Handle', { exact: true })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Custom hardware (2)' })).toBeVisible();

  const replacement = { ...firstItem, id: 'replacement-screw', category: 'screw', name: 'Replacement Screw' };
  await upload([replacement]);
  await panel.getByRole('radio', { name: /Replace all/ }).check();
  await panel.getByRole('button', { name: 'Import catalog' }).click();
  await expect(panel.getByText('Replacement Screw', { exact: true })).toBeVisible();
  await expect(panel.getByText('Updated Hinge', { exact: true })).toHaveCount(0);
  await expect(panel.getByText('Imported Handle', { exact: true })).toHaveCount(0);
  await expect(panel.getByRole('heading', { name: 'Custom hardware (1)' })).toBeVisible();
});

test('named expressions edit, reject out-of-range values, and update generated cut-list dimensions', async ({
  appPage: page,
}) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const panel = page.getByRole('region', { name: 'Named parametric expressions panel' });
  await panel.getByRole('textbox', { name: 'Name' }).fill('target_width');
  await panel.getByRole('textbox', { name: 'Formula' }).fill('3001');
  await panel.getByRole('button', { name: 'Add', exact: true }).click();
  await panel.getByRole('button', { name: 'Apply target_width' }).click();
  await expect(panel.getByRole('alert')).toContainText('between 100 and 3000 mm');

  await panel.getByRole('button', { name: 'Edit target_width' }).click();
  await panel.getByRole('textbox', { name: 'Formula' }).fill('720');
  await panel.getByRole('button', { name: 'Save', exact: true }).click();
  await panel.getByRole('button', { name: 'Apply target_width' }).click();
  await expect(page.getByRole('slider', { name: 'Width (mm)' })).toHaveValue('720');

  await showParts(page);
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(4)).toHaveText('686');
});

test('door and drawer options update cut-list quantities and hardware', async ({ appPage: page }) => {
  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  const doorCountOne = page.getByRole('radio', { name: '1 doors', exact: true });
  const doorCountTwo = page.getByRole('radio', { name: '2 doors', exact: true });
  const doorStyle = page.getByRole('combobox', { name: 'Door Style' });

  await configuratorTab.click();
  await doorCountOne.check();
  await showParts(page);
  await expect(partRow(page, 'Door').getByRole('cell').nth(2)).toHaveText('1');
  await page.getByRole('tab', { name: 'Configure' }).click();
  await doorCountTwo.check();
  await showParts(page);
  await expect(partRow(page, 'Door').getByRole('cell').nth(2)).toHaveText('2');

  await configuratorTab.click();
  await doorStyle.selectOption('flat');
  await showParts(page);
  await expect(partRow(page, 'Door')).toHaveCount(1);
  await configuratorTab.click();
  await doorStyle.selectOption('shaker');
  await showParts(page);
  await expect(partRow(page, 'Door')).toHaveCount(1);
  await configuratorTab.click();
  await doorStyle.selectOption('glass');
  await showParts(page);
  await expect(partRow(page, 'Glass Door')).toHaveCount(1);
  await configuratorTab.click();
  await doorStyle.selectOption('none');
  await showParts(page);
  await expect(partRow(page, 'Door')).toHaveCount(0);
  await expect(partRow(page, 'Glass Door')).toHaveCount(0);

  await configuratorTab.click();
  await doorStyle.selectOption('flat');
  const handles = page.getByRole('combobox', { name: 'Handles' });
  for (const [style, hardwareLabel] of [
    ['bar', 'Bar Handle 160 mm'],
    ['knob', 'Round Knob 35 mm'],
    ['cup', 'Cup Pull 96 mm'],
  ] as const) {
    await handles.selectOption(style);
    await page.getByRole('tab', { name: 'Assembly' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: hardwareLabel })).toBeVisible();
    await configuratorTab.click();
  }
  await handles.selectOption('none');
  await page.getByRole('tab', { name: 'Assembly' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Bar Handle 160 mm' })).toHaveCount(0);

  await configuratorTab.click();
  const drawerCount = page.getByRole('spinbutton', { name: 'Number of Drawers' });
  await drawerCount.fill('2');
  await drawerCount.press('Enter');
  await showParts(page);
  await expect(partRow(page, 'Drawer 1 Front')).toHaveCount(1);
  await expect(partRow(page, 'Drawer 2 Front')).toHaveCount(1);

  for (const [slideStyle, hardwareLabel] of [
    ['standard', 'Drawer Slide Pair'],
    ['soft-close', 'Soft-Close Drawer Slide Pair'],
    ['full-extension', 'Full-Extension Drawer Slide Pair'],
  ] as const) {
    await configuratorTab.click();
    const slideChoice = page.getByRole('radio', {
      name: slideStyle === 'standard' ? 'Standard' : slideStyle === 'soft-close' ? 'Soft-Close' : 'Full-Extension',
      exact: true,
    });
    await slideChoice.check();
    await expect(slideChoice).toBeChecked();
    await page.getByRole('tab', { name: 'Assembly' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: hardwareLabel })).toContainText('×2');
  }
});

test('validation repairs update configuration and preserve accessible focus and issue-list relation', async ({
  appPage: page,
}) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  const heightInput = page.getByRole('spinbutton', { name: 'Height', exact: true });
  await widthInput.fill('1300');
  await widthInput.press('Enter');
  await heightInput.fill('2500');
  await heightInput.press('Enter');

  const validationToggle = page.getByRole('button', { name: /Design Checks/ });
  const issueList = page.locator('#validation-issue-list');
  await expect(page.getByText(/Cabinet width \(1300 mm\)/)).toBeVisible();
  await expect(validationToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(validationToggle).toHaveAttribute('aria-controls', 'validation-issue-list');
  await expect(issueList).toHaveAttribute('id', 'validation-issue-list');
  await expect(issueList).toHaveAttribute('aria-live', 'polite');
  await expect(issueList).toHaveAttribute('aria-atomic', 'false');

  await page.getByRole('button', { name: 'Add centre support' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Centre Supports' })).toHaveValue('1');
  await expect(page.getByText(/Cabinet width \(1300 mm\)/)).toHaveCount(0);
  await expect(validationToggle).toBeFocused();

  const backPanel = page.getByRole('checkbox', { name: 'Include back panel' });
  await backPanel.uncheck();
  await expect(page.getByText(/without back panel/)).toBeVisible();
  await page.getByRole('button', { name: 'Add back panel' }).click();
  await expect(backPanel).toBeChecked();
  await expect(page.getByText(/without back panel/)).toHaveCount(0);
  await expect(validationToggle).toBeFocused();
  await expect(issueList).toHaveAttribute('aria-live', 'polite');
});

test('cabinet removal exposes its cabinet name and protects the final cabinet', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  await page.getByRole('button', { name: /Add Cabinet/ }).click();
  const removeSecondCabinet = page.getByRole('button', { name: 'Remove Cabinet 2' });
  await expect(removeSecondCabinet).toBeVisible();
  await removeSecondCabinet.click();
  await expect(page.getByRole('button', { name: /^Cabinet 2\d+ parts$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Remove Cabinet/ })).toHaveCount(0);
});

test('cabinet duplicate, mirror, reorder, remove, and active selection reach project outputs', async ({
  appPage: page,
}) => {
  test.setTimeout(120_000);
  await page.getByRole('tab', { name: 'Configure' }).click();
  await page.getByRole('button', { name: /Add Cabinet/ }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('800');
  await widthInput.press('Enter');

  const cabinetTwo = page.getByRole('button', { name: /^Cabinet 2\d+ parts$/ });
  await cabinetTwo.dblclick();
  const cabinetNameInput = page.getByRole('textbox', { name: 'Cabinet name', exact: true });
  await cabinetNameInput.fill('Millwork');
  await cabinetNameInput.press('Enter');

  await page.getByRole('button', { name: 'Duplicate Millwork' }).click();
  await expect(page.getByRole('button', { name: /^Millwork \(copy\)\d+ parts$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Mirror Millwork (copy)' }).click();
  const mirroredCabinet = page.getByRole('button', { name: /^Millwork \(copy\) \(mirror\)/ });
  await expect(mirroredCabinet).toBeVisible();
  await expect(mirroredCabinet).toContainText('mirror');
  await page.getByRole('button', { name: 'Move cabinet up: Millwork (copy) (mirror)' }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('woodworkingshop:session');
        if (!raw) return [];
        const session = JSON.parse(raw) as { cabinets: { name: string }[] };
        return session.cabinets.map((cabinet) => cabinet.name);
      }),
    )
    .toEqual(['Cabinet 1', 'Millwork', 'Millwork (copy) (mirror)', 'Millwork (copy)']);

  await page.getByRole('button', { name: 'Remove Millwork (copy)', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Millwork \(copy\)\d+ parts$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Millwork \(copy\) \(mirror\)/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Cut Sheets' }).click();
  await expect(page.getByRole('region', { name: 'Multi-cabinet project summary' })).toContainText(
    'Cabinet 1 · Millwork · Millwork (copy) (mirror)',
  );
  const activeCabinet = page.getByRole('button', { name: 'Cabinet 1', exact: true });
  await activeCabinet.click();
  await expect(activeCabinet).toHaveAttribute('aria-current', 'true');
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(4)).toHaveText('966');

  const activeMirror = page.getByRole('button', { name: 'Millwork (copy) (mirror)', exact: true });
  await activeMirror.click();
  await expect(activeMirror).toHaveAttribute('aria-current', 'true');
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(4)).toHaveText('766');

  await page.getByRole('tab', { name: 'Assembly' }).click();
  const assemblyHeading = page.getByRole('heading', { name: /Assembly Guide/ });
  await expect(page.getByRole('button', { name: 'Millwork (copy) (mirror)', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  const mirrorAssemblySummary = await assemblyHeading.innerText();
  await page.getByRole('button', { name: 'Cabinet 1', exact: true }).click();
  await expect.poll(() => assemblyHeading.innerText()).not.toBe(mirrorAssemblySummary);

  await page.getByRole('tab', { name: 'PDF' }).click();
  const currentCabinetButton = page.getByRole('button', { name: 'Export current cabinet only' });
  const currentCabinetDownload = page.waitForEvent('download');
  await currentCabinetButton.click();
  expect((await currentCabinetDownload).suggestedFilename()).toMatch(/1000x2000x600\.pdf$/);

  const fullProjectButton = page.getByRole('button', { name: 'Export Full Project (3 cabinets)' });
  const fullProjectDownload = page.waitForEvent('download');
  await fullProjectButton.click();
  expect((await fullProjectDownload).suggestedFilename()).toMatch(/-3-cabinets-\d+-parts\.pdf$/);
});

test('project manager saves, loads, exports, imports, and rejects corrupt project files', async ({ appPage: page }) => {
  await page.getByRole('tab', { name: 'Configure' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('800');
  await widthInput.press('Enter');
  await page.getByRole('button', { name: 'Project Manager' }).click();

  const canceledDialog = page.getByRole('dialog', { name: 'Project Manager' });
  await canceledDialog.getByPlaceholder('Project name…').fill('Unsaved draft');
  await canceledDialog.getByText('Close', { exact: true }).click();
  await page.getByRole('button', { name: 'Project Manager' }).click();

  const dialog = page.getByRole('dialog', { name: 'Project Manager' });
  await expect(dialog.getByText('No saved projects')).toBeVisible();
  const nameInput = dialog.getByPlaceholder('Project name…');
  await nameInput.fill('Kitchen Revision');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText('Kitchen Revision', { exact: true })).toBeVisible();
  await expect(page.getByText('Project saved')).toBeVisible();
  await dialog.getByText('Close', { exact: true }).click();

  await widthInput.fill('900');
  await widthInput.press('Enter');
  await page.clock.runFor(2_000);
  await page.getByRole('button', { name: 'Project Manager' }).click();
  const duplicateDialog = page.getByRole('dialog', { name: 'Project Manager' });
  await duplicateDialog.getByPlaceholder('Project name…').fill('Kitchen Revision');
  await duplicateDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(duplicateDialog.getByText('Kitchen Revision', { exact: true })).toHaveCount(1);

  const exportDownload = page.waitForEvent('download');
  await duplicateDialog.getByRole('button', { name: 'Export JSON' }).first().click();
  const download = await exportDownload;
  expect(download.suggestedFilename()).toBe('Kitchen_Revision.cabinet-project.json');
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('Project export did not produce a downloadable file');

  await page.clock.runFor(2_000);
  await duplicateDialog.getByLabel('Import JSON').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: await readFile(downloadPath),
  });
  await expect(page.getByText('Project imported')).toBeVisible();
  await expect(duplicateDialog.getByText('Kitchen Revision', { exact: true })).toHaveCount(2);

  await duplicateDialog.getByRole('button', { name: 'Load', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Project Manager' })).toHaveCount(0);
  await expect(widthInput).toHaveValue('900');

  await page.getByRole('button', { name: 'Project Manager' }).click();
  const importDialog = page.getByRole('dialog', { name: 'Project Manager' });
  await importDialog.getByLabel('Import JSON').setInputFiles({
    name: 'corrupt.cabinet-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ invalid json'),
  });
  await expect(page.getByText('Invalid project file')).toBeVisible();
  await expect(importDialog.getByText('Kitchen Revision', { exact: true })).toHaveCount(2);

  await importDialog.getByLabel('Import JSON').setInputFiles({
    name: 'invalid-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ cabinets: 'not-an-array' })),
  });
  await expect(importDialog.getByText('Kitchen Revision', { exact: true })).toHaveCount(2);
});

test('canceling share copies its URL and snapshots compare, restore, and delete', async ({ appPage: page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => Promise.reject(new Error('Share canceled')),
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => Promise.resolve(localStorage.setItem('e2e:clipboard', text)),
        readText: () => Promise.resolve(localStorage.getItem('e2e:clipboard') ?? ''),
      },
    });
  });
  await page.getByRole('tab', { name: 'Configure' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('800');
  await widthInput.press('Enter');

  await page.getByRole('button', { name: 'Share Link' }).click();
  await expect(page.getByText('Shareable link copied to clipboard')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.evaluate(() => location.href));

  const snapshotToggle = page.getByRole('button', { name: 'Project Snapshots' });
  await snapshotToggle.click();
  const snapshotName = page.getByRole('textbox', { name: 'Snapshot name…' });
  await snapshotName.fill('Before');
  await page.getByRole('button', { name: 'Save Snapshot' }).click();
  await expect(page.getByText('Before', { exact: true })).toBeVisible();

  await widthInput.fill('900');
  await widthInput.press('Enter');
  await snapshotName.fill('After');
  await page.getByRole('button', { name: 'Save Snapshot' }).click();
  await expect(page.getByText('After', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Compare Snapshots', exact: true }).click();
  const diffDialog = page.getByRole('dialog', { name: 'Compare Snapshots' });
  await expect(diffDialog).toContainText('Width');
  await expect(diffDialog).toContainText('800');
  await expect(diffDialog).toContainText('900');
  await diffDialog.getByText('Close', { exact: true }).click();

  await page.getByRole('button', { name: 'Restore: Before' }).click();
  await expect(widthInput).toHaveValue('800');
  await page.getByRole('button', { name: 'Delete snapshot: After' }).click();
  await expect(page.getByText('After', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete snapshot: Before' }).click();
  await expect(page.getByText('No snapshots saved yet.')).toBeVisible();
});

test('built-in presets update configuration and parts, and saved presets survive reload', async ({ appPage: page }) => {
  const presets = [
    ['Kitchen Base', 600, 720, 550, 'Cabinet', 'Top Panel'],
    ['Kitchen Wall Unit', 600, 700, 300, 'Cabinet', 'Top Panel'],
    ['Tall Pantry', 600, 2000, 550, 'Cabinet', 'Top Panel'],
    ['Bookcase', 800, 1800, 300, 'Bookshelf', 'Adjustable Shelf'],
    ['Double Wardrobe', 1200, 2200, 600, 'Wardrobe', 'Hanging Rail'],
    ['Bathroom Vanity', 800, 850, 450, 'Cabinet', 'Drawer 1 Front'],
  ] as const;

  const configuratorTab = page.getByRole('tab', { name: 'Configure' });
  for (const [presetName, width, height, depth, furnitureType, expectedPart] of presets) {
    await configuratorTab.click();
    await page.getByRole('button', { name: new RegExp(presetName) }).click();
    await expect(page.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue(String(width));
    await expect(page.getByRole('spinbutton', { name: 'Height', exact: true })).toHaveValue(String(height));
    await expect(page.getByRole('spinbutton', { name: 'Depth', exact: true })).toHaveValue(String(depth));
    await expect(page.getByRole('radio', { name: furnitureType, exact: true })).toBeChecked();
    await showParts(page);
    await expect(partRow(page, expectedPart)).toHaveCount(1);
  }

  await configuratorTab.click();
  await page.getByRole('button', { name: 'My Saved Cabinets' }).click();
  const widthInput = page.getByRole('spinbutton', { name: 'Width' });
  await widthInput.fill('1000');
  await widthInput.press('Enter');
  await page.getByPlaceholder('Cabinet name…').fill('Custom Tall Preset');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Custom Tall Preset', { exact: true })).toBeVisible();

  await page.reload();
  await configuratorTab.click();
  const reloadedWidth = page.getByRole('spinbutton', { name: 'Width' });
  await reloadedWidth.fill('700');
  await reloadedWidth.press('Enter');
  await page.getByRole('button', { name: 'My Saved Cabinets' }).click();
  const savedPreset = page.getByText('Custom Tall Preset', { exact: true }).locator('..').locator('..');
  await savedPreset.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(reloadedWidth).toHaveValue('1000');
  await showParts(page);
  await expect(partRow(page, 'Top Panel').getByRole('cell').nth(4)).toHaveText('964');
});

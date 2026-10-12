import { render } from 'vitest-browser-react';
import { beforeEach, describe, expect, it } from 'vitest';
import { page as screen } from 'vitest/browser';
import '../../src/i18n';
import { Preview3DPanel } from '../../src/components/preview/Preview3DPanel';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { useCabinetStore } from '../../src/store/cabinet-store';

function sampleCanvasPixels(): number[] {
  const canvas = document.querySelector('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Preview canvas was not rendered');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser did not provide a 2D canvas context');

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const sample = new Set<number>();
  for (let index = 0; index < pixels.length; index += 4 * 16) {
    sample.add(
      ((pixels[index] ?? 0) << 24) |
        ((pixels[index + 1] ?? 0) << 16) |
        ((pixels[index + 2] ?? 0) << 8) |
        (pixels[index + 3] ?? 0),
    );
  }
  return [...sample];
}

describe('Preview3DPanel in Chromium', () => {
  beforeEach(() => {
    useCabinetStore.setState({
      config: { ...DEFAULT_CONFIG },
      darkMode: false,
      units: 'metric',
    });
  });

  it('draws the preview canvas and updates its raster when wireframe is enabled', async () => {
    await render(<Preview3DPanel />);
    const canvas = screen.getByLabelText(/parts?/i);
    await expect.element(canvas).toBeInTheDocument();

    const filledPixels = sampleCanvasPixels();
    expect(filledPixels.length).toBeGreaterThan(2);

    await screen.getByLabelText(/Wireframe/i).click();
    await expect.element(screen.getByLabelText(/Wireframe/i)).toBeChecked();
    expect(sampleCanvasPixels()).not.toEqual(filledPixels);
  });
});

import { fireEvent, screen, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeDimensions } from '../../src/engine/dimensions';
import { DEFAULT_CONFIG, getMaterial } from '../../src/engine/materials';
import { FrontOpenView } from '../../src/components/preview/FrontOpenView';
import { S } from '../../src/components/preview/preview-constants';
import type { TooltipHandlers } from '../../src/components/preview/preview-svg-parts';

const setPointerCaptureDescriptor = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'setPointerCapture');

describe('FrontOpenView shelf drag precision', () => {
  afterEach(() => {
    if (setPointerCaptureDescriptor) {
      Object.defineProperty(SVGElement.prototype, 'setPointerCapture', setPointerCaptureDescriptor);
    } else {
      Reflect.deleteProperty(SVGElement.prototype, 'setPointerCapture');
    }
  });

  it.each([
    { pointerType: 'pen', pressure: 0.2, expectedPosition: 100.3 },
    { pointerType: 'pen', pressure: 0.8, expectedPosition: 100.3 },
    { pointerType: 'mouse', pressure: 0.5, expectedPosition: 100 },
    { pointerType: 'touch', pressure: 0.5, expectedPosition: 100 },
  ])('uses $pointerType input with pressure $pressure', ({ pointerType, pressure, expectedPosition }) => {
    const config = { ...DEFAULT_CONFIG };
    const dimensions = computeDimensions(config);
    const material = getMaterial(config.carcassMaterial);
    const dimPad = 45;
    const heightSvg = config.height * S;
    const thicknessSvg = material.thickness * S;
    const setConfig = vi.fn();
    const tooltipHandlers: TooltipHandlers = {
      onHover: vi.fn(),
      onLeave: vi.fn(),
      onMove: vi.fn(),
    };

    render(
      <FrontOpenView
        W={config.width * S}
        H={heightSvg}
        T={thicknessSvg}
        thick={material.thickness}
        color={material.color}
        carcassMatName={material.name.en}
        d={dimensions}
        config={config}
        shelfPositions={[100, 300]}
        centreSupportXs={[]}
        showDims={false}
        dimPad={dimPad}
        fd={(millimeters) => String(millimeters)}
        tp={tooltipHandlers}
        setConfig={setConfig}
      />,
    );

    const svg = screen.getByRole('group', { name: 'Cabinet drawing' });
    const shelf = screen.getByText(/Shelf 1/);
    const targetSvgY = dimPad + heightSvg - thicknessSvg - 100.26 * S;
    const svgPoint = {
      x: 0,
      y: 0,
      matrixTransform: () => ({ x: 0, y: targetSvgY }),
    };

    Object.defineProperty(svg, 'createSVGPoint', { configurable: true, value: () => svgPoint });
    Object.defineProperty(svg, 'getScreenCTM', { configurable: true, value: () => ({ inverse: () => ({}) }) });
    Object.defineProperty(SVGElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });

    fireEvent.pointerDown(shelf, { pointerId: 1, pointerType, pressure });
    fireEvent.pointerMove(svg, { pointerId: 1, pointerType, pressure, clientY: 0 });

    expect(setConfig).toHaveBeenLastCalledWith({
      shelfSpacing: 'custom',
      customShelfPositions: [expectedPosition, 300],
    });
  });
});

import { describe, it, expect } from 'vitest';
import INCHCALCULATOR_FRAME_PANEL_ORACLE from '../fixtures/oracles/inchcalculator-frame-panel.json';
import { calculateFramePanel } from '../../src/engine/frame-panel';

describe('calculateFramePanel', () => {
  it('matches the published cabinet-door panel-width example', () => {
    const result = calculateFramePanel(INCHCALCULATOR_FRAME_PANEL_ORACLE.engineInput);

    expect(result.panelWidthMm).toBe(INCHCALCULATOR_FRAME_PANEL_ORACLE.expected.panelWidthMm);
  });

  const BASE = {
    frameWidthMm: 600,
    frameHeightMm: 900,
    stileWidthMm: 60,
    railWidthMm: 70,
    grooveDepthMm: 9.5,
    panelFloatMm: 3,
    grooveWidthMm: 6.35,
  };

  it('computes panel dimensions from opening + groove - float', () => {
    const result = calculateFramePanel(BASE);
    const expectedWidth = 600 - 2 * 60 + 2 * 9.5 - 2 * 3;
    const expectedHeight = 900 - 2 * 70 + 2 * 9.5 - 2 * 3;
    expect(result.panelWidthMm).toBeCloseTo(expectedWidth, 1);
    expect(result.panelHeightMm).toBeCloseTo(expectedHeight, 1);
  });

  it('rounds independently calculated panel dimensions to a tenth of a millimetre', () => {
    const result = calculateFramePanel({
      frameWidthMm: 500.06,
      frameHeightMm: 700.04,
      stileWidthMm: 50,
      railWidthMm: 60,
      grooveDepthMm: 9.5,
      panelFloatMm: 3,
    });

    expect(result.panelWidthMm).toBe(413.1);
    expect(result.panelHeightMm).toBe(593);
  });

  it('total width float = 2 × panelFloat', () => {
    const result = calculateFramePanel(BASE);
    expect(result.widthFloatMm).toBe(6);
    expect(result.heightFloatMm).toBe(6);
  });

  it('panel is smaller than the frame opening', () => {
    const result = calculateFramePanel(BASE);
    const openingW = 600 - 2 * 60;
    const openingH = 900 - 2 * 70;
    expect(result.panelWidthMm).toBeLessThan(openingW + 2 * 9.5);
    expect(result.panelHeightMm).toBeLessThan(openingH + 2 * 9.5);
  });

  it('uses defaults when optional fields are omitted', () => {
    const result = calculateFramePanel({
      frameWidthMm: 500,
      frameHeightMm: 700,
      stileWidthMm: 55,
      railWidthMm: 65,
    });
    expect(result.grooveDepthMm).toBe(9.5);
    expect(result.grooveWidthMm).toBeCloseTo(6.35, 1);
  });

  describe('error guards', () => {
    it.each([
      ['zero frameWidth', { ...BASE, frameWidthMm: 0 }],
      ['zero frameHeight', { ...BASE, frameHeightMm: 0 }],
      ['zero stileWidth', { ...BASE, stileWidthMm: 0 }],
      ['zero railWidth', { ...BASE, railWidthMm: 0 }],
      ['stiles wider than frame', { ...BASE, stileWidthMm: 350 }],
      ['rails taller than frame', { ...BASE, railWidthMm: 500 }],
      ['negative panelFloat', { ...BASE, panelFloatMm: -1 }],
      ['NaN frame width', { ...BASE, frameWidthMm: Number.NaN }],
      ['infinite frame height', { ...BASE, frameHeightMm: Number.POSITIVE_INFINITY }],
      ['infinite stile width', { ...BASE, stileWidthMm: Number.POSITIVE_INFINITY }],
      ['NaN rail width', { ...BASE, railWidthMm: Number.NaN }],
      ['NaN groove depth', { ...BASE, grooveDepthMm: Number.NaN }],
      ['infinite panel float', { ...BASE, panelFloatMm: Number.POSITIVE_INFINITY }],
      ['zero groove width', { ...BASE, grooveWidthMm: 0 }],
      ['NaN groove width', { ...BASE, grooveWidthMm: Number.NaN }],
      ['float leaves no panel', { ...BASE, panelFloatMm: 500 }],
    ])('throws for %s', (_label, input) => {
      expect(() => calculateFramePanel(input)).toThrow(RangeError);
    });
  });
});

import { describe, expect, it } from 'vitest';
import KREG_LOWER_CABINET_ORACLE from '../fixtures/oracles/kreg-lower-cabinet.json';
import { computeDimensions } from '../../src/engine/dimensions';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import { generateParts } from '../../src/engine/parts';
import { cfg, makeMaterial } from '../helpers';

describe('Kreg lower-cabinet independent oracle', () => {
  it('reconciles derived dimensions, side-panel parts, and half-sheet composition', () => {
    const oracle = KREG_LOWER_CABINET_ORACLE.convertedMm;
    const material = makeMaterial({
      key: 'kreg-oracle-plywood',
      name: { en: 'Kreg oracle plywood', he: 'Kreg oracle plywood' },
      thickness: oracle.panelThickness,
      sheetWidth: oracle.halfSheetWidth,
      sheetLength: oracle.halfSheetLength,
      hasGrain: true,
    });
    const cabinetConfig = cfg({
      width: oracle.cabinetWidth,
      height: oracle.cabinetHeight,
      depth: oracle.cabinetDepth,
      shelfCount: 0,
      carcassMaterial: material.key,
      hasBack: false,
      doorStyle: 'none',
      doorCount: 1,
      drawerCount: 0,
      edgeBanding: 'none',
    });
    const partConfig = cfg({
      width: oracle.cabinetWidth,
      height: oracle.cabinetHeight,
      depth: oracle.sidePanelWidth,
      shelfCount: 0,
      carcassMaterial: material.key,
      hasBack: false,
      doorStyle: 'none',
      doorCount: 1,
      drawerCount: 0,
      edgeBanding: 'none',
    });

    const dimensions = computeDimensions(cabinetConfig, [material]);
    const parts = generateParts(partConfig, [material]);
    const sidePanels = parts.filter((part) => part.name.en === 'Side Panel');
    const composition = optimizeCutSheets(
      sidePanels,
      3,
      {
        [material.key]: {
          width: oracle.halfSheetWidth,
          length: oracle.halfSheetLength,
        },
      },
      'freeform',
      [],
      {},
      [material],
    );

    expect(dimensions).toMatchObject({
      internalWidth: oracle.cabinetWidth - 2 * oracle.panelThickness,
      internalHeight: oracle.cabinetHeight - 2 * oracle.panelThickness,
      shelfDepth: oracle.cabinetDepth - 20,
      shelfWidth: oracle.cabinetWidth - 2 * oracle.panelThickness - 2,
    });
    expect(sidePanels).toHaveLength(1);
    expect(sidePanels[0]).toMatchObject({
      qty: KREG_LOWER_CABINET_ORACLE.publishedPlan.sidePanel.quantity,
      length: oracle.sidePanelLength,
      width: oracle.sidePanelWidth,
      thickness: oracle.panelThickness,
    });
    expect(composition.totalSheets).toBe(1);
    expect(composition.sheets[0]?.parts).toHaveLength(KREG_LOWER_CABINET_ORACLE.publishedPlan.sidePanel.quantity);
  });
});

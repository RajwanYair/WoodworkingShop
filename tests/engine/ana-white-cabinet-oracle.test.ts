import { describe, expect, it } from 'vitest';
import ANA_WHITE_BASE_CABINET_ORACLE from '../fixtures/oracles/ana-white-face-frame-base.json';
import { generateParts } from '../../src/engine/parts';
import { cfg, makeMaterial } from '../helpers';

describe('Ana White face-frame base cabinet independent oracle', () => {
  it('generates the published side-panel count and cut dimensions', () => {
    const oracle = ANA_WHITE_BASE_CABINET_ORACLE.convertedMm;
    const material = makeMaterial({
      key: 'ana-white-oracle-plywood',
      name: { en: 'Ana White oracle plywood', he: 'Ana White oracle plywood' },
      thickness: oracle.panelThickness,
    });
    const config = cfg({
      height: oracle.sidePanelLength,
      depth: oracle.sidePanelWidth,
      shelfCount: 0,
      carcassMaterial: material.key,
      hasBack: false,
      doorStyle: 'none',
      doorCount: 1,
      drawerCount: 0,
      edgeBanding: 'none',
    });

    const sidePanels = generateParts(config, [material]).filter((part) => part.name.en === 'Side Panel');

    expect(sidePanels).toHaveLength(1);
    expect(sidePanels[0]).toMatchObject({
      qty: ANA_WHITE_BASE_CABINET_ORACLE.publishedPlan.sidePanels.quantity,
      length: oracle.sidePanelLength,
      width: oracle.sidePanelWidth,
      thickness: oracle.panelThickness,
    });
  });
});

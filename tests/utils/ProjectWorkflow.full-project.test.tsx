import { describe, it, expect } from 'vitest';
import { pdf } from '@react-pdf/renderer';

import { useCabinetStore, type CabinetEntry } from '../../src/store/cabinet-store';
import { cfg } from '../helpers';
import { buildProjectExport, isProjectExport } from '../../src/components/configurator/save-load-json';
import { CabinetPdfDocument, type CabinetPdfEntry } from '../../src/components/pdf/CabinetPdfDocument';
import { computeDimensions } from '../../src/engine/dimensions';
import { computeEdgeBandingTotal, generateParts } from '../../src/engine/parts';
import { generateHardware } from '../../src/engine/hardware';

describe('Full project workflow - apt. cabinets', () => {
  it('exports/imports a multi-cabinet project JSON and generates full-project PDF', { timeout: 120000 }, async () => {
    const projectName = 'apt. cabinets';

    const cabinets: CabinetEntry[] = [
      {
        name: 'Cabinet',
        config: cfg({
          furnitureType: 'cabinet',
          height: 690,
          width: 1120,
          depth: 300,
          shelfCount: 3,
          carcassMaterial: 'plywood-17',
          backPanelMaterial: 'plywood-4',
          hasBack: true,
        }),
      },
      {
        name: 'bookshelf',
        config: cfg({
          furnitureType: 'bookshelf',
          height: 2000,
          width: 950,
          depth: 100,
          shelfCount: 12,
          carcassMaterial: 'plywood-17',
          backPanelMaterial: 'plywood-4',
          hasBack: false,
          doorStyle: 'none',
          doorCount: 1,
        }),
      },
      {
        name: 'plate base for existent cabinet',
        config: cfg({
          furnitureType: 'panel',
          height: 1120,
          width: 390,
          depth: 17,
          shelfCount: 0,
          carcassMaterial: 'plywood-17',
          backPanelMaterial: 'plywood-4',
          panelMaterialSource: 'carcass',
          hasBack: false,
          doorStyle: 'none',
          drawerCount: 0,
        }),
      },
      {
        name: 'plate bed base',
        config: cfg({
          furnitureType: 'panel',
          height: 1700,
          width: 800,
          depth: 17,
          shelfCount: 0,
          carcassMaterial: 'plywood-17',
          backPanelMaterial: 'plywood-4',
          panelMaterialSource: 'carcass',
          hasBack: false,
          doorStyle: 'none',
          drawerCount: 0,
        }),
      },
      {
        name: 'plate bed base',
        config: cfg({
          furnitureType: 'panel',
          height: 1700,
          width: 800,
          depth: 17,
          shelfCount: 0,
          carcassMaterial: 'plywood-17',
          backPanelMaterial: 'plywood-4',
          panelMaterialSource: 'carcass',
          hasBack: false,
          doorStyle: 'none',
          drawerCount: 0,
        }),
      },
      {
        name: 'plate standalone',
        config: cfg({
          furnitureType: 'panel',
          height: 1470,
          width: 1120,
          depth: 4,
          shelfCount: 0,
          carcassMaterial: 'plywood-17',
          backPanelMaterial: 'plywood-4',
          panelMaterialSource: 'back',
          hasBack: true,
          doorStyle: 'none',
          drawerCount: 0,
        }),
      },
    ];

    const exportPayload = buildProjectExport(cabinets, projectName, '');
    expect(isProjectExport(exportPayload)).toBe(true);
    expect(exportPayload.cabinets).toHaveLength(6);

    const roundTripPayload = JSON.parse(JSON.stringify(exportPayload));
    expect(isProjectExport(roundTripPayload)).toBe(true);

    useCabinetStore.getState().setProjectName(projectName);
    useCabinetStore.getState().loadProject(roundTripPayload.cabinets);

    const state = useCabinetStore.getState();
    expect(state.cabinets).toHaveLength(6);
    expect(state.cabinets.map((c) => c.name)).toEqual(cabinets.map((c) => c.name));

    const allCabinetsData: CabinetPdfEntry[] = state.cabinets.map((cab, ci) => {
      const cabParts = generateParts(cab.config).map((p) => ({
        ...p,
        id: state.cabinets.length > 1 ? `C${ci + 1}-${p.id}` : p.id,
      }));
      return {
        name: cab.name,
        config: cab.config,
        dimensions: computeDimensions(cab.config),
        parts: cabParts,
        hardware: generateHardware(cab.config),
        edgeBandingTotal: computeEdgeBandingTotal(cabParts),
      };
    });

    const mergedHardware = new Map<string, (typeof allCabinetsData)[0]['hardware'][0]>();
    for (const cab of allCabinetsData) {
      for (const hw of cab.hardware) {
        const existing = mergedHardware.get(hw.id);
        if (existing) {
          mergedHardware.set(hw.id, { ...existing, qty: existing.qty + hw.qty });
        } else {
          mergedHardware.set(hw.id, { ...hw });
        }
      }
    }

    const doc = (
      <CabinetPdfDocument
        config={state.config}
        dimensions={state.dimensions}
        parts={state.parts}
        hardware={state.hardware}
        optimization={state.optimization}
        edgeBandingTotal={state.edgeBandingTotal}
        lang="en"
        projectName={projectName}
        includeCover
        cabinetCount={state.cabinets.length}
        allCabinetsData={allCabinetsData}
        combinedOptimization={state.combinedOptimization}
        allHardware={Array.from(mergedHardware.values())}
      />
    );

    const blob = await pdf(doc).toBlob();
    expect(blob.size).toBeGreaterThan(1024);
  });
});

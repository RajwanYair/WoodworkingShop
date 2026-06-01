import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import { useCabinetStore, type CabinetEntry } from '../../src/store/cabinet-store';
import { cfg } from '../helpers';
import { CabinetPdfDocument, type CabinetPdfEntry } from '../../src/components/pdf/CabinetPdfDocument';
import { computeDimensions } from '../../src/engine/dimensions';
import { computeEdgeBandingTotal, generateParts } from '../../src/engine/parts';
import { generateHardware } from '../../src/engine/hardware';

type BudgetConfig = {
  fullProject: {
    minPdfBlobBytes: number;
    maxPdfBlobBytes: number;
    maxConsoleWarnings: number;
    maxConsoleErrors: number;
  };
};

function readBudgetConfig(): BudgetConfig {
  const budgetPath = path.resolve(process.cwd(), 'config', 'pdf-warning-budget.json');
  return JSON.parse(fs.readFileSync(budgetPath, 'utf8')) as BudgetConfig;
}

describe('pdf rendering budget guard', () => {
  it('keeps full-project PDF rendering within warning and size budgets', { timeout: 120000 }, async () => {
    const budget = readBudgetConfig().fullProject;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
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

      useCabinetStore.getState().setProjectName(projectName);
      useCabinetStore.getState().loadProject(cabinets);

      const state = useCabinetStore.getState();
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
      expect(blob.size).toBeGreaterThanOrEqual(budget.minPdfBlobBytes);
      expect(blob.size).toBeLessThanOrEqual(budget.maxPdfBlobBytes);

      const warningCalls = warnSpy.mock.calls.length;
      const errorCalls = errorSpy.mock.calls.length;
      expect(warningCalls).toBeLessThanOrEqual(budget.maxConsoleWarnings);
      expect(errorCalls).toBeLessThanOrEqual(budget.maxConsoleErrors);
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});

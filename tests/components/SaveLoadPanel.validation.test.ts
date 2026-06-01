import { describe, it, expect } from 'vitest';
import {
  buildCabinetExport,
  buildProjectExport,
  isProjectExport,
  isValidConfig,
} from '../../src/components/configurator/save-load-json';
import { cfg } from '../helpers';

describe('SaveLoadPanel JSON guards', () => {
  it.each([
    {
      name: 'accepts panel-like low depth config',
      config: {
        width: 390,
        height: 1120,
        depth: 18,
        shelfCount: 0,
        carcassMaterial: 'plywood-18',
        backPanelMaterial: 'mdf-6',
      },
    },
    {
      name: 'accepts shallow bookshelf config',
      config: {
        width: 600,
        height: 2000,
        depth: 100,
        shelfCount: 5,
        carcassMaterial: 'plywood-18',
        backPanelMaterial: 'mdf-6',
      },
    },
  ])('isValidConfig $name', ({ config }) => {
    expect(isValidConfig(config)).toBe(true);
  });

  it('accepts multi-cabinet project export payload', () => {
    const payload = {
      version: 1,
      cabinets: [
        {
          name: 'Bookshelf',
          config: {
            width: 800,
            height: 2100,
            depth: 280,
            shelfCount: 6,
            carcassMaterial: 'plywood-18',
            backPanelMaterial: 'mdf-6',
          },
        },
        {
          name: 'Plate 1',
          config: {
            width: 390,
            height: 1120,
            depth: 18,
            shelfCount: 0,
            carcassMaterial: 'plywood-18',
            backPanelMaterial: 'mdf-6',
          },
        },
      ],
    };

    expect(isProjectExport(payload)).toBe(true);
  });

  it('buildProjectExport keeps all cabinets and optional metadata', () => {
    const cabinets = [
      {
        name: 'Cabinet A',
        config: cfg({
          width: 700,
          height: 900,
          depth: 300,
          shelfCount: 2,
          carcassMaterial: 'plywood-18',
          backPanelMaterial: 'mdf-6',
        }),
      },
      {
        name: 'Cabinet B',
        config: cfg({
          width: 500,
          height: 2100,
          depth: 350,
          shelfCount: 4,
          carcassMaterial: 'plywood-18',
          backPanelMaterial: 'mdf-6',
        }),
      },
    ];

    const payload = buildProjectExport(cabinets, '  Kitchen Project  ', '  Notes  ');
    expect(payload.cabinets).toHaveLength(2);
    expect(payload.cabinets[0]?.name).toBe('Cabinet A');
    expect(payload.cabinets[1]?.name).toBe('Cabinet B');
    expect(payload.projectName).toBe('Kitchen Project');
    expect(payload.projectNotes).toBe('Notes');
    expect(isProjectExport(payload)).toBe(true);
  });

  it('buildCabinetExport wraps a single cabinet payload', () => {
    const cabinet = {
      name: 'Single Cabinet',
      config: cfg({
        width: 600,
        height: 800,
        depth: 400,
        shelfCount: 2,
        carcassMaterial: 'plywood-18',
        backPanelMaterial: 'mdf-6',
      }),
    };

    const payload = buildCabinetExport(cabinet);
    expect(payload.version).toBe(1);
    expect(payload.cabinet.name).toBe('Single Cabinet');
    expect(isValidConfig(payload.cabinet.config)).toBe(true);
  });

  it.each([
    {
      name: 'missing material keys',
      payload: {
        version: 1,
        cabinets: [{ name: 'Broken', config: { width: 600, height: 800, depth: 400, shelfCount: 2 } }],
      },
    },
    {
      name: 'empty cabinet list',
      payload: { version: 1, cabinets: [] },
    },
  ])('rejects invalid project export: $name', ({ payload }) => {
    expect(isProjectExport(payload)).toBe(false);
  });
});

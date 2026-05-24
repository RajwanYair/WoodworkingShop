/**
 * IFC 2x3 BIM Export — Future Horizons / Sprint 11
 *
 * Tests for src/utils/ifc-export.ts
 */
import { describe, it, expect } from 'vitest';
import { exportToIfc, guid } from '../../src/utils/ifc-export';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { CabinetEntry } from '../../src/store/cabinet-store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCabinet(name: string, w = 600, h = 720, d = 580): CabinetEntry {
  return { name, config: { ...DEFAULT_CONFIG, width: w as never, height: h as never, depth: d as never } };
}

// ── guid() ────────────────────────────────────────────────────────────────────

describe('guid', () => {
  it('produces a string of the expected UUID format', () => {
    const g = guid();
    expect(g).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generates unique values', () => {
    const guids = new Set(Array.from({ length: 200 }, guid));
    expect(guids.size).toBe(200);
  });
});

// ── exportToIfc ───────────────────────────────────────────────────────────────

describe('exportToIfc structure', () => {
  it('wraps content with ISO-10303-21 header and footer', () => {
    const { content } = exportToIfc([makeCabinet('K')]);
    expect(content).toContain('ISO-10303-21;');
    expect(content).toContain('END-ISO-10303-21;');
  });

  it('declares IFC2X3 schema', () => {
    const { content } = exportToIfc([makeCabinet('K')]);
    expect(content).toContain("FILE_SCHEMA(('IFC2X3'))");
  });

  it('contains MILLIMETRE unit assignment', () => {
    const { content } = exportToIfc([makeCabinet('K')]);
    expect(content).toContain('.MILLIMETRE.');
  });

  it('contains IfcProject entity', () => {
    const { content } = exportToIfc([makeCabinet('K')]);
    expect(content).toContain('IFCPROJECT(');
  });

  it('contains IfcSite, IfcBuilding, IfcBuildingStorey', () => {
    const { content } = exportToIfc([makeCabinet('K')]);
    expect(content).toContain('IFCSITE(');
    expect(content).toContain('IFCBUILDING(');
    expect(content).toContain('IFCBUILDINGSTOREY(');
  });

  it('contains spatial hierarchy aggregation relations', () => {
    const { content } = exportToIfc([makeCabinet('K')]);
    const count = (content.match(/IFCRELAGGREGATES/g) ?? []).length;
    expect(count).toBe(3); // project→site, site→building, building→storey
  });
});

describe('exportToIfc furnishing elements', () => {
  it('furnishingCount equals number of cabinets', () => {
    const cabinets = [makeCabinet('A'), makeCabinet('B'), makeCabinet('C')];
    const { furnishingCount } = exportToIfc(cabinets);
    expect(furnishingCount).toBe(3);
  });

  it('emits zero furnishings for empty input', () => {
    const { furnishingCount, content } = exportToIfc([]);
    expect(furnishingCount).toBe(0);
    expect(content).not.toContain('IFCFURNISHINGELEMENT');
  });

  it('contains IFCFURNISHINGELEMENT for each cabinet', () => {
    const { content } = exportToIfc([makeCabinet('Kitchen'), makeCabinet('Pantry')]);
    const count = (content.match(/IFCFURNISHINGELEMENT/g) ?? []).length;
    expect(count).toBe(2);
  });

  it('includes cabinet name in the furnishing element', () => {
    const { content } = exportToIfc([makeCabinet('MyKitchenUnit')]);
    expect(content).toContain("'MyKitchenUnit'");
  });

  it('contains IfcExtrudedAreaSolid for each cabinet', () => {
    const { content } = exportToIfc([makeCabinet('X'), makeCabinet('Y')]);
    const count = (content.match(/IFCEXTRUDEDAREASOLID/g) ?? []).length;
    expect(count).toBe(2);
  });

  it('contains IfcRectangleProfileDef for each cabinet', () => {
    const { content } = exportToIfc([makeCabinet('X'), makeCabinet('Y')]);
    const count = (content.match(/IFCRECTANGLEPROFILEDEF/g) ?? []).length;
    expect(count).toBe(2);
  });

  it('contains IFCRELCONTAINEDINSPATIALSTRUCTURE when cabinets present', () => {
    const { content } = exportToIfc([makeCabinet('K')]);
    expect(content).toContain('IFCRELCONTAINEDINSPATIALSTRUCTURE');
  });

  it('does NOT contain IFCRELCONTAINEDINSPATIALSTRUCTURE for empty input', () => {
    const { content } = exportToIfc([]);
    expect(content).not.toContain('IFCRELCONTAINEDINSPATIALSTRUCTURE');
  });
});

describe('exportToIfc dimensions', () => {
  it('embeds cabinet width in the profile', () => {
    const { content } = exportToIfc([makeCabinet('W900', 900)]);
    expect(content).toContain('IFCRECTANGLEPROFILEDEF(.AREA.,$,');
    expect(content).toContain('900.');
  });

  it('embeds cabinet height as extrusion depth', () => {
    const { content } = exportToIfc([makeCabinet('H800', 600, 800)]);
    expect(content).toContain('IFCEXTRUDEDAREASOLID(');
    expect(content).toContain('800.');
  });
});

describe('exportToIfc placement', () => {
  it('respects custom startX option', () => {
    const { content } = exportToIfc([makeCabinet('K', 600)], { startX: 1000 });
    expect(content).toContain('IFCCARTESIANPOINT((1000.,0.,0.))');
  });

  it('places second cabinet width + gap after first', () => {
    const gap = 20;
    const { content } = exportToIfc([makeCabinet('A', 600), makeCabinet('B', 400)], {
      startX: 0,
      gapMm: gap,
    });
    // Second cabinet should start at 600 + 20 = 620
    expect(content).toContain('IFCCARTESIANPOINT((620.,0.,0.))');
  });
});

describe('exportToIfc options', () => {
  it('embeds custom author in FILE_NAME', () => {
    const { content } = exportToIfc([makeCabinet('K')], { author: 'ACME Corp' });
    expect(content).toContain('ACME Corp');
  });

  it('embeds custom appVersion in FILE_NAME and application', () => {
    const { content } = exportToIfc([makeCabinet('K')], { appVersion: '9.9.9' });
    expect(content).toContain('9.9.9');
  });
});

describe('exportToIfc entity IDs', () => {
  it('all entity IDs are sequential and start at #1', () => {
    const { content } = exportToIfc([makeCabinet('K')]);
    const ids = [...content.matchAll(/^#(\d+)=/gm)].map((m) => parseInt(m[1]));
    expect(ids[0]).toBe(1);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBe(ids[i - 1] + 1);
    }
  });
});

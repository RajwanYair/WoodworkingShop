import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import { deriveRawStockDimensions } from '../../src/engine/edge-banding';
import type { BandedEdge, Part } from '../../src/engine/types';
import { propertyRunOptions } from '../property-seeds';

const EDGES: readonly BandedEdge[] = ['length-start', 'length-end', 'width-start', 'width-end'];
const ROTATED_EDGE: Record<BandedEdge, BandedEdge> = {
  'length-start': 'width-end',
  'length-end': 'width-start',
  'width-start': 'length-start',
  'width-end': 'length-end',
};

const arbParts: fc.Arbitrary<Part[]> = fc
  .array(
    fc.record({
      length: fc.integer({ min: 100, max: 900 }),
      width: fc.integer({ min: 100, max: 900 }),
      qty: fc.integer({ min: 1, max: 3 }),
      edgeMask: fc.integer({ min: 0, max: 15 }),
      bandThicknessMm: fc.integer({ min: 0, max: 3 }),
      trimAllowanceMm: fc.integer({ min: 0, max: 3 }),
      rotationLocked: fc.boolean(),
      grainConstraint: fc.constantFrom<'along-length' | 'along-width' | undefined>(
        undefined,
        'along-length',
        'along-width',
      ),
    }),
    { minLength: 1, maxLength: 4 },
  )
  .map((entries) =>
    entries.map((entry, index): Part => {
      const bandedEdges = EDGES.filter((_, edgeIndex) => (entry.edgeMask & (1 << edgeIndex)) !== 0);
      const dimensions = deriveRawStockDimensions(entry.length, entry.width, bandedEdges, {
        enabled: true,
        bandThicknessMm: entry.bandThicknessMm,
        trimAllowanceMm: entry.trimAllowanceMm,
      });
      return {
        id: `edge-part-${index}`,
        name: { en: `Edge part ${index}`, he: `Edge part ${index}` },
        qty: entry.qty,
        material: 'plywood-18',
        thickness: 18,
        length: entry.length,
        width: entry.width,
        rawLength: dimensions.length,
        rawWidth: dimensions.width,
        edgeBanding: { en: bandedEdges.length > 0 ? 'Banded' : 'None', he: bandedEdges.length > 0 ? 'Banded' : 'None' },
        bandedEdges,
        rotationLocked: entry.rotationLocked,
        grainConstraint: entry.grainConstraint,
      };
    }),
  );

describe('edge-banding optimizer property tests', () => {
  it('preserves finished geometry and edge identities while packing raw blanks within sheet bounds', () => {
    fc.assert(
      fc.property(arbParts, (parts) => {
        const result = optimizeCutSheets(parts, 0);
        const placedParts = result.sheets.flatMap((sheet) => sheet.parts);
        const expectedCount = parts.reduce((sum, part) => sum + part.qty, 0);

        return (
          placedParts.length === expectedCount &&
          result.sheets.every((sheet) =>
            sheet.parts.every((placed) => {
              const source = parts.find((part) => part.id === placed.partId);
              if (!source) return false;
              const rotated = placed.rotated === true;
              const expectedEdges = source.bandedEdges?.map((edge) => (rotated ? ROTATED_EDGE[edge] : edge));
              return (
                placed.x >= 0 &&
                placed.y >= 0 &&
                placed.x + placed.width <= sheet.sheetWidth &&
                placed.y + placed.length <= sheet.sheetLength &&
                placed.width === (rotated ? source.rawLength : source.rawWidth) &&
                placed.length === (rotated ? source.rawWidth : source.rawLength) &&
                placed.finishedWidth === (rotated ? source.length : source.width) &&
                placed.finishedLength === (rotated ? source.width : source.length) &&
                JSON.stringify(placed.bandedEdges) === JSON.stringify(expectedEdges) &&
                (source.rotationLocked !== true || !rotated)
              );
            }),
          )
        );
      }),
      propertyRunOptions('tests/engine/edge-banding.property.test.ts', 100),
    );
  });

  it('places an unbanded part exactly on the full sheet boundary', () => {
    const fullSheetPart: Part = {
      id: 'full-sheet',
      name: { en: 'Full sheet', he: 'Full sheet' },
      qty: 1,
      material: 'plywood-18',
      thickness: 18,
      length: 2440,
      width: 1220,
      edgeBanding: { en: 'None', he: 'None' },
      bandedEdges: [],
      rawLength: 2440,
      rawWidth: 1220,
      rotationLocked: true,
    };
    const result = optimizeCutSheets([fullSheetPart], 0);
    const placed = result.sheets[0]?.parts[0];

    expect(placed).toMatchObject({ x: 0, y: 0, width: 1220, length: 2440, rotated: false });
    expect(placed && placed.x + placed.width).toBe(result.sheets[0]?.sheetWidth);
    expect(placed && placed.y + placed.length).toBe(result.sheets[0]?.sheetLength);
  });
});

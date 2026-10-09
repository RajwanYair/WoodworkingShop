import { describe, expect, it } from 'vitest';
import { getEdgeBandingLines } from '../../src/components/optimizer/edge-banding-markers';

describe('getEdgeBandingLines', () => {
  it('maps each structured edge to its corresponding rectangle boundary', () => {
    expect(getEdgeBandingLines(['length-start', 'length-end', 'width-start', 'width-end'], 2, 3, 5, 7)).toEqual([
      { edge: 'length-start', x1: 2, y1: 3, x2: 7, y2: 3 },
      { edge: 'length-end', x1: 2, y1: 10, x2: 7, y2: 10 },
      { edge: 'width-start', x1: 2, y1: 3, x2: 2, y2: 10 },
      { edge: 'width-end', x1: 7, y1: 3, x2: 7, y2: 10 },
    ]);
  });

  it('returns no marker lines when there are no banded edges', () => {
    expect(getEdgeBandingLines([], 2, 3, 5, 7)).toEqual([]);
  });
});

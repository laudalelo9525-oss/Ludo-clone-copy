import { describe, expect, it } from 'vitest';
import { dieFace, pawnPiece } from './pieces';

describe('pieces', () => {
  it('draws a pawn in the requested colour', () => {
    expect(pawnPiece('#e5484d')).toContain('#e5484d');
  });

  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
    [6, 6],
  ])('draws %i pips for a %i', (value, pips) => {
    const svg = dieFace(value);

    expect(svg.match(/<circle/g) ?? []).toHaveLength(pips);
  });

  it('draws a blank die before the first roll', () => {
    expect(dieFace(0).match(/<circle/g)).toBeNull();
  });
});

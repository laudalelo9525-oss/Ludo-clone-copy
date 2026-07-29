import { describe, expect, it } from 'vitest';
import boardContract from '../../../shared/board-constants.json';
import { GRID_SIZE, cellFor, mainTrack, startCellFor, toAbsolute } from './board-geometry';

describe('board geometry', () => {
  it('has one cell per main track position', () => {
    expect(mainTrack()).toHaveLength(boardContract.mainTrackLength);
  });

  it('never places a cell outside the grid', () => {
    for (const cell of mainTrack()) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(GRID_SIZE);
      expect(cell.y).toBeLessThan(GRID_SIZE);
    }
  });

  it('never reuses a main track cell', () => {
    const seen = new Set(mainTrack().map((cell) => `${cell.x},${cell.y}`));

    expect(seen.size).toBe(boardContract.mainTrackLength);
  });

  it('walks the loop one step at a time, turning only at the four arm corners', () => {
    const track = mainTrack();
    const corners: number[] = [];

    for (let i = 0; i < track.length; i++) {
      const from = track[i];
      const to = track[(i + 1) % track.length];
      const dx = Math.abs(from.x - to.x);
      const dy = Math.abs(from.y - to.y);

      // Straight along an arm, or the diagonal turn around a corner of the
      // centre block — nothing else is a legal neighbour.
      const straight = dx + dy === 1;
      const corner = dx === 1 && dy === 1;

      expect(straight || corner).toBe(true);

      if (corner) {
        corners.push(i);
      }
    }

    // One turn per quadrant, evenly spaced: the board is four-fold symmetric.
    expect(corners).toHaveLength(4);
    expect(corners.map((index) => index % boardContract.seatSpacing)).toEqual([4, 4, 4, 4]);
  });

  it('spaces the four start cells evenly, matching the shared contract', () => {
    for (let seat = 0; seat < 4; seat++) {
      expect(toAbsolute(seat, 0)).toBe(seat * boardContract.seatSpacing);
      expect(startCellFor(seat)).toEqual(mainTrack()[seat * boardContract.seatSpacing]);
    }
  });

  it('wraps a seat back onto the shared track', () => {
    // Green (seat 1) is 13 cells along, so its 44th step lands on absolute 5.
    expect(toAbsolute(1, 44)).toBe(5);
  });

  it('parks yard pawns on distinct spots', () => {
    const spots = new Set(
      [0, 1, 2, 3].map((pawn) => {
        const cell = cellFor(0, pawn, boardContract.yardPosition);
        return `${cell.x},${cell.y}`;
      }),
    );

    expect(spots.size).toBe(boardContract.pawnsPerPlayer);
  });

  it('walks the home column inward and stops at home', () => {
    const entry = cellFor(0, 0, boardContract.homeColumnEntry);
    const home = cellFor(0, 0, boardContract.homePosition);

    expect(entry).toEqual({ x: 1, y: 7 });
    expect(home).toEqual({ x: 6, y: 7 });
  });

  it('rejects a seat that does not exist', () => {
    expect(() => cellFor(4, 0, 0)).toThrow(RangeError);
  });
});

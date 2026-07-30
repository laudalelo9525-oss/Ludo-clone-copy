/**
 * SVG for the physical objects on the board — the pawn and the die.
 *
 * Kept out of the board renderer so the shapes can be tuned without touching
 * layout logic. Everything is drawn in a 1x1 unit box centred on the origin,
 * matching one board cell.
 */

/** A Ludo pawn: weighted base, tapered body, round head. */
export function pawnPiece(colour: string): string {
  return `
    <ellipse class="pawn-shadow" cx="0" cy="0.30" rx="0.30" ry="0.09" />
    <path d="M -0.21 0.29 C -0.21 0.09 -0.15 0.00 -0.09 -0.05
             L 0.09 -0.05 C 0.15 0.00 0.21 0.09 0.21 0.29 Z" fill="${colour}" />
    <ellipse cx="0" cy="0.29" rx="0.21" ry="0.07" fill="${colour}" />
    <circle cx="0" cy="-0.15" r="0.17" fill="${colour}" />
    <circle cx="-0.05" cy="-0.20" r="0.055" fill="#fff" opacity="0.45" />`;
}

/** Pip layout for each die face, in a -1..1 box. */
const PIPS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[0, 0]],
  2: [
    [-0.45, -0.45],
    [0.45, 0.45],
  ],
  3: [
    [-0.45, -0.45],
    [0, 0],
    [0.45, 0.45],
  ],
  4: [
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0.45],
    [0.45, 0.45],
  ],
  5: [
    [-0.45, -0.45],
    [0.45, -0.45],
    [0, 0],
    [-0.45, 0.45],
    [0.45, 0.45],
  ],
  6: [
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0],
    [0.45, 0],
    [-0.45, 0.45],
    [0.45, 0.45],
  ],
};

/** A die face. `value` of 0 renders a blank die, before the first roll. */
export function dieFace(value: number): string {
  const pips = (PIPS[value] ?? [])
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.17" fill="#1b1d3a" />`)
    .join('');

  return `<svg class="die" viewBox="-1.25 -1.25 2.5 2.5" role="img" aria-label="Die showing ${value || 'nothing'}">
    <rect x="-1.1" y="-1.1" width="2.2" height="2.2" rx="0.45" fill="#fdfdff" stroke="#c9ccdd" stroke-width="0.07" />
    ${pips}
  </svg>`;
}

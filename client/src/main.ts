import './style.css';
import { config } from './config';
import { GRID_SIZE, cellFor, mainTrack, startCellFor } from './game/board-geometry';

/**
 * Entry point. Draws the board and reports which backend it is pointed at.
 *
 * The match loop (joining a room, syncing state, animating turns) is Issue 3.3
 * and lands on top of this; what is here proves the geometry and the build.
 */
const SEAT_COLOURS = ['#e5484d', '#30a46c', '#f5d90a', '#0090ff'] as const;

function boardSvg(): string {
  const cells = mainTrack()
    .map((cell) => `<rect class="cell" x="${cell.x}" y="${cell.y}" width="1" height="1" />`)
    .join('');

  const starts = SEAT_COLOURS.map((colour, seat) => {
    const cell = startCellFor(seat);
    return `<rect class="start" x="${cell.x}" y="${cell.y}" width="1" height="1" fill="${colour}" />`;
  }).join('');

  const pawns = SEAT_COLOURS.map((colour, seat) =>
    [0, 1, 2, 3]
      .map((pawn) => {
        const cell = cellFor(seat, pawn, -1);
        return `<circle cx="${cell.x + 0.5}" cy="${cell.y + 0.5}" r="0.38" fill="${colour}" />`;
      })
      .join(''),
  ).join('');

  return `<svg viewBox="0 0 ${GRID_SIZE} ${GRID_SIZE}" role="img" aria-label="Ludo board">
    ${cells}${starts}${pawns}
  </svg>`;
}

function render(root: HTMLElement): void {
  root.innerHTML = `
    <main>
      <h1>LudoVerse</h1>
      <div class="board">${boardSvg()}</div>
      <p class="endpoints">
        gateway <code>${config.restBaseUrl}</code><br />
        realtime <code>${config.colyseusUrl}</code>
      </p>
    </main>
  `;
}

const root = document.getElementById('app');
if (root) {
  render(root);
}

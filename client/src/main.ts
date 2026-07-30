import './style.css';
import { config } from './config';
import {
  SAFE_CELLS,
  cellFor,
  homeColumn,
  mainTrack,
  toAbsolute,
  yardCorner,
} from './game/board-geometry';
import { type MatchView, isMyTurn, pawnSprites, statusLine } from './game/match-view';
import { dieFace, pawnPiece } from './game/pieces';
import { LudoClient } from './net/ludo-client';

const SEAT_COLOURS = ['#e5484d', '#30a46c', '#f5d90a', '#0090ff'] as const;

const client = new LudoClient(config.colyseusUrl);
let view: MatchView | null = null;
let notice = '';

function boardSvg(): string {
  const track = mainTrack();

  // Four 6x6 yards in the corners, each with its four parking rings.
  const yards = SEAT_COLOURS.map((colour, seat) => {
    const corner = yardCorner(seat);
    const rings = [0, 1, 2, 3]
      .map((pawn) => {
        const cell = cellFor(seat, pawn, -1);
        return `<circle class="ring" cx="${cell.x + 0.5}" cy="${cell.y + 0.5}" r="0.52" />`;
      })
      .join('');

    return `<g>
      <rect class="yard" x="${corner.x}" y="${corner.y}" width="6" height="6" fill="${colour}" />
      <rect class="yard-inner" x="${corner.x + 0.9}" y="${corner.y + 0.9}" width="4.2" height="4.2" />
      ${rings}
    </g>`;
  }).join('');

  // Track cells: plain, or tinted where a seat starts, or starred where safe.
  const cells = track
    .map((cell, index) => {
      const owner = SEAT_COLOURS.findIndex((_, seat) => toAbsolute(seat, 0) === index);
      const fill = owner >= 0 ? SEAT_COLOURS[owner] : 'var(--cell)';
      const star =
        SAFE_CELLS.includes(index) && owner < 0
          ? '<text class="star" x="' + (cell.x + 0.5) + '" y="' + (cell.y + 0.72) + '">★</text>'
          : '';
      return `<rect class="cell" x="${cell.x}" y="${cell.y}" width="1" height="1" fill="${fill}" />${star}`;
    })
    .join('');

  // Home columns run inward to the centre, in each seat's colour.
  const columns = SEAT_COLOURS.map((colour, seat) =>
    homeColumn(seat)
      .slice(0, 5)
      .map(
        (cell) =>
          `<rect class="cell" x="${cell.x}" y="${cell.y}" width="1" height="1" fill="${colour}" />`,
      )
      .join(''),
  ).join('');

  // Centre: four triangles meeting in the middle, one per seat.
  const centre = `
    <polygon points="6,6 9,6 7.5,7.5" fill="${SEAT_COLOURS[1]}" />
    <polygon points="9,6 9,9 7.5,7.5" fill="${SEAT_COLOURS[2]}" />
    <polygon points="9,9 6,9 7.5,7.5" fill="${SEAT_COLOURS[3]}" />
    <polygon points="6,9 6,6 7.5,7.5" fill="${SEAT_COLOURS[0]}" />`;

  // Pawns are rendered once and then moved by transform, so a move animates
  // instead of teleporting.
  const pawns = view
    ? pawnSprites(view, client.sessionId)
        .map(
          (sprite) =>
            `<g class="pawn${sprite.mine ? ' mine' : ''}" id="pawn-${sprite.seat}-${
              sprite.pawnIndex
            }" transform="translate(${sprite.cell.x + 0.5} ${sprite.cell.y + 0.38})">
               ${pawnPiece(SEAT_COLOURS[sprite.seat] ?? '#fff')}
             </g>`,
        )
        .join('')
    : '';

  return `<svg viewBox="-0.15 -0.15 15.3 15.3" role="img" aria-label="Ludo board">
    <rect class="felt" x="-0.15" y="-0.15" width="15.3" height="15.3" rx="0.6" />
    ${yards}${cells}${columns}${centre}${pawns}
  </svg>`;
}

function render(root: HTMLElement): void {
  const myTurn = view ? isMyTurn(view, client.sessionId) : false;
  const canMove = myTurn && (view?.diceValue ?? 0) > 0;

  root.innerHTML = `
    <main>
      <h1>LudoVerse</h1>
      <p class="status">${view ? statusLine(view, client.sessionId) : 'Connecting…'}</p>
      <div class="board">${boardSvg()}</div>
      <div class="controls">
        ${dieFace(view?.diceValue ?? 0)}
        <button id="roll" ${myTurn && !canMove ? '' : 'disabled'}>Roll</button>
        ${
          canMove
            ? [0, 1, 2, 3]
                .map(
                  (pawn) =>
                    `<button class="pawn-btn" data-pawn="${pawn}">Pawn ${pawn + 1}</button>`,
                )
                .join('')
            : ''
        }
      </div>
      ${notice ? `<p class="notice">${notice}</p>` : ''}
    </main>
  `;

  root.querySelector('#roll')?.addEventListener('click', () => client.roll());
  root.querySelectorAll<HTMLElement>('.pawn-btn').forEach((button) => {
    button.addEventListener('click', () => {
      client.movePawn(Number(button.dataset.pawn));
    });
  });
}

/**
 * Slides pawns to their new cells. Returns false when the board is not on
 * screen yet, or a pawn is missing, so the caller falls back to a full render.
 */
function movePawnsInPlace(root: HTMLElement): boolean {
  if (!view) {
    return false;
  }

  const sprites = pawnSprites(view, client.sessionId);
  const nodes = sprites.map((sprite) =>
    root.querySelector(`#pawn-${sprite.seat}-${sprite.pawnIndex}`),
  );

  if (nodes.some((node) => node === null)) {
    return false;
  }

  sprites.forEach((sprite, index) => {
    nodes[index]?.setAttribute(
      'transform',
      `translate(${sprite.cell.x + 0.5} ${sprite.cell.y + 0.38})`,
    );
  });

  return true;
}

/** Updates the status line, die and buttons without redrawing the board. */
function refreshControls(root: HTMLElement): void {
  if (!view) {
    return;
  }

  const status = root.querySelector('.status');
  if (status) {
    status.textContent = statusLine(view, client.sessionId);
  }

  const controls = root.querySelector('.controls');
  const myTurn = isMyTurn(view, client.sessionId);
  const canMove = myTurn && view.diceValue > 0;

  if (controls) {
    controls.innerHTML = `
      ${dieFace(view.diceValue)}
      <button id="roll" ${myTurn && !canMove ? '' : 'disabled'}>Roll</button>
      ${
        canMove
          ? [0, 1, 2, 3]
              .map(
                (pawn) => `<button class="pawn-btn" data-pawn="${pawn}">Pawn ${pawn + 1}</button>`,
              )
              .join('')
          : ''
      }`;

    controls.querySelector('#roll')?.addEventListener('click', () => client.roll());
    controls.querySelectorAll<HTMLElement>('.pawn-btn').forEach((button) => {
      button.addEventListener('click', () => client.movePawn(Number(button.dataset.pawn)));
    });
  }
}

const root = document.getElementById('app');

if (root) {
  render(root);

  void client
    .join(`Player ${Math.floor(Math.random() * 900 + 100)}`, {
      onState: (next) => {
        const firstState = view === null;
        view = next;
        notice = '';

        if (firstState || !movePawnsInPlace(root)) {
          render(root);
        } else {
          refreshControls(root);
        }
      },
      onRejected: (event) => {
        // The server refused the request; showing why beats silently ignoring it.
        notice = event.reason;
        render(root);
      },
      onDisconnected: () => {
        notice = 'Disconnected. Reload to rejoin — your seat is held briefly.';
        render(root);
      },
    })
    .catch((error: unknown) => {
      notice = `Could not reach the game server at ${config.colyseusUrl}.`;
      console.error(error);
      render(root);
    });
}

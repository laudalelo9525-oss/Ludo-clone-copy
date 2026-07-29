import './style.css';
import { config } from './config';
import { GRID_SIZE, mainTrack, startCellFor } from './game/board-geometry';
import { type MatchView, isMyTurn, pawnSprites, statusLine } from './game/match-view';
import { LudoClient } from './net/ludo-client';

const SEAT_COLOURS = ['#e5484d', '#30a46c', '#f5d90a', '#0090ff'] as const;

const client = new LudoClient(config.colyseusUrl);
let view: MatchView | null = null;
let notice = '';

function boardSvg(): string {
  const cells = mainTrack()
    .map((cell) => `<rect class="cell" x="${cell.x}" y="${cell.y}" width="1" height="1" />`)
    .join('');

  const starts = SEAT_COLOURS.map((colour, seat) => {
    const cell = startCellFor(seat);
    return `<rect x="${cell.x}" y="${cell.y}" width="1" height="1" fill="${colour}" opacity="0.35" />`;
  }).join('');

  const pawns = view
    ? pawnSprites(view, client.sessionId)
        .map(
          (sprite) =>
            `<circle class="pawn${sprite.mine ? ' mine' : ''}" cx="${sprite.cell.x + 0.5}" cy="${
              sprite.cell.y + 0.5
            }" r="0.36" fill="${SEAT_COLOURS[sprite.seat] ?? '#fff'}" />`,
        )
        .join('')
    : '';

  return `<svg viewBox="0 0 ${GRID_SIZE} ${GRID_SIZE}" role="img" aria-label="Ludo board">
    ${cells}${starts}${pawns}
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

const root = document.getElementById('app');

if (root) {
  render(root);

  void client
    .join(`Player ${Math.floor(Math.random() * 900 + 100)}`, {
      onState: (next) => {
        view = next;
        notice = '';
        render(root);
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

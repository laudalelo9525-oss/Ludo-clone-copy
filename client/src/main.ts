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
import { isMuted, play, toggleMute } from './game/audio';
import { buzz, flash } from './game/effects';
import { dieFace, pawnPiece } from './game/pieces';
import { LudoClient, type LudoClientEvents } from './net/ludo-client';
import { MatchmakingApi } from './net/matchmaking';
import { type LobbyChoice, botCount, isValidChoice, lobbyHtml, normaliseName } from './ui/lobby';

const SEAT_COLOURS = ['#e5484d', '#30a46c', '#f5d90a', '#0090ff'] as const;
const SEAT_SHADES = ['#c1272d', '#1d7a4c', '#c9a800', '#0066cc'] as const;

const client = new LudoClient(config.colyseusUrl);
const matchmaking = new MatchmakingApi(config.restBaseUrl);
let choice: LobbyChoice = {
  name: '',
  gameMode: 'CLASSIC',
  players: 2,
  solo: false,
  botDifficulty: 'HARD',
};
let searching = false;
let inMatch = false;
let view: MatchView | null = null;
/** Pawn indices the server said may move; empty outside your own turn. */
let movable: number[] = [];
let notice = '';

/** Gradients shared by the yards, cells and centre. */
function defs(): string {
  const gradients = SEAT_COLOURS.map(
    (colour, seat) => `
      <linearGradient id="yard-${seat}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${colour}" />
        <stop offset="100%" stop-color="${SEAT_SHADES[seat]}" />
      </linearGradient>`,
  ).join('');

  return `<defs>
    ${gradients}
    <linearGradient id="felt" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#eceff8" />
    </linearGradient>
  </defs>`;
}

function boardSvg(): string {
  const track = mainTrack();

  const yards = SEAT_COLOURS.map((_, seat) => {
    const corner = yardCorner(seat);
    const rings = [0, 1, 2, 3]
      .map((pawn) => {
        const cell = cellFor(seat, pawn, -1);
        return `<circle class="ring" cx="${cell.x + 0.5}" cy="${cell.y + 0.5}" r="0.5" />`;
      })
      .join('');

    return `<g>
      <rect class="yard" x="${corner.x}" y="${corner.y}" width="6" height="6" rx="0.5"
            fill="url(#yard-${seat})" />
      <rect class="yard-inner" x="${corner.x + 0.85}" y="${corner.y + 0.85}"
            width="4.3" height="4.3" rx="0.35" />
      ${rings}
    </g>`;
  }).join('');

  const cells = track
    .map((cell, index) => {
      const owner = SEAT_COLOURS.findIndex((_, seat) => toAbsolute(seat, 0) === index);
      const fill = owner >= 0 ? `url(#yard-${owner})` : 'url(#felt)';
      const star =
        SAFE_CELLS.includes(index) && owner < 0
          ? `<text class="star" x="${cell.x + 0.5}" y="${cell.y + 0.72}">★</text>`
          : '';
      return `<rect class="cell" x="${cell.x}" y="${cell.y}" width="1" height="1" rx="0.12" fill="${fill}" />${star}`;
    })
    .join('');

  const columns = SEAT_COLOURS.map((_, seat) =>
    homeColumn(seat)
      .slice(0, 5)
      .map(
        (cell) =>
          `<rect class="cell" x="${cell.x}" y="${cell.y}" width="1" height="1" rx="0.12" fill="url(#yard-${seat})" />`,
      )
      .join(''),
  ).join('');

  const centre = `
    <polygon points="6,6 9,6 7.5,7.5" fill="url(#yard-1)" />
    <polygon points="9,6 9,9 7.5,7.5" fill="url(#yard-2)" />
    <polygon points="9,9 6,9 7.5,7.5" fill="url(#yard-3)" />
    <polygon points="6,9 6,6 7.5,7.5" fill="url(#yard-0)" />`;

  const pawns = view
    ? pawnSprites(view, client.sessionId)
        .map((sprite) => {
          const canMove = sprite.mine && movable.includes(sprite.pawnIndex);
          return `<g class="pawn${sprite.mine ? ' mine' : ''}${canMove ? ' movable' : ''}"
                     id="pawn-${sprite.seat}-${sprite.pawnIndex}"
                     data-pawn="${sprite.pawnIndex}"
                     transform="translate(${sprite.cell.x + 0.5} ${sprite.cell.y + 0.38})">
                    ${pawnPiece(SEAT_COLOURS[sprite.seat] ?? '#fff')}
                  </g>`;
        })
        .join('')
    : '';

  return `<svg viewBox="-0.2 -0.2 15.4 15.4" role="img" aria-label="Ludo board">
    ${defs()}
    <rect class="board-bg" x="-0.2" y="-0.2" width="15.4" height="15.4" rx="0.7" />
    ${yards}${cells}${columns}${centre}${pawns}
  </svg>`;
}

/** One row per player: colour, name, and whose turn it is. */
function playersPanel(): string {
  if (!view || view.players.length === 0) {
    return '<div class="players"></div>';
  }

  const rows = [...view.players]
    .sort((a, b) => a.seat - b.seat)
    .map((player) => {
      const active = player.sessionId === view?.currentTurnSessionId;
      const you = player.sessionId === client.sessionId;
      const state = !player.connected ? 'offline' : player.afk ? 'away' : '';

      return `<div class="player${active ? ' active' : ''}">
        <span class="chip" style="background:${SEAT_COLOURS[player.seat] ?? '#fff'}"></span>
        <span class="name">${player.name}${you ? ' (you)' : ''}</span>
        ${state ? `<span class="tag">${state}</span>` : ''}
      </div>`;
    })
    .join('');

  return `<div class="players">${rows}</div>`;
}

function controlsHtml(): string {
  const myTurn = view ? isMyTurn(view, client.sessionId) : false;
  const awaitingMove = myTurn && (view?.diceValue ?? 0) > 0 && movable.length > 0;

  return `
    <span class="die-slot">${dieFace(view?.diceValue ?? 0)}</span>
    <button id="roll" ${myTurn && !awaitingMove ? '' : 'disabled'}>
      ${awaitingMove ? 'Tap a pawn' : 'Roll'}
    </button>
    <button id="mute" class="icon" aria-label="${isMuted() ? 'Unmute' : 'Mute'}">
      ${isMuted() ? '🔇' : '🔊'}
    </button>`;
}

/**
 * Tumbles the die through random faces before the real value lands, so a roll
 * reads as a roll. The final face always comes from the server.
 */
function tumbleDie(root: HTMLElement, finalValue: number): void {
  const slot = root.querySelector('.die-slot');
  if (!slot) {
    return;
  }

  let ticks = 0;
  const spin = window.setInterval(() => {
    slot.innerHTML = dieFace(1 + Math.floor(Math.random() * 6));
    if (++ticks >= 6) {
      window.clearInterval(spin);
      slot.innerHTML = dieFace(finalValue);
      slot.classList.add('landed');
      window.setTimeout(() => slot.classList.remove('landed'), 300);
    }
  }, 55);
}

/** Pawns the server will accept a move for are tappable. */
function bindPawns(root: HTMLElement): void {
  root.querySelectorAll<SVGElement>('.pawn.movable').forEach((pawn) => {
    pawn.onclick = () => {
      client.movePawn(Number(pawn.dataset.pawn));
      movable = [];
      root.querySelectorAll('.pawn.movable').forEach((node) => node.classList.remove('movable'));
      refreshControls(root);
    };
  });
}

function render(root: HTMLElement): void {
  root.innerHTML = `
    <main>
      <h1>LudoVerse</h1>
      ${playersPanel()}
      <p class="status">${view ? statusLine(view, client.sessionId) : 'Connecting…'}</p>
      <div class="board">${boardSvg()}</div>
      <div class="controls">${controlsHtml()}</div>
      ${notice ? `<p class="notice">${notice}</p>` : ''}
    </main>
  `;

  bindControls(root);
  bindPawns(root);
}

/** Wires the roll and mute buttons. */
function bindControls(root: HTMLElement): void {
  root.querySelector('#roll')?.addEventListener('click', () => {
    play('roll');
    client.roll();
  });

  root.querySelector('#mute')?.addEventListener('click', () => {
    toggleMute();
    refreshControls(root);
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
    root.querySelector<SVGElement>(`#pawn-${sprite.seat}-${sprite.pawnIndex}`),
  );

  if (nodes.some((node) => node === null)) {
    return false;
  }

  sprites.forEach((sprite, index) => {
    const node = nodes[index];
    node?.setAttribute('transform', `translate(${sprite.cell.x + 0.5} ${sprite.cell.y + 0.38})`);
    node?.classList.toggle('movable', sprite.mine && movable.includes(sprite.pawnIndex));
  });

  bindPawns(root);
  return true;
}

/** Updates the panel, status line, die and button without redrawing the board. */
function refreshControls(root: HTMLElement): void {
  if (!view) {
    return;
  }

  const status = root.querySelector('.status');
  if (status) {
    status.textContent = statusLine(view, client.sessionId);
  }

  const panel = root.querySelector('.players');
  if (panel) {
    panel.outerHTML = playersPanel();
  }

  const controls = root.querySelector('.controls');
  if (controls) {
    controls.innerHTML = controlsHtml();
    bindControls(root);
  }
}

/** The pre-match screen: name, mode, seat count. */
function renderLobby(root: HTMLElement): void {
  root.innerHTML = lobbyHtml(choice, searching, notice);

  const name = root.querySelector<HTMLInputElement>('#name');
  name?.addEventListener('input', () => {
    choice = { ...choice, name: name.value };
  });

  root.querySelectorAll<HTMLElement>('.mode').forEach((button) => {
    button.addEventListener('click', () => {
      choice = { ...choice, gameMode: button.dataset.mode as LobbyChoice['gameMode'] };
      renderLobby(root);
    });
  });

  root.querySelectorAll<HTMLElement>('.opponent').forEach((button) => {
    button.addEventListener('click', () => {
      choice = { ...choice, solo: button.dataset.solo === '1' };
      renderLobby(root);
    });
  });

  root.querySelectorAll<HTMLElement>('.level').forEach((button) => {
    button.addEventListener('click', () => {
      choice = { ...choice, botDifficulty: button.dataset.level as LobbyChoice['botDifficulty'] };
      renderLobby(root);
    });
  });

  root.querySelectorAll<HTMLElement>('.seats').forEach((button) => {
    button.addEventListener('click', () => {
      choice = { ...choice, players: Number(button.dataset.seats) as LobbyChoice['players'] };
      renderLobby(root);
    });
  });

  root.querySelector('#play')?.addEventListener('click', () => void startMatch(root));
}

/** Takes a ticket from the gateway, then joins the seat it reserved. */
async function startMatch(root: HTMLElement): Promise<void> {
  choice = { ...choice, name: normaliseName(choice.name) };

  if (!isValidChoice(choice)) {
    notice = 'Pick a mode and a number of players.';
    renderLobby(root);
    return;
  }

  searching = true;
  notice = '';
  renderLobby(root);

  try {
    const bots = botCount(choice);
    const ticket = await matchmaking.requestMatch({
      gameMode: choice.gameMode,
      players: choice.players,
      name: choice.name,
      ...(bots > 0 ? { bots, botDifficulty: choice.botDifficulty } : {}),
    });

    if (ticket.status !== 'FOUND' || !ticket.reservation) {
      throw new Error(ticket.error ?? 'No seat was available.');
    }

    await client.joinWithReservation(ticket.reservation, matchEvents(root));
    inMatch = true;
    play('move');
  } catch (error) {
    searching = false;
    notice = error instanceof Error ? error.message : 'Could not find a match.';
    renderLobby(root);
  }
}

const root = document.getElementById('app');

function matchEvents(root: HTMLElement): LudoClientEvents {
  return {
    onState: (next: MatchView) => {
      const firstState = view === null || !inMatch;
      view = next;
      notice = '';

      // A turn that is not ours has nothing for us to move.
      if (!isMyTurn(next, client.sessionId)) {
        movable = [];
      }

      if (firstState || !movePawnsInPlace(root)) {
        render(root);
      } else {
        refreshControls(root);
      }

      if (next.status === 'FINISHED') {
        flash(root.querySelector('.board'), 'win');
        play('win');
        buzz([0, 80, 80, 80, 80, 160]);
      }
    },
    onDiceRolled: (event) => {
      tumbleDie(root, event.value);
      if (event.player !== client.sessionId) {
        play('roll');
      }

      // The server decides which pawns are legal; the client only highlights.
      movable = event.player === client.sessionId ? event.movablePawns : [];
      movePawnsInPlace(root);
      refreshControls(root);
    },
    onPawnMoved: (event) => {
      // Captures and arrivals are announced by the server, so every client
      // reacts to the same events rather than guessing from state diffs.
      for (const capture of event.captures) {
        const victim = view?.players.find((player) => player.sessionId === capture.player);
        if (victim) {
          flash(root.querySelector(`#pawn-${victim.seat}-${capture.pawnIndex}`), 'capture');
        }
      }

      play(event.captures.length > 0 ? 'capture' : 'move');

      if (event.captures.length > 0) {
        buzz([0, 40, 60, 40]);
      }

      const mover = view?.players.find((player) => player.sessionId === event.player);
      if (mover && event.newPosition === 57) {
        flash(root.querySelector(`#pawn-${mover.seat}-${event.pawnIndex}`), 'home');
        play('home');
      }
    },
    onRejected: (event) => {
      notice = event.reason;
      render(root);
    },
    onReconnecting: (attempt: number, maxAttempts: number) => {
      notice = `Connection lost — reconnecting (${attempt}/${maxAttempts})…`;
      render(root);
    },
    onReconnected: () => {
      notice = '';
      play('move');
      render(root);
    },
    onDisconnected: () => {
      notice = 'Disconnected. Reload to rejoin — your seat is held briefly.';
      render(root);
    },
  };
}

if (root) {
  renderLobby(root);
}

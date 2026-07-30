import { GAME_MODES, type GameMode } from '../net/protocol';

/** Seat counts a match supports. */
export type PlayerCount = 2 | 4;

/** What the player chose before a match starts. */
export interface LobbyChoice {
  name: string;
  gameMode: GameMode;
  players: PlayerCount;
}

const NAME_MAX = 16;

/**
 * Cleans up a typed name. An empty entry is normal — plenty of players just
 * hit Play — so it falls back to a generated one rather than blocking.
 */
export function normaliseName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);
  return trimmed.length > 0 ? trimmed : `Player ${Math.floor(Math.random() * 900 + 100)}`;
}

/** Rejects anything the gateway would 400 on, before a request is made. */
export function isValidChoice(choice: LobbyChoice): boolean {
  return (
    choice.name.length > 0 &&
    choice.name.length <= NAME_MAX &&
    (GAME_MODES as readonly string[]).includes(choice.gameMode) &&
    (choice.players === 2 || choice.players === 4)
  );
}

const MODE_BLURB: Record<GameMode, string> = {
  CLASSIC: 'The full game',
  QUICK: 'Faster finish',
  MASTER: 'Harder rules',
  TOURNAMENT: 'Bracket play',
};

/** The lobby screen. */
export function lobbyHtml(selected: LobbyChoice, busy: boolean, error: string): string {
  const modes = GAME_MODES.map(
    (mode) => `
      <button class="mode${mode === selected.gameMode ? ' on' : ''}" data-mode="${mode}" ${busy ? 'disabled' : ''}>
        <strong>${mode.charAt(0) + mode.slice(1).toLowerCase()}</strong>
        <small>${MODE_BLURB[mode]}</small>
      </button>`,
  ).join('');

  const seats = [2, 4]
    .map(
      (count) => `
      <button class="seats${count === selected.players ? ' on' : ''}" data-seats="${count}" ${busy ? 'disabled' : ''}>
        ${count} players
      </button>`,
    )
    .join('');

  return `
    <section class="lobby">
      <h1>LudoVerse</h1>
      <label class="field">
        <span>Your name</span>
        <input id="name" maxlength="${NAME_MAX}" placeholder="Player" value="${selected.name}" ${busy ? 'disabled' : ''} />
      </label>
      <div class="modes">${modes}</div>
      <div class="seat-picker">${seats}</div>
      <button id="play" class="primary" ${busy ? 'disabled' : ''}>${busy ? 'Finding a match…' : 'Play'}</button>
      ${error ? `<p class="notice">${error}</p>` : ''}
    </section>`;
}

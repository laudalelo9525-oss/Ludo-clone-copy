import { describe, expect, it } from 'vitest';
import { type LobbyChoice, botCount, isValidChoice, lobbyHtml, normaliseName } from './lobby';

const choice: LobbyChoice = {
  name: 'Ada',
  gameMode: 'CLASSIC',
  players: 4,
  solo: false,
  botDifficulty: 'HARD',
};

describe('lobby', () => {
  it('trims and collapses whitespace in a name', () => {
    expect(normaliseName('  Ada   Lovelace ')).toBe('Ada Lovelace');
  });

  it('caps a long name', () => {
    expect(normaliseName('x'.repeat(40))).toHaveLength(16);
  });

  it('falls back to a generated name when nothing is typed', () => {
    expect(normaliseName('   ')).toMatch(/^Player \d{3}$/);
  });

  it('accepts a valid choice', () => {
    expect(isValidChoice(choice)).toBe(true);
  });

  it.each([
    [{ ...choice, name: '' }],
    [{ ...choice, gameMode: 'DEATHMATCH' as never }],
    [{ ...choice, players: 3 as never }],
  ])('rejects a choice the gateway would refuse', (bad) => {
    expect(isValidChoice(bad)).toBe(false);
  });

  it('marks the selected mode and seat count', () => {
    const html = lobbyHtml(choice, false, '');

    expect(html).toMatch(/class="mode on" data-mode="CLASSIC"/);
    expect(html).toMatch(/class="seats on" data-seats="4"/);
  });

  it('disables everything and shows progress while searching', () => {
    const html = lobbyHtml(choice, true, '');

    expect(html).toContain('Finding a match…');
    expect((html.match(/disabled/g) ?? []).length).toBeGreaterThan(5);
  });

  it('fills the other seats with AI in solo, and none otherwise', () => {
    expect(botCount({ ...choice, solo: true })).toBe(3);
    expect(botCount({ ...choice, solo: true, players: 2 })).toBe(1);
    expect(botCount(choice)).toBe(0);
  });

  it('offers difficulties only when playing solo', () => {
    expect(lobbyHtml({ ...choice, solo: true }, false, '')).toContain('data-level="EASY"');
    expect(lobbyHtml(choice, false, '')).not.toContain('data-level=');
  });

  it('rejects an unknown difficulty', () => {
    expect(isValidChoice({ ...choice, botDifficulty: 'GOD' as never })).toBe(false);
  });

  it('shows an error when one is given', () => {
    expect(lobbyHtml(choice, false, 'No seats')).toContain('No seats');
  });
});

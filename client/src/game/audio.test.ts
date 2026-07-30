// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isMuted, play, toggleMute } from './audio';

afterEach(() => {
  vi.unstubAllGlobals();
  if (isMuted()) {
    toggleMute();
  }
});

describe('audio', () => {
  it('starts unmuted and toggles', () => {
    expect(isMuted()).toBe(false);
    expect(toggleMute()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(toggleMute()).toBe(false);
  });

  it('is silent when the browser has no Web Audio', () => {
    expect(() => play('roll')).not.toThrow();
  });

  it('plays a tone when Web Audio exists', () => {
    const start = vi.fn();
    const connect = vi.fn().mockReturnValue({ connect: vi.fn() });
    const oscillator = {
      type: '',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect,
      start,
      stop: vi.fn(),
    };

    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => ({
        currentTime: 0,
        destination: {},
        createOscillator: () => oscillator,
        createGain: () => ({
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        }),
      })),
    );

    play('capture');
    expect(start).toHaveBeenCalled();
  });

  it('plays nothing while muted', () => {
    const createOscillator = vi.fn();
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => ({ createOscillator })),
    );

    toggleMute();
    play('win');

    expect(createOscillator).not.toHaveBeenCalled();
  });
});

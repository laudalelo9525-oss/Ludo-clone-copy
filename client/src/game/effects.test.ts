// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { EFFECT_MS, buzz, flash } from './effects';

describe('effects', () => {
  it('ignores a missing node', () => {
    expect(() => flash(null, 'capture')).not.toThrow();
  });

  it('adds the effect class and removes it when the animation ends', () => {
    vi.useFakeTimers();
    const node = document.createElement('div');

    flash(node, 'capture');
    expect(node.classList.contains('fx-capture')).toBe(true);

    vi.advanceTimersByTime(EFFECT_MS.capture + 1);
    expect(node.classList.contains('fx-capture')).toBe(false);

    vi.useRealTimers();
  });

  it('vibrates when the device supports it, and is silent when it does not', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });

    buzz(30);
    expect(vibrate).toHaveBeenCalledWith(30);

    vi.stubGlobal('navigator', {});
    expect(() => buzz(30)).not.toThrow();

    vi.unstubAllGlobals();
  });
});

/**
 * Transient feedback: the flashes and shakes that tell a player something
 * happened. Purely cosmetic — nothing here changes state, so a dropped effect
 * never desynchronises a match.
 */

/** How long each effect runs, in ms. Matches the CSS animations. */
export const EFFECT_MS = {
  capture: 700,
  home: 900,
  win: 1600,
} as const;

/** Adds a class for the effect's duration, then removes it. */
export function flash(node: Element | null, effect: keyof typeof EFFECT_MS): void {
  if (!node) {
    return;
  }

  const className = `fx-${effect}`;
  node.classList.remove(className);
  // Force a reflow so re-triggering the same effect restarts the animation.
  void (node as HTMLElement).offsetWidth;
  node.classList.add(className);

  window.setTimeout(() => node.classList.remove(className), EFFECT_MS[effect]);
}

/** Short vibration on supported devices; silently ignored elsewhere. */
export function buzz(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

/**
 * Game sounds, synthesised with the Web Audio API.
 *
 * No audio files: a handful of short tones keeps the bundle small and means
 * nothing extra has to be fetched inside a Capacitor bundle, where external
 * requests can fail. Browsers block audio until the first user gesture, so the
 * context is created lazily on the first sound after a tap.
 */

type Voice = {
  /** Start frequency in Hz. */
  from: number;
  /** End frequency; a slide from `from` gives the sound its character. */
  to: number;
  /** Duration in seconds. */
  seconds: number;
  type: OscillatorType;
  gain: number;
};

const VOICES = {
  roll: { from: 220, to: 140, seconds: 0.16, type: 'square', gain: 0.05 },
  move: { from: 520, to: 660, seconds: 0.07, type: 'triangle', gain: 0.05 },
  capture: { from: 400, to: 90, seconds: 0.3, type: 'sawtooth', gain: 0.07 },
  home: { from: 660, to: 1320, seconds: 0.28, type: 'triangle', gain: 0.07 },
  win: { from: 523, to: 1046, seconds: 0.7, type: 'triangle', gain: 0.09 },
} as const satisfies Record<string, Voice>;

export type SoundName = keyof typeof VOICES;

let context: AudioContext | null = null;
let muted = false;

/** True when sounds are currently suppressed. */
export function isMuted(): boolean {
  return muted;
}

/** Flips mute and returns the new state, for a UI toggle. */
export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

/**
 * Plays a sound. Safe to call anywhere: it is a no-op when muted, when the
 * browser has no Web Audio, or before the user has interacted with the page.
 */
export function play(name: SoundName): void {
  if (muted || typeof window === 'undefined') {
    return;
  }

  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    return;
  }

  try {
    context ??= new Ctor();
    const voice: Voice = VOICES[name];
    const now = context.currentTime;

    const oscillator = context.createOscillator();
    const amp = context.createGain();

    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(voice.to, now + voice.seconds);

    // A quick attack and a ramp to silence, so notes never click.
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(voice.gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + voice.seconds);

    oscillator.connect(amp).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + voice.seconds + 0.02);
  } catch {
    // Audio is a nicety; never let it break a turn.
  }
}

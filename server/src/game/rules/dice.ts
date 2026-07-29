import { randomInt } from 'node:crypto';
import { type DiceRoller } from './types';

/**
 * The authoritative die.
 *
 * Uses the crypto RNG rather than `Math.random`, so a client cannot predict
 * future rolls from observed ones — `Math.random` is seeded per process and
 * its output stream is reconstructable, which would hand an attacker the
 * whole match.
 */
export class SecureDiceRoller implements DiceRoller {
  roll(): number {
    return randomInt(1, 7);
  }
}

/**
 * Plays back a fixed sequence, then throws. Test-only, exported here so both
 * the rules tests and the room tests can drive a match deterministically.
 */
export class ScriptedDiceRoller implements DiceRoller {
  private readonly values: number[];
  private index = 0;

  constructor(...values: number[]) {
    this.values = values;
  }

  roll(): number {
    if (this.index >= this.values.length) {
      throw new Error('The scripted dice sequence ran out.');
    }

    return this.values[this.index++];
  }
}

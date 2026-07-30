/**
 * Reconnection policy for a dropped match.
 *
 * The server holds a disconnected player's seat for 60 seconds
 * (`RECONNECTION_WINDOW_SECONDS` in the room), so the client has that long to
 * come back before the seat is freed. Attempts are spaced by a capped
 * exponential backoff: quick enough that a brief tunnel or lift feels
 * seamless, spread out enough that a phone with no signal is not hammering
 * the radio.
 */

/** Attempts before giving up, chosen to fit inside the server's window. */
export const MAX_RECONNECT_ATTEMPTS = 6;

const BASE_DELAY_MS = 700;
const MAX_DELAY_MS = 8000;

/** Delay before attempt number `attempt` (1-based). */
export function reconnectDelayMs(attempt: number): number {
  const clamped = Math.max(1, Math.floor(attempt));
  return Math.min(BASE_DELAY_MS * 2 ** (clamped - 1), MAX_DELAY_MS);
}

/**
 * Whether a close code is worth reconnecting after.
 *
 * 1000 is a normal close and 4000 is Colyseus' consented leave — both mean the
 * player meant to go, so coming back uninvited would be wrong.
 */
export function shouldReconnect(code: number): boolean {
  return code !== 1000 && code !== 4000;
}

/** Total time the policy spends before giving up, for sanity-checking it. */
export function totalReconnectWindowMs(): number {
  let total = 0;
  for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
    total += reconnectDelayMs(attempt);
  }
  return total;
}

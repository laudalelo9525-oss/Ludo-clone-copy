import { describe, expect, it } from 'vitest';
import {
  MAX_RECONNECT_ATTEMPTS,
  reconnectDelayMs,
  shouldReconnect,
  totalReconnectWindowMs,
} from './reconnect';

describe('reconnection policy', () => {
  it('backs off exponentially from a fast first retry', () => {
    expect(reconnectDelayMs(1)).toBe(700);
    expect(reconnectDelayMs(2)).toBe(1400);
    expect(reconnectDelayMs(3)).toBe(2800);
  });

  it('caps the delay so a long outage still retries regularly', () => {
    expect(reconnectDelayMs(10)).toBe(8000);
    expect(reconnectDelayMs(100)).toBe(8000);
  });

  it('treats a nonsensical attempt number as the first', () => {
    expect(reconnectDelayMs(0)).toBe(700);
    expect(reconnectDelayMs(-5)).toBe(700);
  });

  it('gives up inside the 60s window the server holds the seat for', () => {
    expect(totalReconnectWindowMs()).toBeLessThan(60_000);
    expect(MAX_RECONNECT_ATTEMPTS).toBeGreaterThan(3);
  });

  it('does not chase a player who left on purpose', () => {
    expect(shouldReconnect(1000)).toBe(false);
    expect(shouldReconnect(4000)).toBe(false);
  });

  it('reconnects after an unexpected drop', () => {
    expect(shouldReconnect(1006)).toBe(true);
    expect(shouldReconnect(1001)).toBe(true);
  });
});

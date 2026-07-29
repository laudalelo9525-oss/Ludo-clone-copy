import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ClientMessage, RoomStatus, ServerMessage } from './protocol';

/**
 * The server owns these names. Reading its source keeps the two in step
 * without a build-time dependency between the two packages: rename a message
 * on either side and this fails.
 */
const serverMessages = readFileSync(
  new URL('../../../server/src/game/rooms/messages.ts', import.meta.url),
  'utf8',
);
const serverState = readFileSync(
  new URL('../../../server/src/game/rooms/ludo-state.ts', import.meta.url),
  'utf8',
);

describe('wire protocol', () => {
  it.each(Object.entries(ClientMessage))('server handles client message %s', (_name, value) => {
    expect(serverMessages).toContain(`'${value}'`);
  });

  it.each(Object.entries(ServerMessage))('server sends %s', (_name, value) => {
    expect(serverMessages).toContain(`'${value}'`);
  });

  it.each(Object.values(RoomStatus))('server uses room status %s', (value) => {
    expect(serverState).toContain(`'${value}'`);
  });
});

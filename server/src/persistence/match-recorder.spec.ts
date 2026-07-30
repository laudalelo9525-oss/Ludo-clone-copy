import { matchRecorder } from './match-recorder';

describe('matchRecorder', () => {
  it('stores nothing until a repository is handed over', async () => {
    await expect(
      matchRecorder.started({ roomId: 'r', gameMode: 'CLASSIC', startedAt: new Date() }),
    ).resolves.toBeNull();
    await expect(matchRecorder.finished(null, new Date(), 'COMPLETED')).resolves.toBeUndefined();
  });

  it('forwards to the repository once one is set', async () => {
    const calls: string[] = [];
    matchRecorder.use({
      recordStarted: () => {
        calls.push('start');
        return Promise.resolve('match-1');
      },
      recordFinished: (id, _endedAt, outcome) => {
        calls.push(`end:${id}:${outcome}`);
        return Promise.resolve();
      },
    });

    const id = await matchRecorder.started({
      roomId: 'r',
      gameMode: 'QUICK',
      startedAt: new Date(),
    });
    await matchRecorder.finished(id, new Date(), 'COMPLETED');
    await matchRecorder.finished(id, new Date(), 'ABORTED');

    expect(id).toBe('match-1');
    expect(calls).toEqual(['start', 'end:match-1:COMPLETED', 'end:match-1:ABORTED']);
  });
});

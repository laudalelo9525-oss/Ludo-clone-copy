import { NoopMatchRepository } from './postgres-match-repository';

describe('NoopMatchRepository', () => {
  const repository = new NoopMatchRepository();

  it('reports no id, so callers treat the match as unstored', async () => {
    await expect(repository.recordStarted()).resolves.toBeNull();
  });

  it('finishing an unstored match is not an error', async () => {
    await expect(repository.recordFinished()).resolves.toBeUndefined();
  });
});

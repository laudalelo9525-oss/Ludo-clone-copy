import { loadConfiguration } from './configuration';

describe('loadConfiguration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PORT;
    delete process.env.COLYSEUS_PORT;
    delete process.env.CORS_ORIGINS;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('falls back to the documented defaults', () => {
    const config = loadConfiguration();

    expect(config.nodeEnv).toBe('development');
    expect(config.http.port).toBe(3000);
    expect(config.colyseus.port).toBe(2567);
  });

  it('reads ports from the environment', () => {
    process.env.PORT = '8080';
    process.env.COLYSEUS_PORT = '9090';

    const config = loadConfiguration();

    expect(config.http.port).toBe(8080);
    expect(config.colyseus.port).toBe(9090);
  });

  it('ignores non-numeric ports instead of producing NaN', () => {
    process.env.PORT = 'not-a-port';

    expect(loadConfiguration().http.port).toBe(3000);
  });

  it('parses a comma separated CORS allow list', () => {
    process.env.CORS_ORIGINS = 'https://ludoverse.app, https://admin.ludoverse.app ';

    expect(loadConfiguration().http.corsOrigins).toEqual([
      'https://ludoverse.app',
      'https://admin.ludoverse.app',
    ]);
  });

  it('never falls back to a permissive CORS policy in production', () => {
    process.env.NODE_ENV = 'production';

    expect(loadConfiguration().http.corsOrigins).toEqual([]);
  });
});

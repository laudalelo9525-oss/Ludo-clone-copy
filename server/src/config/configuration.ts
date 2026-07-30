/**
 * Central runtime configuration for the LudoVerse backend.
 *
 * Every value is sourced from the environment so the same image can run
 * locally (docker-compose) and in production without code changes.
 * See `.env.example` for the full list of supported variables.
 */
export interface HttpConfig {
  /** Port serving the NestJS REST gateway. */
  port: number;
  /** Allowed CORS origins, or `true` to allow any origin (development only). */
  corsOrigins: string[] | true;
}

export interface ColyseusConfig {
  /** Port serving the authoritative Colyseus realtime game server. */
  port: number;
}

export interface DatabaseConfig {
  /** Postgres connection string, or undefined to run without persistence. */
  url?: string;
}

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  http: HttpConfig;
  colyseus: ColyseusConfig;
  database: DatabaseConfig;
}

const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_COLYSEUS_PORT = 2567;

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toCorsOrigins(value: string | undefined, isProduction: boolean): string[] | true {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  // A production deployment must declare its origins explicitly; a permissive
  // wildcard is only tolerated while developing against local Unity builds.
  if (origins.length === 0) {
    return isProduction ? [] : true;
  }

  return origins;
}

export function loadConfiguration(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];

  return {
    nodeEnv,
    http: {
      port: toInt(process.env.PORT, DEFAULT_HTTP_PORT),
      corsOrigins: toCorsOrigins(process.env.CORS_ORIGINS, nodeEnv === 'production'),
    },
    colyseus: {
      port: toInt(process.env.COLYSEUS_PORT, DEFAULT_COLYSEUS_PORT),
    },
    database: {
      // Absent is a supported setup, not a misconfiguration: the game runs
      // without a database and simply stores nothing.
      url: process.env.DATABASE_URL || undefined,
    },
  };
}

export default loadConfiguration;

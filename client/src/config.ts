/**
 * Endpoints, overridable at build time so the same code runs against a local
 * stack, staging, or production without a code change.
 *
 * Defaults match `docker/docker-compose.yml`.
 */
export const config = {
  restBaseUrl: import.meta.env.VITE_REST_URL ?? 'http://localhost:3000',
  colyseusUrl: import.meta.env.VITE_COLYSEUS_URL ?? 'ws://localhost:2567',
} as const;

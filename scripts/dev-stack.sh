#!/usr/bin/env bash
# Bring up the local development stack: PostgreSQL + Redis in Docker, and the
# NestJS gateway plus Colyseus server in watch mode on the host.
#
# Usage:
#   scripts/dev-stack.sh          # start datastores, then the server in watch mode
#   scripts/dev-stack.sh --deps   # start datastores only
#   scripts/dev-stack.sh --down   # stop and remove the datastore containers

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/docker/docker-compose.yml"

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

case "${1:-}" in
  --down)
    compose down
    exit 0
    ;;
  --deps)
    compose up -d postgres redis
    exit 0
    ;;
  '')
    ;;
  *)
    echo "Unknown option: $1" >&2
    sed -n '2,9p' "${BASH_SOURCE[0]}" >&2
    exit 1
    ;;
esac

compose up -d postgres redis

cd "${REPO_ROOT}/server"
if [ ! -d node_modules ]; then
  echo "Installing backend dependencies..."
  npm ci
fi
if [ ! -f .env ]; then
  echo "Creating server/.env from .env.example"
  cp .env.example .env
fi

npm run start:dev

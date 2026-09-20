#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(dirname -- "$SCRIPT_DIR")
COMPOSE_FILE="$PROJECT_ROOT/compose.frontend.yaml"
PROJECT_NAME=stack
SERVICE_NAME=frontend
CONTAINER_NAME=ilto_frontend

fail() {
  printf 'Frontend deployment failed: %s\n' "$1" >&2
  exit 1
}

[ -f "$COMPOSE_FILE" ] || fail "expected deployment definition not found: $COMPOSE_FILE"
command -v docker >/dev/null 2>&1 || fail "docker is not installed or not on PATH"
command -v curl >/dev/null 2>&1 || fail "curl is required to verify host port 8080"
docker compose version >/dev/null 2>&1 || fail "the Docker Compose plugin is unavailable"
docker network inspect stack_ilto_network >/dev/null 2>&1 ||
  fail "expected existing stack network stack_ilto_network was not found"
docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1 ||
  fail "expected existing frontend container $CONTAINER_NAME was not found"

EXISTING_PROJECT=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$CONTAINER_NAME")
EXISTING_SERVICE=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$CONTAINER_NAME")
EXISTING_PORT=$(docker inspect --format '{{with (index .HostConfig.PortBindings "80/tcp")}}{{(index . 0).HostPort}}{{end}}' "$CONTAINER_NAME")
[ "$EXISTING_PROJECT" = "$PROJECT_NAME" ] ||
  fail "$CONTAINER_NAME belongs to Compose project $EXISTING_PROJECT, not $PROJECT_NAME"
[ "$EXISTING_SERVICE" = "$SERVICE_NAME" ] ||
  fail "$CONTAINER_NAME belongs to Compose service $EXISTING_SERVICE, not $SERVICE_NAME"
[ "$EXISTING_PORT" = "8080" ] ||
  fail "$CONTAINER_NAME does not currently publish container port 80 on host port 8080"

docker compose --project-name "$PROJECT_NAME" --file "$COMPOSE_FILE" config --quiet
docker compose --project-name "$PROJECT_NAME" --file "$COMPOSE_FILE" config --services |
  grep -Fxq "$SERVICE_NAME" || fail "frontend service is missing from $COMPOSE_FILE"

docker network inspect ilto-backend-proxy >/dev/null 2>&1 || docker network create --internal ilto-backend-proxy

docker compose --project-name "$PROJECT_NAME" --file "$COMPOSE_FILE" build "$SERVICE_NAME"
docker run --rm --entrypoint nginx ilto-frontend:latest -t
docker compose --project-name "$PROJECT_NAME" --file "$COMPOSE_FILE" up --detach --no-deps "$SERVICE_NAME"

NETWORKS=$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{"\n"}}{{end}}' "$CONTAINER_NAME")
printf '%s\n' "$NETWORKS" | grep -Fxq stack_ilto_network ||
  fail "$CONTAINER_NAME is not attached to stack_ilto_network"
printf '%s\n' "$NETWORKS" | grep -Fxq ilto-backend-proxy ||
  fail "$CONTAINER_NAME is not attached to ilto-backend-proxy"

curl --fail --silent --show-error http://127.0.0.1:8080/ >/dev/null ||
  fail "the SPA is not responding on http://127.0.0.1:8080/"

printf '%s\n' "Frontend deployed without restarting other stack services."
printf '%s\n' "When the backend is available, run: npm run deploy:verify"

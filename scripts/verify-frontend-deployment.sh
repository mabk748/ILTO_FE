#!/bin/sh
set -eu

CONTAINER_NAME=ilto_frontend

fail() {
  printf 'Frontend verification failed: %s\n' "$1" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker is not installed or not on PATH"
command -v curl >/dev/null 2>&1 || fail "curl is required"
docker inspect "$CONTAINER_NAME" >/dev/null 2>&1 ||
  fail "expected container $CONTAINER_NAME was not found"

NETWORKS=$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{"\n"}}{{end}}' "$CONTAINER_NAME")
printf '%s\n' "$NETWORKS" | grep -Fxq stack_ilto_network ||
  fail "$CONTAINER_NAME is not attached to stack_ilto_network"
printf '%s\n' "$NETWORKS" | grep -Fxq ilto-backend-proxy ||
  fail "$CONTAINER_NAME is not attached to ilto-backend-proxy"

curl --fail --silent --show-error http://127.0.0.1:8080/ >/dev/null ||
  fail "the SPA is not responding on http://127.0.0.1:8080/"

docker exec "$CONTAINER_NAME" wget -qO- http://api:8001/healthz >/dev/null ||
  fail "the frontend container cannot reach http://api:8001/healthz"

STATUS=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' http://127.0.0.1:8080/api/v1/learning/skills)
[ "$STATUS" = "401" ] ||
  fail "expected unauthenticated /api/v1/learning/skills to return 401, received $STATUS"

printf '%s\n' "Frontend networks, SPA, backend DNS path, and unauthenticated API proxy verified."

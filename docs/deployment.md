# Frontend container deployment

The tracked frontend deployment definition is intentionally limited to the
existing `stack` Compose project's `frontend` service. It preserves the
`ilto_frontend` container name, host port `8080`, and existing
`stack_ilto_network`. Cloudflare Tunnel configuration remains outside this
repository.

The service also joins the external, internal Docker network
`ilto-backend-proxy`. Only the backend API service named `api` should join that
network. PostgreSQL and the backend's private/default network must not be attached
to the frontend.

## Configuration

- `Dockerfile` builds the Vite application with `VITE_API_BASE_URL=/api/v1` and
  serves it from `nginx:alpine`.
- `nginx.conf` dynamically resolves `api:8001` through Docker DNS and proxies
  only `/api/`. All other paths retain SPA fallback behavior.
- `compose.frontend.yaml` declares only the existing frontend service and its two
  networks. It does not define or control any other `stack` service.
- `scripts/deploy-frontend.sh` refuses to proceed without the tracked Compose
  definition and existing `stack_ilto_network`. It never runs Compose `down`,
  restarts the whole project, removes orphans, or changes volumes.

`/docs`, `/openapi.json`, `/healthz`, and `/readyz` are not Nginx proxy routes.
FastAPI documentation remains reachable only through the backend's later SSH
tunnel to its loopback-bound port.

## Render and prepare

These commands do not recreate the running frontend:

```bash
docker compose --project-name stack --file compose.frontend.yaml config
npm run deploy -- --no-bump
```

The Docker image can be built and its Nginx syntax checked independently:

```bash
docker compose --project-name stack --file compose.frontend.yaml build frontend
docker run --rm --entrypoint nginx ilto-frontend:latest -t
```

## Apply on the existing server

Run from this repository on the server:

```bash
npm run deploy -- --apply
```

The guarded script creates the shared network with:

```bash
docker network inspect ilto-backend-proxy >/dev/null 2>&1 || docker network create --internal ilto-backend-proxy
```

It then builds and recreates only `frontend`, verifies that `ilto_frontend` is on
both required networks, and checks the SPA on `http://127.0.0.1:8080/`.

After the separately deployed backend has attached its `api` service to
`ilto-backend-proxy`, run:

```bash
npm run deploy:verify
```

That read-only check verifies the two frontend network attachments, reaches
`http://api:8001/healthz` from inside `ilto_frontend`, and expects an
unauthenticated request through
`http://127.0.0.1:8080/api/v1/learning/skills` to return HTTP 401.

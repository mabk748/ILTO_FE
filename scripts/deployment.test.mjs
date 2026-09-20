import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("the production image fixes the browser API root to the same origin", async () => {
  const [dockerfile, environment] = await Promise.all([
    read("Dockerfile"),
    read(".env.example"),
  ]);

  assert.match(dockerfile, /^ENV VITE_API_BASE_URL=\/api\/v1$/m);
  assert.match(dockerfile, /^FROM nginx:alpine$/m);
  assert.match(environment, /^VITE_API_BASE_URL=\/api\/v1$/m);
  assert.doesNotMatch(`${dockerfile}\n${environment}`, /localhost|api:8001/);
});

test("Compose preserves the stack frontend and joins only the two required networks", async () => {
  const compose = await read("compose.frontend.yaml");

  assert.match(compose, /^name: stack$/m);
  assert.match(compose, /^  frontend:$/m);
  assert.match(compose, /^    container_name: ilto_frontend$/m);
  assert.match(compose, /^      - "8080:80"$/m);
  assert.match(compose, /^    name: stack_ilto_network$/m);
  assert.match(compose, /^    name: ilto-backend-proxy$/m);
  assert.equal((compose.match(/^    external: true$/gm) ?? []).length, 2);
  assert.doesNotMatch(compose, /postgres|8001:|5432|host\.docker\.internal/);
});

test("Nginx dynamically resolves only the API service and retains SPA fallback", async () => {
  const nginx = await read("nginx.conf");

  for (const directive of [
    "resolver 127.0.0.11 ipv6=off valid=10s;",
    "location /api/ {",
    "set $ilto_api http://api:8001;",
    "proxy_pass $ilto_api;",
    "proxy_http_version 1.1;",
    "proxy_set_header Host $host;",
    "proxy_set_header X-Real-IP $remote_addr;",
    "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "proxy_set_header X-Forwarded-Proto https;",
    "try_files $uri $uri/ /index.html;",
  ]) {
    assert.ok(
      nginx.includes(directive),
      `missing Nginx directive: ${directive}`,
    );
  }
  assert.doesNotMatch(
    nginx,
    /Access-Control-Allow|\/docs|openapi\.json|healthz|readyz/,
  );
});

test("the guarded deploy changes only the frontend service", async () => {
  const deploy = await read("scripts/deploy-frontend.sh");

  assert.ok(
    deploy.includes(
      "docker network inspect ilto-backend-proxy >/dev/null 2>&1 || docker network create --internal ilto-backend-proxy",
    ),
  );
  assert.match(deploy, /build "\$SERVICE_NAME"/);
  assert.match(deploy, /up --detach --no-deps "\$SERVICE_NAME"/);
  assert.match(deploy, /com\.docker\.compose\.project/);
  assert.match(deploy, /com\.docker\.compose\.service/);
  assert.match(deploy, /EXISTING_PORT/);
  assert.doesNotMatch(
    deploy,
    /docker compose[^\n]*(?:down|restart|--remove-orphans)|docker volume|docker system prune/,
  );
});

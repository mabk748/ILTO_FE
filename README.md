# ILTO Frontend

Personal operations dashboard built with React, TypeScript, Vite, Tailwind CSS,
Radix UI, TanStack Query, and Recharts.

## Development

Use Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

The production default is the same-origin path `/api/v1`. For direct local
development, save a trusted absolute HTTP(S) API root in **Settings**, or copy
`.env.example` to `.env.local` and configure `VITE_API_BASE_URL` (restart Vite
after environment changes). A saved Settings URL overrides the environment
default. Clearing it restores the default. Without either, data screens display
a configuration error. Connection Settings remain accessible before sign-in.

All domain functions call the configured backend. Owner authentication and the
Projects module are implemented in the separate ILTO_BE repository; other
unavailable routes display errors with retry.
There are no production mock records or n8n fallback URLs.

## Backend contract

See [docs/backend-api.md](docs/backend-api.md) for proposed routes, request DTOs,
response formats, migration details, and implementation order. The API Docs
screen lists the domain routes. Projects and owner authentication now match the
implemented backend; other modules remain proposed contracts.

```ts
import { getProjects, createProject } from "@/lib/api/projects.ts";

const page = await getProjects({ page: 1, per_page: 20 });
// createProject accepts CreateProjectInput and returns the server's saved Project.
```

The shared client supports JSON GET/POST/PATCH/DELETE, encoded query parameters,
a 15-second default timeout, AbortSignal cancellation, and ApiError failures.
It reads the saved base URL per request. Switching backends resets cached data
and cancels old reads. Existing buttons save through the backend and refresh
their related queries only after successful responses.

Open `http://localhost:5173` and sign in with the configured backend owner.
Use **localhost** consistently, not a mixture of localhost and 127.0.0.1.
Requests include the HTTP-only session cookie; passwords and session tokens are
never stored in localStorage or the query cache. Sign-out/expiry cancel requests
and clear private query data. Failed server sign-out offers retry without claiming
the cookie was revoked. The default post-login screen is Projects.

Projects provides create/edit/delete controls for projects, sprints, tasks, and
milestones, plus keyboard-accessible Kanban status changes. All Projects views
share refreshed backend data. See [integration notes and browser checklist](docs/projects-integration.md).

## Versioning and deployment

`app.config.json` is the single source for the displayed application version.
ILTO uses `major.minor.iteration`, with a minimum two-digit iteration counter;
use `npm run app:version` to read the current tracked value. This is intentionally
independent of npm's SemVer package metadata.

```bash
npm run app:version
npm run app:version -- bump iteration  # 0.1.00 -> 0.1.01
npm run app:version -- bump minor      # 0.1.00 -> 0.2.00
npm run app:version -- bump major      # 0.1.00 -> 1.0.00
npm run app:version -- set 0.5.00
```

The deploy workflow defaults to an iteration bump, then runs lint, tests,
formatting, and the production build. A failed preparation restores the previous
version. Without `--apply` it only prepares `dist/` and does not change Docker.
Run the apply form from the existing server checkout to build and recreate only
the `stack` project's `frontend` service.

```bash
npm run deploy
npm run deploy -- --apply
npm run deploy -- --bump minor --apply
npm run deploy -- --no-bump --apply
npm run deploy:verify
```

The guarded deployment requires the existing `stack_ilto_network`, creates the
internal external network `ilto-backend-proxy` when absent, builds the Nginx
image, verifies its syntax, and runs Compose with `--no-deps frontend`. It does
not stop or restart the rest of `stack`, touch PostgreSQL, publish backend ports,
or configure Cloudflare. After the backend API joins the shared proxy network,
`npm run deploy:verify` checks Docker DNS, backend health, and the expected 401
through the browser-facing API proxy. See [deployment details](docs/deployment.md).

## Checks

```bash
npm run build
npm run lint
npm test
npm run prettier-check
```

Tests stub HTTP responses; they do not contact the backend. Test fixtures are
independent of the removed production mock-data layer.

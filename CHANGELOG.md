# Changelog

## 2026-10-21 — V0.2.01 Project Workstreams

- Added typed Workstream contracts and Project-scoped loading for the backend
  `0020_project_workstreams` API, including Task/Sprint assignment fields and
  server-supported Workstream filters.
- Added a compact Workstream manager inside Project EXPLORE with accessible
  create, edit, archive and reactivate flows. Workstreams are described as
  persistent areas of responsibility and remain visually distinct from
  time-bounded Sprints.
- Added URL-backed Task and Sprint filtering by Workstream, explicit unassigned
  states, archived-assignment visibility, and Workstream context on Board and
  Sprint records. Archived Workstreams cannot receive new assignments.
- Preserved Project-level NOW/NEXT behavior and all FocusSession concurrency,
  note-draft and completion safeguards. Workstream actions use the existing
  authenticated client, query invalidation and error patterns.
- Updated explicit Project deletion previews/results to include the backend's
  Workstream count and advanced the tracked application version from `0.2.00`
  to `0.2.01`. No backend, dependency, database, Docker or deployment change
  was made.

### Actual checks

- Focused Workstream and Projects regression checks: passed (8 Vitest files,
  207 tests).
- `npm test`: passed (90 Vitest files, 589 tests, plus version and deployment
  checks).
- `npm run build`, `npm run lint`, `npm run prettier-check`, and
  `git diff --check`: passed.
- API/UI tests use mocked HTTP and jsdom. No live V0.2.01 backend or real-browser
  integration was claimed in this batch.

## 2026-10-18 — V0.2 pre-deployment visual polish

- Removed accidental cross-axis scrollbars from shared tab and module
  navigation. Wide strips retain keyboard focus, horizontal touch/trackpad
  scrolling and automatic visibility for the active control.
- Replaced empty Project EXPLORE metrics, Infrastructure charts, Intelligence
  comparisons and Dashboard zero walls with compact, truthful empty states.
  Existing create/navigation actions remain available where the current UI
  already supports them.
- Made single- and two-observation charts explicit: single Infrastructure and
  Health samples no longer imply a trend, while sparse comparison, finance and
  assessment charts show their observations and explain the limited evidence.
- Reduced nested cyan labels and duplicate Infrastructure activity headings
  without changing Atlas tokens, routes, APIs, calculations or FocusSession
  safeguards.
- Advanced the tracked application version through the established version
  command from `0.1.07` to `0.2.00`. No deployment or Docker command was run.

### Actual checks

- Focused visual-polish checks: passed (11 Vitest files, 66 tests).
- `npm test`: passed (90 Vitest files, 578 tests, plus version and deployment checks).
- `npm run build`: passed (3,108 Vite modules transformed).
- `npm run lint`, `npm run prettier-check`, and `git diff --check`: passed.
- `npm run app:version`: confirmed the tracked version is `0.2.00`.
- Automated checks use jsdom and mocked HTTP where APIs are involved; this pass
  did not deploy or perform a second real-browser walkthrough.

## 2026-10-18 — Atlas × Nexus global module refinement

- Added a small shared module composition layer for responsive page shells,
  identity headers, view navigation and section headings, then applied it to
  Dashboard, Horizon, Work, Learning, Infrastructure, Finances, Health, Social,
  Appearance, Logistics and Settings without changing their data behavior.
- Reorganized Dashboard panels and responsive KPI/action layouts around the
  existing calculations. Module view switchers now share accessible pressed
  state, explicit horizontal overflow and consistent mobile spacing.
- Refined Projects management—records, Board, Sprints, Milestones, Gantt and
  Architecture—with clearer hierarchy, filter surfaces, responsive Project
  cards, intentional wide-view scrolling and semantic status treatment. The
  NOW/NEXT/EXPLORE execution workspace was not redesigned.
- Replaced conflicting status, urgency, health and completion color literals
  with Atlas success, warning, destructive and information tokens. Category
  colors that distinguish real domain types remain intentionally unchanged.
- Preserved all API contracts, authentication, FocusSession safeguards, query
  behavior, business calculations and domain models. No package, backend,
  database, Docker or deployment change was made.

### Actual checks

- Targeted module/layout/Projects checks: passed (12 Vitest files, 87 tests).
- `npm test`: passed (88 Vitest files, 575 tests, plus version and deployment checks).
- `npm run build`: passed (3,108 Vite modules transformed).
- `npm run lint`, `npm run prettier-check`, and `git diff --check`: passed.
- Browser/device visual validation was not available in this agent runtime; the
  responsive assertions use jsdom and mocked HTTP where APIs are involved.

## 2026-10-18 — Atlas × Nexus Focus workspace redesign

- Rebuilt the route-scoped Project header and NOW/NEXT/EXPLORE navigation around
  the existing Atlas tokens, with clear Project identity, status, priority and
  responsive execution-area selection.
- Recast NOW as a state-responsive execution cockpit with an approximately 70/30
  desktop composition, mobile-first primary controls, real Task/Sprint/Milestone/
  repository context and distinct recommendation, active, paused,
  active-elsewhere, finished follow-up, empty, loading and error treatments.
- Recast NEXT as a bounded vertical execution queue with URL-backed priority and
  Sprint filters, real status/effort context and direct NOW/Board actions. The
  deterministic queue builder and backend recommendation rationale remain the
  only ordering/recommendation sources.
- Reorganized EXPLORE around a primary Task delivery insight, semantic status
  distribution, active Sprint points, Milestones, repositories and backend Focus
  action, with a readable mobile velocity list and all existing management views.
- Preserved V0.1.17 Pause/Switch preconditions, session-scoped drafts, explicit
  note saves, unsaved-navigation protection, no automatic 409 retry, stable
  idempotent retry and separate FocusSession/Task completion. No backend,
  dependency, database, Docker or deployment change was made.

### Actual checks

- `npm test`: passed (87 Vitest files, 573 tests, plus version and deployment checks).
- `npm run build`: passed (3,107 Vite modules transformed).
- `npm run lint`, `npm run prettier-check`, and `git diff --check`: passed.
- Browser/device visual validation was not available in this agent runtime; the
  responsive assertions use mocked HTTP and jsdom.

## 2026-10-17 — Atlas × Nexus Projects navigation and System View

- Replaced the default cross-project management screen at `/projects` with a
  responsive Project directory, URL-backed search/status filtering, a single
  prominent Create Project action and an owner-current FocusSession shortcut.
  Project selection retains the existing Project workspace redirect to NOW.
- Preserved every legacy `?tab=...` management deep link behind a quieter
  Management entry, including Board, Sprints, Milestones, Gantt, Architecture,
  creation, import and deletion workflows.
- Added `/projects?view=system` using only confirmed Project-to-Repository
  ownership. Its dependency-free SVG/CSS canvas supports bounded zoom/pan,
  selection, contextual details and direct Project navigation, with an
  accessible list alternative and explicit empty/unlinked states.
- Documented that the backend currently exposes no System entity, System
  membership or Project-to-Project relationship. No inferred links or fictional
  topology were introduced; the minimal future persisted topology requirements
  are recorded in `docs/projects-system-view.md`.
- Added mocked HTTP/jsdom and pure regression coverage for directory routing,
  filters, Create Project, active Focus, empty/error states, legacy navigation,
  graph integrity, controls and keyboard-operable links. No new dependency,
  backend/database change, deployment or real-data write was performed.

### Actual checks

- `npm test`: passed (87 Vitest files, 573 tests, plus version and deployment checks).
- `npm run build`: passed (3,107 Vite modules transformed).
- `npm run lint`, `npm run prettier-check`, and `git diff --check`: passed.

## 2026-10-17 — Atlas × Nexus global UI foundation

- Replaced the previous indigo-heavy palette with reusable dark canvas, surface,
  text, cyan focus, success, warning, destructive and information tokens. Shared
  buttons, cards, forms, dialogs, sheets, tabs, progress, tooltips, loading,
  empty and error states now consume the same visual system.
- Rebuilt the authenticated application shell with grouped navigation,
  contextual route breadcrumbs, a locally persisted desktop icon rail, keyboard
  focus treatment and accessible collapsed-state tooltips.
- Added a compact mobile header, primary bottom navigation and a complete
  retractable navigation drawer with account actions and safe-area spacing.
- Applied the foundation through shared primitives to all modules, added a
  reusable empty-state component, and moved Dashboard/Notifications status
  treatment onto semantic tokens. Existing V0.2 workflows and API contracts
  were not changed.

### Actual checks

- `npm test`: passed (85 Vitest files, 566 tests, plus version and deployment checks).
- `npm run build`: passed (3,104 Vite modules transformed).
- `npm run lint`, `npm run prettier-check`, and `git diff --check`: passed.
- No new dependency, backend/database change, Docker action or deployment was
  performed. Real-browser screenshots were unavailable in this agent runtime.

## 2026-10-17 — V0.2 release hardening: Pause/Switch note integrity

- Updated Pause and Switch for the backend 0.1.17 note-concurrency contract.
  Unchanged notes are omitted and preserved; explicit updates and clears send
  the draft's captured `expected_updated_at` with `resume_note`.
- Bound every dirty Focus note to its originating FocusSession ID, saved-note
  baseline and server version. A stale Switch can reveal another session
  without rebinding or submitting the retained draft to that session.
- Kept uncertain Switch retries on the original idempotency key and exact
  payload. Conflict responses refetch authoritative Focus state, retain the
  draft, and never repeat a lifecycle action automatically.
- Added mocked adapter/workspace regressions for unchanged, updated and cleared
  Pause/Switch notes, stale versions, explicit recovery, cross-session draft
  isolation, background refresh and stable-key replay. No backend, database,
  dependency, Docker or deployment changes were made.

### Actual checks

- `npm run test:unit -- src/lib/api/project-focus.test.ts src/pages/projects/focus-workspace.test.tsx`: passed (48 tests).
- `npm test`: passed (85 Vitest files, 564 tests, plus version and deployment checks).
- `npm run build`: passed (3,103 Vite modules transformed).
- `npm run lint`, `npm run prettier-check`, and `git diff --check`: passed.

## 2026-10-16 — V0.2 Corrective Batch 3 focus-aware Project deletion

- Updated the deletion-impact adapter for backend 0.1.16 FocusSession counts,
  finished-history impact, and the required opaque confirmation token; the
  explicit delete payload now sends the reviewed token with the exact Project
  name. Restrictive normal Project deletion remains unchanged.
- Added active/paused/finished FocusSession grouping and blocker messaging to
  the existing confirmation dialog without exposing resume notes or offering
  automatic session transitions.
- Kept a reviewed preview snapshot separate from background query data. Stale,
  unfinished-session, unsafe-dependency and database 409s refresh authoritative
  impact without retrying deletion and require explicit reconfirmation.
- Added mocked adapter/dialog coverage for complete FocusSession previews,
  token submission, blockers, stale previews, and reconfirmation. No backend,
  database, dependency or deployment changes were made.

### Actual checks

- `npm run test:unit -- src/lib/api/project-deletion.test.ts src/pages/projects/project-deletion-dialog.test.tsx`: passed (53 tests).
- `npm test`: passed (85 Vitest files, 560 tests, plus version and deployment checks).
- `npm run build`: passed (3,103 Vite modules transformed).

## 2026-10-16 — V0.2 Corrective Batch 2 persistent Focus notes

- Added the typed backend 0.1.15 `PATCH /projects/focus-sessions/:id/resume-note`
  adapter with `expected_updated_at`, null clearing and complete-session
  response validation. No backend or deployment changes were made.
- Added explicit Save Note editing for active and paused FocusSessions, character
  limits, dirty/saved states, server-confirmed reconciliation and cache updates.
- Preserved drafts across background refetches and 409/unknown outcomes; a
  conflict refreshes authoritative state and requires an explicit retry after
  review. Existing Pause/Switch payload behavior and V0.1.14 switch preconditions
  remain intact.
- Added scoped internal navigation/history and browser-exit protection for dirty
  Focus notes without migrating the existing BrowserRouter or adding packages.
- Added mocked adapter, active/paused persistence, clearing, conflict/retry,
  refetch-preservation and navigation-guard coverage.

### Actual checks

- `npm run test:unit -- src/lib/api/project-focus.test.ts src/pages/projects/focus-workspace.test.tsx`: passed (39 tests).
- `npm test`: passed (85 Vitest files, 554 tests, plus version and deployment checks).
- `npm run build`: passed (3,103 Vite modules transformed).

## 2026-10-16 — V0.2 Phase 3 NEXT queue and Project dashboard

- Replaced the status-only NEXT list with a bounded, exclusive execution horizon
  for paused sessions, current in-progress work, highest-priority eligible Tasks,
  active-Sprint Tasks, review work and a small upcoming sample. Added NOW/Board
  drill-downs and server-confirmed direct resume without reproducing the backlog.
- Expanded EXPLORE overview into a Project-scoped interactive dashboard using
  actual Task statuses, all active Sprints, story points, Milestones, repository
  references, backend Focus recommendation and existing Sprint velocity.
- Labels every percentage by its explicit denominator and omits it for zero
  denominators; no objective completion, blocker state or fabricated data is
  inferred.
- Fixed numeric Radix Progress semantics, Horizon invalidation after Milestone
  writes/imports, global Dashboard first-active-Sprint selection, scoped
  hardcoded chart/status colors and keyboard navigation for Gantt bars.
- Added mocked HTTP/jsdom and pure-function coverage for queue ordering/bounds,
  multiple active Sprints, zero-value cases, drill-down/history, Focus resume,
  Milestone invalidation, Progress semantics and management-view regressions.
- Documented metric definitions, interaction paths and verification limits in
  `docs/projects-phase3.md`. No package, backend/database change, deployment,
  real-data write or sample record was added.

### Actual checks

- `npm test`: 85 Vitest files and 545 tests passed, followed by successful
  version-script and deployment-script checks. New UI/integration coverage uses
  mocked HTTP/jsdom, not a live backend or browser.
- `npm run build`: passed (3,103 Vite modules transformed).
- `npm run lint`, `npm run prettier-check`, and `git diff --check`: passed with
  no errors or warnings.
- Live backend/cookie checks, real two-tab interaction and physical mobile visual
  verification were not performed.

## 2026-10-15 — V0.2 Phase 2 Focus execution workspace

- Replaced read-only NOW with backend-recommended, active, paused and cross-Project
  execution states; retained URL Task selection, NEXT and EXPLORE navigation.
- Added typed, validated Focus adapters, focused TanStack Query keys, explicit
  Start/Pause/Resume/Switch/Finish controls and server-saved stopping context.
- Notes save only on Pause or Switch: the confirmed backend has no standalone
  Save Note endpoint. No unsupported button, endpoint or DTO field was added.
- Separated confirmed session finishing from manual free-text criteria
  acknowledgement and Task review/done PATCH, including partial-success recovery.
- Added stable-key retries for uncertain starts/switches, authoritative refetches,
  stale-tab checks and explicit offline refusal. Focus writes refresh only Focus
  and the shared Projects snapshot (including Gantt and backend Sprint velocity).
- Preserved recovery UI across snapshot refresh failures. Owner changes now clear
  private query data and remount private routes to discard previous-owner drafts.
- Added mocked HTTP/jsdom journey, adapter, concurrency, failure, auth recovery and
  isolation tests; adapted Phase 1 navigation tests to asynchronous Focus reads.
- Documented backend race limits, missing standalone note saving/history lookup,
  migration prerequisite and live-browser checks still needed in
  `docs/projects-focus.md`. No packages, backend/database changes, real data
  population, deployment or application-version change.

### Actual checks

- `npm test`: 82 Vitest files and 533 tests passed, followed by successful
  version-script and deployment-script checks. Focus tests use mocked HTTP/jsdom,
  not a live backend or browser.
- `npm run build`: passed (3,098 Vite modules transformed).
- `npm run lint`, `npm run prettier-check`, and `git diff --check`: passed.
- `graphify update .`: refreshed the AST/code graph (2,094 nodes, 4,318 edges,
  106 communities). No documentation semantic re-extraction or LLM relabeling
  was performed.

## 2026-10-15 — V0.2 Phase 1 Project workspace foundation

- Added owner-protected Project workspace routes with a base-route redirect to
  NOW, URL-backed task/view selection, browser history and explicit unavailable
  states for unknown/deleted Projects and invalid or cross-project Tasks.
- Added Open project links while preserving `/projects`, existing `?tab=...`
  links, global imports, cross-project editing and explicit deletion workflows.
- Added read-only NOW task context and a bounded NEXT queue grouped by actual
  status and priority. No recommendations, execution actions or persistent
  sessions are claimed or implemented.
- Reused existing management views/editors in EXPLORE. Route-derived scope
  restricts displayed collections and editor choices without narrowing the
  shared query cache or changing any API payload/endpoint. Existing mutation
  invalidation refreshes workspace counts, tasks, Sprint progress and Gantt.
- Added scoped overview, local monochrome styling, wrapping navigation/actions,
  accessible task selection and keyboard-operable EXPLORE tabs. Shared dialogs
  and existing semantic status colors retain their current styles.
- Documented navigation, scope, workflow boundaries and the decisions required
  before a later execution/session phase. No packages, backend/database changes,
  live data writes, deployment or application-version change are included.

### Actual checks

- Added 33 mocked HTTP/jsdom workspace tests and four application-route cases.
- `npm test`: 80 Vitest files and 498 tests passed, followed by successful
  version-script and deployment-script checks.
- `npx tsc -b --pretty false` and `npm run build`: passed (3,091 Vite modules).
- `npm run lint`, `npm run prettier-check` and `git diff --check`: passed.
- `graphify update .`: refreshed the AST/code graph (2,023 nodes, 4,112 edges).
  Changed communities received deterministic hub names; no LLM relabeling or
  documentation semantic re-extraction was performed.
- No live backend/browser checks were performed. Responsive classes, link/tab
  semantics and keyboard activation are covered in jsdom, not visual layout or
  device-level interaction.

## 2026-10-12 — Explicit Project deletion with contents

- Preserved restrictive normal DELETE and added a separate Project-list action
  for the supplied Backend 0.1.11 impact-preview/transactional-deletion contract.
- Added typed API adapters with fail-closed response validation, backend-only
  deletion/unlink counts, opaque blocking reasons, exact typed-name confirmation,
  duplicate-submit protection, no optimistic deletion, and no mutation retries.
- Kept the result dialog outside disappearing Project rows, showing actual POST
  counts until acknowledged. Preserved input on recoverable errors, refreshed
  impact on 409, refreshed Projects on 404, and retained global auth handling.
- Scoped success invalidation to Projects/repositories, Learning (preserved but
  unlinked records), Dashboard, Intelligence, and Horizon milestone projections.
- Documented the two delete paths and navigation: there is no Project detail
  route; the existing list remains and its URL-filter logic removes stale IDs.
- Added mocked transport/dialog coverage and retained existing editing,
  repository, and import behavior. No packages, backend changes, live data
  deletion, or deployment are included.

### Actual checks

- New deletion coverage: 47 mocked HTTP/jsdom tests. Focused Projects regression
  run: 7 files and 116 tests passed.
- `npm test`: 79 Vitest files and 461 tests passed, followed by successful
  version-script and deployment-script checks.
- `npm run build`, `npm run lint`, `npm run prettier-check`, and
  `git diff --check`: passed.
- Live backend deletion and real-browser/mobile verification were not performed.

## 2026-10-04 — Learning planning import

- Added a JSON-first Learning planning importer for Goals, recurring weekly
  schedules, and milestones. It supports canonical full packages and selected
  single-resource arrays, local parsing, a complete validation preview, and
  downloadable realistic templates.
- Added deterministic package `import_key`, existing Goal ID/title, and
  existing Project ID/name resolution. The browser sends only canonical backend
  references and writable fields while preserving null versus omitted values,
  zero planned minutes, and false active state.
- Added one server-confirmed atomic `POST /learning/import` flow with
  `duplicate_policy: "reject"`, retained failed previews, structured row error
  mapping, explicit 409/413/422/network guidance, confirmed result counts, and
  Learning-prefix query invalidation.
- CSV and all evidence/resource imports remain deferred. No package or package
  version was added or changed.

### Actual checks

- Focused Learning import/API/page suite: 4 Vitest files and 32 tests passed
  (mocked HTTP/jsdom).
- `npm test`: 77 Vitest files and 414 tests passed, followed by all four
  version-script tests and all four deployment tests.
- `npx tsc -b --pretty false`, `npm run lint`,
  `npm run prettier-check`, and `git diff --check`: passed.
- `npm run build`: TypeScript and the production Vite build passed; 3,085
  modules were transformed.
- `graphify update .`: refreshed the code graph successfully.
- No live backend import or browser verification was performed; no user data was
  created or changed.

## 2026-09-27 — Finance workflow and application time zone

- Made Transactions the first/default Finance view and moved the complete,
  newest-first transaction table out of Budget. Transactions now show category,
  explicit currency, payment method, full selected-zone date/time, tags, amount,
  and server-confirmed edit/delete controls.
- Replaced the single display currency with an accessible all/subset filter for
  EUR, MAD, and USD while retaining a separate new-entry default. Finance lists,
  summaries, bills, portfolio records, Dashboard values, Appearance spend, and
  Intelligence comparisons honor the selection without adding monetary values
  from unlike currencies. Privacy masking remains available globally.
- Added transaction payment metadata for cash, bank transfer, card, mobile
  payment, direct debit, and other. Transaction entry now selects currency
  explicitly and only offers matching budget categories.
- Added a validated IANA time-zone setting. The live Dashboard clock, absolute
  timestamps, chart labels, and all existing `datetime-local` editors now use
  that setting while API requests continue to send UTC ISO instants. The
  setting is browser-local pending the documented backend preference endpoint.
- Expanded the backend handoff with currency/payment migrations, integrity
  rules, and a user-scoped time-zone synchronization contract. No package or
  package version was added or changed.

### Actual checks

- `npm test`: 64 Vitest files and 316 tests passed, followed by the Node version
  and deployment workflow tests.
- `npx tsc -b --pretty false`, `npm run lint`, `npm run prettier-check`, and
  `git diff --check`: passed.
- `npm run build`: TypeScript and the production Vite build passed; 3,057
  modules were transformed.
- Live browser/API verification was not run. The backend guide says migration
  `0013_finance_multi_currency` is prepared but not applied, and payment type
  plus the preference endpoints still require backend implementation. No real
  financial records were created or modified.

## 2026-09-25 — Honest Dashboard no-data scores

- Changed Dashboard domain scores to use `null` when their required source
  records are absent, preserving numeric zero only for a real calculated score.
- Added a neutral “No data” presentation with no percentage fill or Critical
  label. Learning now requires at least one stored card, Work requires at least
  one deadline, and the composite System score requires all three of its source
  scores before it is calculated.
- Added focused calculation and rendering coverage for empty inputs, valid zero
  scores, source-record requirements, and the neutral no-data state. No package
  was added or changed.

## 2026-09-20 — Frontend container deployment preparation

- Added a multi-stage Node/Vite to `nginx:alpine` image that fixes the deployed
  browser API root to same-origin `/api/v1`. The API client now safely accepts a
  root-relative base while retaining saved trusted HTTP(S) development
  overrides and `credentials: "include"` requests.
- Added a frontend-only `stack` Compose definition that preserves the
  `ilto_frontend` name and host port 8080, retains `stack_ilto_network`, and
  joins the external `ilto-backend-proxy` network without defining or attaching
  to PostgreSQL or the backend's private/default network.
- Added dynamic Docker-DNS Nginx resolution for `api:8001`. Only `/api/` is
  proxied, with the request path unchanged; all other paths retain the SPA
  fallback, and no CORS or public backend documentation routes were introduced.
- Replaced the previous rsync apply path with a guarded frontend-only Compose
  deployment. It verifies the existing project, service, container, port, and
  stack network before creating the internal proxy network, building the image,
  checking Nginx, and recreating only `frontend` with `--no-deps`. A separate
  read-only verifier covers both networks, host SPA access, backend health from
  the frontend container, and the unauthenticated API 401.
- Added deployment documentation and safety tests. No npm package or package
  version was added or changed.

### Actual checks

- `docker compose --project-name stack --file compose.frontend.yaml config`:
  rendered successfully with only `frontend`, host mapping `8080:80`, and the
  two external networks.
- `docker compose --project-name stack --file compose.frontend.yaml build frontend`:
  built `ilto-frontend:latest`; the container build passed TypeScript/Vite and
  transformed 3,051 modules.
- `docker run --rm --entrypoint nginx ilto-frontend:latest -t`: passed. A
  temporary unexposed container also started before any backend was available
  and served `/` with HTTP 200.
- `npm test`: 57 Vitest files and 291 tests passed, followed by the Node version
  and deployment workflow tests.
- `npm run lint`, `npx tsc -b --pretty false`,
  `npm run prettier-check`, `npm run build`, shell syntax checks, and
  `git diff --check`: passed; the standalone Vite build transformed 3,051
  modules.
- `npm run deploy -- --no-bump`: completed the full preparation workflow for
  ILTO 0.1.01 and explicitly made no Docker changes.
- The available Docker host is not the existing server and has no
  `ilto_frontend` container. No frontend was recreated and no network was
  created, so live server network membership, localhost:8080, backend health,
  and proxied 401 checks remain pending.

## 2026-09-20 — Learning skill CRUD integration

- Added authenticated Learning skill create, partial-update, and delete adapters
  for the deployed ILTO 0.1.02 contract. Runtime payload filtering sends only
  the seven writable skill fields, preserving a zero `gap_score`, empty
  resource arrays, and roadmap moves while excluding all server-owned fields.
- Added accessible skill controls to each roadmap. Editors validate owned
  roadmap selection, level values, integer gap scores from 0 through 100, and
  resource count/content limits; failed writes leave the form and its values
  visible, and deletion requires confirmation.
- Split Learning reads into stable roadmap, skill, due-card, and reading query
  keys. Confirmed skill writes now refetch skills and roadmaps so API ordering
  and server-derived roadmap counts remain authoritative, and invalidate the
  Dashboard summary without optimistic count updates.
- Added API, editor, component, page-integration, ordering, error, invalidation,
  server-confirmed-count, and session-clearing coverage. No package was added
  or version-changed.

### Actual checks

- Focused Learning/auth suite: 7 Vitest files and 41 tests passed (mocked
  HTTP/jsdom).
- `npm test`: 57 Vitest files and 289 tests passed, followed by the Node version
  workflow test.
- `npm run lint`, `npx tsc -b --pretty false`, and
  `npm run prettier-check`: passed.
- `npm run build`: TypeScript and the production Vite build passed (3,051
  modules transformed).
- Live owner-session browser verification was not run because no disposable
  authenticated browser session was provided; no backend or database changes
  were made.

## 2026-09-20 — Application version and deploy workflow

- Added tracked `app.config.json` as the single source for the displayed ILTO
  version and initialized it to `0.1.00`. The application shell now reads this
  value instead of hardcoding `v0.1`; npm's unused package-version field was
  removed to avoid maintaining a competing version number.
- Added `npm run app:version` commands to show, explicitly set, or increment the
  major, minor, or iteration counters. Iterations retain at least two digits,
  so the default progression is `0.1.00`, `0.1.01`, and so on; no future metric
  policy has been invented.
- Added a guarded `npm run deploy` workflow. It defaults to an iteration bump,
  runs lint, all tests, formatting, and the production build, and restores the
  old version if preparation fails. With no target it only prepares `dist/`;
  publishing requires an explicit `user@host:/absolute/path/` rsync target and
  does not delete remote files.
- Added version parsing, formatting, rollover, rejection, and configuration
  write coverage. No package was added or changed.

### Actual checks

- `npm run app:version`: returned `0.1.00`.
- `npm run deploy -- --help`: passed without changing the version or contacting
  a server.
- `npm test`: 56 Vitest files and 278 tests passed, followed by the Node version
  workflow tests.
- `npm run build`: TypeScript and the production Vite build passed (3,050
  modules transformed); the bundled application contains `0.1.00`.
- `npm run lint` and `npm run prettier-check`: passed.
- No upload was attempted because no deployment target was provided.

## 2026-09-19 — Repository cleanup

- Removed 48 unreachable frontend modules: 41 unused UI primitives, three dead
  hooks, two obsolete pages, the unused API barrel, and the retired Convex
  provider. Also removed the five-file Convex scaffold, `convex.json`, and the
  stale generated `tree.txt` snapshot.
- Removed 20 unused direct packages. Runtime removals were
  `@hookform/resolvers`, `@usehercules/auth`, `cmdk`, `convex`,
  `embla-carousel-react`, `input-otp`, `motion`, `oidc-client-ts`,
  `react-day-picker`, `react-hook-form`, `react-oidc-context`,
  `react-resizable-panels`, `use-debounce`, `vaul`, and `zod`. Development
  removals were `@convex-dev/eslint-plugin`, `@edge-runtime/vm`,
  `@tailwindcss/typography`, `@testing-library/user-event`, and `convex-test`.
- Removed the retired Convex aliases and test project, enabled TypeScript's
  unused-symbol checks, restored ESLint's recommended unused-variable checks,
  and fixed the resulting effect, render-purity, dead-export, and component
  structure findings. The remaining production graph is reachable from the
  application entry point; the sole non-production source module is a shared
  Projects test fixture.
- Added no packages. Updated `react-router-dom` to `^7.18.4` for production
  security fixes; updated `@eslint/js` to `^10.0.1`, `eslint` to `^10.11.0`,
  `eslint-plugin-react-hooks` to `^7.1.1`,
  `eslint-plugin-react-refresh` to `^0.5.7`, and `vitest` to `^5.0.1` so the
  clean toolchain resolves without vulnerable versions. Added lockfile
  overrides for `js-yaml@^4.3.2` and `nanoid@^3.3.19`.
- Added a narrow `.prettierignore` for dependencies, build output, the generated
  knowledge graph, and local Codex support files; all maintained source and
  documentation now pass the repository-wide format check.

### Actual checks

- `npm test`: 56 files and 278 tests passed (mocked HTTP/jsdom).
- `npm run build`: TypeScript and the production Vite build passed (3,048
  modules transformed).
- `npm run lint`: passed with zero warnings and zero errors.
- `npm run prettier-check`: all matched files passed.
- `npm audit`: zero known vulnerabilities.
- `npm ls --depth=0` and `git diff --check`: passed.

## 2026-09-19 — Intelligence and Trigger Rules integration

- Kept all six Intelligence datasets as authenticated plain-array reads. Empty
  arrays now render as explicit no-data chart states; null observations remain
  null chart gaps, and the Dashboard reports absent stored commit/sleep history
  instead of plotting a synthetic zero baseline.
- Replaced trigger prototypes with accessible, server-confirmed rule create,
  edit, and delete controls. The nested condition/action payload contains only
  writable fields, retains `enabled: false`, a zero threshold, and
  `target_domain: null`, and never introduces an evaluator or automatic action.
  Rule deletion explains that the server cascades associated audit logs.
- Reworked trigger-log resolution to send exactly `{ resolved: true }`, wait
  for the returned server record, then refresh only Trigger Rules data. Reads
  and writes now show explicit loading, empty, and API failure states without
  retrying writes or making optimistic state changes.
- Added adapter, editor, chart, dashboard-data, rule-control, rule-list, and
  log tests for exact nested payloads, server-owned field exclusion,
  false/zero/null values, failed writes, deletion, strict resolution,
  invalidation, empty charts, preserved null gaps, and no fabricated commit
  data. No packages were added or version-changed.

### Actual checks

- `npx vitest run src/lib/api/intelligence.test.ts src/lib/api/triggers.test.ts src/pages/dashboard/sparkline-data.test.ts src/pages/intelligence/trigger-editor.test.ts src/pages/intelligence/_components/CorrelationCharts.test.tsx src/pages/intelligence/_components/TriggerRuleControls.test.tsx src/pages/intelligence/_components/TriggerBuilder.test.tsx src/pages/intelligence/_components/TriggerLog.test.tsx`: 8 files and 17 tests passed (mocked HTTP/jsdom).
- `npm test`: 56 files and 278 tests passed (mocked HTTP/jsdom; no live backend).
- `npm run build`: TypeScript and the production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI files; no Intelligence or Trigger Rules lint errors.
- Targeted Prettier and `git diff --check` passed. `npm run prettier-check` reports 79 existing/generated skill, graph, and documentation files outside this iteration.
- `graphify update .`: refreshed the AST code graph successfully (1,678 nodes and 4,478 edges).
- Live browser verification was not run: the backend guide records the local
  migration, but this environment has no authenticated owner browser session or
  accessible local frontend session. No rules or logs were created, changed, or
  deleted.

## 2026-09-19 — Notifications integration

- Reworked notification actions as non-retrying, server-confirmed mutations.
  Read and dismiss use the returned notification record only after PATCH
  succeeds, then invalidate/refetch the Notifications list; mark-all uses its
  confirmed 204 response and refetches. Existing domain/status filters remain
  in place throughout the refresh.
- Kept the stored list server-ordered, accepted omitted `action_url` fields,
  removed the unconfirmed read mutation on action-link navigation, and added
  inline action-failure guidance. Dismissed records remain server-owned and are
  not changed by the client during mark-all-read.
- Added explicit adapter and page tests for exact read/dismiss/mark-all payloads,
  absent action URLs, confirmed read/dismiss flows, failed writes, filtering,
  dismissed responses, and empty state. No packages were added or
  version-changed.

### Actual checks

- `npx vitest run src/lib/api/notifications.test.ts src/pages/notifications/page.test.tsx`: 2 files and 8 tests passed (mocked HTTP/jsdom).
- `npm test`: 48 files and 261 tests passed (mocked HTTP/jsdom; no live backend).
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI files; no Notifications lint errors.
- Targeted `npx prettier --check` and `git diff --check` passed. `npm run prettier-check` still reports formatting in 78 pre-existing/generated skill and graph files outside this iteration.
- `graphify update .`: refreshed the AST code graph successfully (1,634 nodes and 4,371 edges).
- Live browser verification was not run: although the backend guide reports the
  retained local Notifications API is migrated, this environment has no owner
  browser session or local frontend server access. No notification records were
  created or changed.

## 2026-09-19 — Logistics integration

- Added accessible, server-confirmed create/edit/delete dialogs for trips,
  documents, and events. Their payload builders send only writable fields,
  convert browser date-times to UTC ISO instants, preserve `false` completion
  and a zero renewal lead, send only the supported explicit nulls, validate
  date ordering before submission, and omit unchanged PATCH fields.
- Tightened checklist completion to send exactly `{ completed: boolean }`.
  Checklist definitions remain imported/read-only; completion and a confirmed
  reset action now use non-retrying mutations, retain server-confirmed state,
  report failures inside the active dialog where applicable, and invalidate
  only the `logistics` query after success.
- Added explicit empty states for events, trips, documents, and imported
  checklists. Document cards present the server-supplied status rather than a
  browser-derived status, while historical events returned with a null trip
  link remain visible.
- Added Logistics adapter, editor, resource-control, checklist, date-order,
  nullable-clear, false/zero, no-op PATCH, failed-write, reset, cache-key, and
  empty-state coverage. No packages were added or version-changed.

### Actual checks

- `npx vitest run src/lib/api/logistics.test.ts src/pages/logistics/logistics-editor.test.ts src/pages/logistics/_components/LogisticsResourceControls.test.tsx src/pages/logistics/_components/ChecklistsView.test.tsx src/pages/logistics/_components/LogisticsViews.empty.test.tsx`: 5 files and 16 tests passed (mocked HTTP/jsdom).
- `npm test`: 46 files and 253 tests passed (mocked HTTP/jsdom; no live backend).
- `npx tsc -b --pretty false` and `npm run build`: passed; the latter completed the production Vite build.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI files; no Logistics lint errors.
- Targeted `npx prettier --check` and `git diff --check` passed. `npm run prettier-check` still reports formatting in 73 pre-existing/generated skill and graph files outside this iteration.
- `graphify update .`: refreshed the AST code graph successfully (1,622 nodes and 4,348 edges).
- Live browser verification was not run: the backend Logistics guide reports
  migration `0009_logistics` is reviewed source only and not applied or routed.
  No owner session or disposable Logistics records were created.

## 2026-09-18 — Appearance integration

- Added accessible, server-confirmed create/edit/delete dialogs for wardrobe
  items and outfit logs. Wardrobe writes exclude server-owned wear data,
  validate six-digit image placeholders, preserve zero purchase prices, convert blank
  nullable values to null, and convert browser date-times to UTC ISO instants.
  Outfit logs require unique current wardrobe IDs, an integer rating from 1 to
  5, and only submit confirmed form values.
- Added explicit inline failures for 404/409/422/503/network/timeout errors,
  disabled mutation retries, retained failed forms, and invalidate only the
  `appearance` query after a server-confirmed write. Both controls prevent
  native form navigation and confirm deletes before issuing DELETE.
- Kept grooming routines and Appearance spend read-only. Added useful Wardrobe,
  Grooming Routine, Outfit Log, and Spend empty states, category/season filter
  feedback, and honest historical-outfit states when no wardrobe items remain
  or a legacy response references a deleted item. Appearance spend is grouped
  and charted by currency, without fabricated exchange-rate totals.
- Added Appearance adapter, editor, resource-control, empty-state, filter,
  missing-reference, validation, request-body, nullable-field, zero-price,
  no-op PATCH, failure, delete-confirmation, and exact cache-invalidation tests.
  No packages were added or version-changed.

### Actual checks

- `npx vitest run src/lib/api/appearance.test.ts src/pages/appearance/appearance-editor.test.ts src/pages/appearance/_components/AppearanceResourceControls.test.tsx src/pages/appearance/_components/AppearanceViews.empty.test.tsx`: 4 files and 18 tests passed (mocked HTTP/jsdom).
- `npm test`: 41 files and 237 tests passed (mocked HTTP/jsdom; no live backend).
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI files; no Appearance lint errors.
- Targeted Prettier and `git diff --check` passed. `graphify update .` refreshed the AST code graph successfully (1,579 nodes and 4,204 edges).
- `npm run prettier-check` still reports formatting in 71 pre-existing skill and generated graph files outside this iteration; targeted Appearance formatting passed.
- Live browser verification was not run: the published guide reports migration
  `0008_appearance` is prepared but not deployed or routed. No owner session or
  disposable Appearance records were created.

## 2026-09-17 — Learning integration

- Added accessible, server-confirmed create/edit/delete dialogs for Learning
  roadmaps and reading entries. Roadmap writes send only `name`, `goal`, and
  `status`; reading writes preserve zero `pages_read`, use explicit
  `completed_at: null` clears, serialize tags as arrays, and convert browser
  date-times to UTC ISO instants. Failed writes remain open and distinguish
  404/409/422/503/network/timeout failures without retries.
- Changed the Learning review tab to load the server-filtered `getDueCards()`
  queue rather than deriving due state in the browser. Mark reviewed sends the
  current ISO timestamp, presents the returned server schedule only after
  confirmation, reports failures inline, and refreshes Learning and Dashboard
  consumers after success. Skills remain read-only.
- Added explicit empty Roadmaps, Reading, and Review Queue states. Roadmap and
  Reading progress now avoid invalid percentages for legacy zero totals while
  retaining the server-returned counts; reading entries with no usable pace say
  so rather than displaying an invented estimate.
- Added Learning API adapter, editor, resource-control, review, empty-state,
  nullable-field, zero-value, no-op PATCH, request-body, error, and cache
  invalidation tests. No packages were added or version-changed.

### Actual checks

- `npx vitest run src/lib/api/learning.test.ts src/pages/learning/learning-editor.test.ts src/pages/learning/_components/LearningResourceControls.test.tsx src/pages/learning/_components/ReviewQueue.test.tsx src/pages/learning/_components/LearningViews.empty.test.tsx`: 5 files and 17 tests passed (mocked HTTP/jsdom).
- `npm test`: 37 files and 219 tests passed (mocked HTTP/jsdom; no live backend).
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI files; no Learning lint errors.
- `npm run prettier-check`: still reports formatting in pre-existing skill and generated graph files outside this iteration; targeted Learning Prettier and `git diff --check` passed.
- `graphify update .`: refreshed the AST code graph successfully (1,531 nodes and 4,059 edges).
- Live browser verification remains pending: the backend Learning module guide is not published in the backend checkout, neither `http://localhost:8001/api/v1/learning/roadmaps` nor `http://localhost:5173/learning` accepted a connection, and no owner login or browser automation is available in this environment. No records have been created.

## 2026-09-16 — Social integration

- Added accessible server-confirmed create/edit/delete controls for contacts.
  The editor converts local date-times to UTC, sends nullable fields as null,
  serializes tags as bounded string arrays, omits unchanged PATCH fields, and
  keeps failed input open with 404/409/422/503/network/timeout guidance.
- Added a confirmed contact-deletion dialog that explains dependent follow-up
  prompts are deleted by the backend. Follow-up completion now sends exactly
  `{ completed }`, remains server-confirmed, reports errors inline, and
  refreshes Social and Dashboard data after successful writes.
- Added empty contact/follow-up/goal states, a separate contact-search no-result
  state, goal progress clamping with actual values retained, and a Dashboard
  label that states its active-contact percentage calculation. Networking goals
  and follow-up definitions remain read-only.
- Added Social adapter, editor, control, toggle, empty-state, no-result, and
  progress tests. No packages were added or version-changed.

### Actual checks

- `npm test`: 33 files and 204 tests passed (mocked HTTP/jsdom; no live backend).
- `npx vitest run src/lib/api/social.test.ts src/pages/social/social-editor.test.ts src/pages/social/_components/ContactControls.test.tsx src/pages/social/_components/FollowUpList.test.tsx src/pages/social/_components/SocialViews.empty.test.tsx`: 5 files and 17 tests passed.
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI files; no Social lint errors.
- Targeted `npx prettier --check` and `git diff --check`: passed.
- Live browser verification was not run: the Social backend module guide is not
  published yet, so deployment state for migration `0006_social` is unknown;
  `curl` checks to `http://localhost:8001/api/v1/social/contacts` and
  `http://localhost:5173/` were refused. No owner-cookie session or disposable
  Social records were created.

## 2026-09-16 — Work integration

- Added accessible server-confirmed create/edit/delete controls for deadlines
  and certifications. The forms prevent native navigation, avoid mutation
  retries, send UTC instants and JSON numbers, retain failed input, exclude
  server-owned fields, and give distinct 404/409/422/503/network/timeout
  guidance.
- Added deadline completion and reopen controls. Deadline presentation now uses
  the backend-returned `pending`/`completed`/`overdue` state, so completed past
  deadlines are never displayed as overdue. The Dashboard label now states its
  exact `100 − 25 per overdue deadline` calculation.
- Retained read-only career milestones and compliance definitions. Compliance
  now toggles only `{ completed }`, displays confirmed state only, reports
  failures inline, and refreshes Work and Dashboard data after success.
- Added independent empty states for milestones, certifications, deadlines, and
  compliance; clamped certification progress-bar width while preserving actual
  logged/target values; and documented the view's priority-then-due-date queue
  ordering. No packages were added or version-changed.

### Actual checks

- `npm test`: 28 files and 187 tests passed (mocked HTTP/jsdom; no live backend).
- `npx vitest run src/lib/api/work.test.ts src/pages/work/work-editor.test.ts src/pages/work/_components/WorkViews.empty.test.tsx src/pages/work/_components/WorkResourceControls.test.tsx src/pages/work/_components/ComplianceChecklist.test.tsx src/pages/work/_components/DeadlineQueue.test.tsx`: 6 files and 19 tests passed.
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI files; no Work lint errors.
- Targeted `npx prettier --check` and `git diff --check`: passed.
- `graphify update .`: code graph refreshed successfully.
- Live browser verification was not run: the backend guide reports migration
  `0005_work` prepared but not applied and local Compose services stopped. No
  owner-cookie session or disposable Work/compliance records were created.

## 2026-09-15 — Health integration

- Added accessible create/edit/delete controls for training plans, workout
  sessions, and health metrics. Forms prevent native navigation, send only
  writable fields, convert local date-times to UTC, keep failures open, avoid
  mutation retries, and distinguish 404/409/422/503/network/timeout failures.
- Added strict plan/workout/metric validation, nullable metric PATCH clearing,
  no-op PATCH comparison, server-owned field exclusion, and confirmed-write
  invalidation for `health`, `dashboard`, and `intelligence` consumers.
- Added explicit empty states, zero-safe/clamped plan progress, visible static
  schedule guidance, chronological metric chart data with null gaps, neutral
  metric deltas, stored-metric controls, and a direct Dashboard Log-workout
  Sessions workflow. The Dashboard label now states its exact seven-day sleep
  versus eight-hour target calculation.
- Added mocked adapter, editor, control, chart-order, empty-state, failed-write,
  nullable-field, cache-invalidation, and direct-workflow tests. No packages
  were added or version-changed.

### Actual checks

- `npm test`: 22 files and 168 tests passed (mocked HTTP/jsdom; no live backend).
- `npx vitest run src/lib/api/health.test.ts src/pages/health/health-editor.test.ts src/pages/health/_components/HealthViews.empty.test.tsx src/pages/health/_components/HealthResourceControls.test.tsx`: 4 files and 18 tests passed.
- `npx tsc -b --pretty false`: passed.
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI files; no Health lint errors.
- Targeted `npx prettier --check` and `git diff --check`: passed.
- `graphify update .`: code graph refreshed successfully.
- Live browser verification was not run: the backend guide is now present and reports migration `0004_health` prepared but not applied; `curl` checks to `http://localhost:8001/api/v1/health/training-plans` and `http://localhost:5173/` were refused. No owner-cookie session or disposable health records were created.

## 2026-09-15 — Finance integration

- Added confirmed create/edit/delete controls for budget categories, transactions,
  and bills. Forms send only writable fields, convert UI date-times to UTC,
  enforce EUR/decimal/color/category/tag rules, keep failures open, and surface
  404/409/422/503/network/timeout failures without optimistic financial state.
- Preserved the bill paid/unpaid PATCH action and invalidated `finances`,
  `dashboard`, and `intelligence` queries after every successful Finance write.
- Fixed zero-budget `NaN%`, added explicit empty states for all Finance tables and
  charts, removed silent transaction truncation, preserved full timestamp instants
  in the net-worth chart, and labeled gross buy value as before-sells rather than
  presenting it as a holdings calculation.
- Added Finance adapter, editor, control, bill-action, and empty-state tests.
  No packages were added or version-changed.

### Actual checks

- `npm test`: 18 files and 150 tests passed (mocked HTTP/jsdom; no live backend).
- `npm test -- src/lib/api/finances.test.ts src/pages/finances/finance-editor.test.ts src/pages/finances/_components/FinanceResourceControls.test.tsx src/pages/finances/_components/FinanceViews.empty.test.tsx src/pages/finances/_components/BillsView.test.tsx`: 5 files and 17 tests passed.
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI
  files; no new lint errors.
- Targeted `npx prettier --check` and `git diff --check`: passed.
- `graphify update .`: code graph refreshed successfully.
- `curl -sS -i --max-time 5 http://localhost:8001/api/v1/finances/budget-categories`
  and `http://localhost:5173/`: connection refused. The backend guide reports
  Finance migration `0003_finances` is not deployed, so no owner-cookie browser
  checks or disposable financial records were created or cleaned up.

## 2026-09-15 — Infrastructure controls and readout verification

- Added authenticated Infrastructure node create/edit/delete controls for the
  five writable metadata fields. Writes use the existing helpers, wait for
  server confirmation, preserve 409/422/404/network failures, and invalidate
  Infrastructure and Dashboard inventory queries after success.
- Updated `InfraNode.last_seen` to `ISODateString | null` and display
  `Never observed` until the first stored measurement. Empty node inventory,
  empty metric history, and empty Git activity remain honest.
- Corrected MetricsChart to union and sort actual timestamp instants, retain
  missing observations as `null`, preserve timestamps internally, and derive
  stable colors from real node IDs. Metric history now validates the documented
  integer window of 1–720 hours without slicing backend rows.
- Added focused adapter, UI, and chart tests for node CRUD, server-confirmed
  dialogs, conflict handling, time-window validation, uneven sampling, empty
  first nodes, timezone offsets, null gaps, and stable colors. No packages were
  added or version-changed.

### Actual checks

- `npm test`: 14 files and 135 tests passed (mocked HTTP/jsdom; no live backend).
- `npm test -- src/lib/api/adapters.test.ts src/lib/api/auth.test.ts
src/lib/api/client.test.ts src/components/providers/query-client.test.tsx
src/pages/projects/project-editor.test.ts
src/pages/projects/projects-integration.test.tsx`: 6 files and 99 tests
  passed (mocked Projects/auth/cache verification).
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with eight existing Fast Refresh warnings in shared UI
  files; no new lint errors.
- `npx prettier --check` on all changed frontend files: passed.
- `git diff --check`: passed.
- `graphify update .`: code graph refreshed successfully.
- `curl -sS -i --max-time 5 http://localhost:8001/api/v1/projects` and
  `/infrastructure/nodes`: connection refused; the local API was unavailable.
  `http://localhost:5173` was also unavailable, so live owner-cookie/browser
  checks, disposable Projects records, and cleanup could not be performed.

## 2026-09-13 — Frontend Projects integration

### Iteration 1: owner authentication and connection

- Replaced the unmounted auth provider with backend owner-cookie sessions; added
  login, session checks, protected routes, logout, and expiry handling.
- Credentialed requests, private cache/request cancellation, late-response
  protection, no-store requests, and honest failed-logout retry.
- Distinct invalid credential, 429, 503, origin, configuration, network, and timeout
  guidance; Settings remains available while logged out.
- Updated local API examples to localhost:8001 without changing saved settings.
- Added mocked auth transport, UI, cache-clearing, and backend-switch tests.

### Iteration 2: shared Projects data and resource editing

- Added small accessible create/edit/delete dialogs for all four resources and
  keyboard-accessible Kanban PATCH status controls.
- Writable-field-only payloads, omission versus null, filtered optional task
  sprints, dependent-delete conflict messages, and server-owned velocity.
- Shared query data refreshes summary, Board, sprint progress/velocity,
  milestones, and Gantt. Dashboard/Intelligence queries are also invalidated.
- Summary now sums points across all active sprints, replacing first-sprint-only
  selection. Calendar-date display avoids UTC day shifts and premature overdue
  labels. Gantt no longer invents an end date for open-ended projects.

### Iteration 3: verification and handoff

- Added mocked payload/validation tests, four-resource create/delete form tests,
  task relationship tests, refresh tests including mounted Gantt, and timezone tests.
- The initial Gantt test caught a tooltip mismatch for open-ended projects; fixed
  the tooltip to match the visible label. Dialogs preserve their original record
  snapshot for PATCH diffs and restore focus to their triggering control.
- Added `docs/projects-integration.md` with contract decisions and a live browser
  verification checklist. No packages added, no backend/database changes,
  no deployment, and no real data populated. Existing unrelated changes preserved.

### Actual checks

- `npm test`: 125 tests across 12 files (mocked HTTP/jsdom, no live backend).
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed with zero errors and eight pre-existing Fast Refresh
  warnings in shared UI files.
- `TZ=America/Los_Angeles npm test -- src/lib/calendar-date.test.ts src/pages/projects/projects-integration.test.tsx`:
  18 tests passed.
- Targeted Prettier check of integration files passed. Repository-wide
  `npm run prettier-check` reports formatting in existing Graphify instructions,
  AGENTS.md, and generated graph artifacts; those were not reformatted.
- `git diff --check`: passed.
- Required `graphify update .`: AST code graph refreshed without LLM/API calls.
  Community labels were regenerated from hubs; changed documents still need a
  future semantic update. Graphify retained a backup of the previous graph.
- Real backend/browser cookie, CORS, database, and visual checks were not run.

# Changelog

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

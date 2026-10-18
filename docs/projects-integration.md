# Projects frontend integration

## Atlas × Nexus Batch 3 — Focus workspace

The Project-scoped NOW/NEXT/EXPLORE surface has been recomposed as the Atlas ×
Nexus execution workspace without changing its API or state contracts. NOW is a
state-responsive execution cockpit, NEXT is a bounded URL-filterable execution
queue, and EXPLORE uses a primary delivery insight with progressively disclosed
management views. FocusSession concurrency, draft identity, idempotency,
navigation guards and the separation between finishing a session and completing
a Task remain intact. See [Focus workspace redesign](projects-focus-redesign.md)
for the data boundaries, responsive structure and verification scope.

## Atlas × Nexus Batch 2 — directory and System View

`/projects` now opens the Project directory rather than the cross-project
management surface. Search and status filtering use URL parameters, an active
FocusSession is linked back to its Project NOW workspace, and every Project link
continues through `/projects/:projectId`, whose existing redirect selects NOW.
The former management surface remains available through **Management** and all
existing `/projects?tab=projects|board|sprints|milestones|gantt|architecture`
deep links.

`/projects?view=system` is an honest architecture projection. The current API
persists Project-to-Repository ownership through `ProjectRepository.project_id`,
so those are the only nodes and edges drawn. Repository reads compose the
confirmed per-Project endpoint; no global repository endpoint is assumed.
Systems, System membership and Project-to-Project relationships are not present
in the current frontend/backend contract and are neither inferred nor mocked.
The canvas supports selection, contextual details, bounded zoom/pan and direct
Project navigation, with a keyboard-friendly list alternative. See
[Projects directory and System View](projects-system-view.md) for the complete
data boundary and future backend requirements.

## V0.2 Phase 2 — Focus execution

NOW now consumes the confirmed backend FocusSession/recommendation contracts.
See [Focus execution workspace](projects-focus.md) for endpoints, components,
journeys, completion/recovery semantics, tests and remaining contract limitations.
The Phase 1 section below records the foundation; its read-only NOW and deferred
session statements describe that earlier iteration, not the current NOW screen.

## V0.2 Phase 1 — Project workspace

The cross-project management page and all `/projects?tab=...` URLs remain
available behind the directory's **Management** action. Each Project card has an
**Open project** link. The owner-protected application router also supports:

- `/projects/:projectId` → `/projects/:projectId/now` (replace redirect, preserving
  query parameters).
- `/projects/:projectId/now?task=:taskId` — manual, read-only selected task.
- `/projects/:projectId/next` — compact planning queue.
- `/projects/:projectId/explore?view=overview|board|sprints|milestones|gantt|architecture`.
  Overview is the default; an unknown view is reported explicitly.

The route Project ID is authoritative. `ProjectScopeContext` contains only that
validated ID; it is not an independent selection store. `useProjectsViewData`
derives scoped collections from the existing `['projects', 'data']` snapshot
without replacing its complete cache. Query-string Project filters cannot expand
the scope. The workspace validates Project existence before rendering its views;
missing/deleted Projects show an unavailable screen, while request failures offer
retry. No path silently falls back to All Projects.

NOW shows the selected task's existing title, priority, status, description,
free-text acceptance criteria and optional Sprint. Selection and clearing use
`task` in the URL, with Back/Forward support. A missing, deleted or cross-project
task remains an explicit unavailable selection, never an automatic substitute.
**Manage selected task** opens its scoped Board controls; **Show all tasks** removes
that task selection. NOW performs no writes and has no session or recommendation
claims.

NEXT groups open tasks by their actual `in_progress`, `review`, `todo` and
`backlog` statuses, showing at most five per group. Each group is sorted by
critical/high/medium/low priority, then title and ID. Overflow links open that
status on the full Board. Completed tasks remain accessible there. Selecting a
queue item opens its NOW context; no readiness, dependency or blocker state is
inferred.

EXPLORE reuses Kanban, SprintList/VelocityChart, MilestoneList, GanttChart,
ArchitectureView/RepositoryControls and ResourceControls. A new Project overview
shows scoped counts and the existing date/edit/delete controls. Workspace editors
prefill the current Project for creates and restrict Project/Sprint choices to
this route. Cross-project moves, batch imports and the explicit **Delete project
and contents** flow remain in the linked cross-project management page. The
existing restrictive normal DELETE still displays 409 conflicts without cascading.

All existing API adapters, payload shapes, credential handling, query isolation
and invalidation patterns are unchanged. Successful mutations refresh the shared
snapshot used by NOW, NEXT, overview and management views, including Gantt;
repositories retain their existing project-specific query. Multiple active
Sprints are counted, not reduced to a first-Sprint selection. Calendar dates use
the existing timezone-safe calendar formatter.

Workspace styling is locally monochrome; semantic status colors, shared primitives
and the global theme remain intact. Navigation uses links, EXPLORE uses Radix
tabs, the task picker is a labelled native select, and controls have visible focus
styles. The navigation/toolbar wrap at narrow widths. The existing Board and
Gantt remain horizontally scrollable rather than introducing a new visualization.

### Verification and current limits

`workspace.test.tsx` uses mocked HTTP and jsdom, covering routing, unavailable
states, history, scoped collections/selectors, task selection, query-cache
preservation and existing mutations/refresh. App routing and the existing
Projects import, deletion, filtering and repository regression suites also apply.
These tests do not prove actual mobile layout, browser cookie/CORS behavior or
live backend operation; no production data is populated or deleted.

The complete Projects snapshot is still fetched for the single owner; a failed
subcollection can block the workspace. This is presentation scoping, not a new
authorization boundary. No session persists across devices; task selection lives
only in the URL. The queue has no custom ordering or recommendations. Shared
dialogs retain the global palette because they render through portals.

Before a later execution phase, agree the FocusSession ownership/resource model,
allowed state transitions and concurrency policy, server timestamps/duration,
idempotent start/pause/resume/finish semantics, conflict/error responses and
refresh/resume behavior. Recommendation/readiness/dependency contracts are separate
future decisions. No such fields, endpoints or buttons are introduced here.

## Connection and owner session

Frontend: `http://localhost:5173`. API root: `http://localhost:8001/api/v1`.
The saved Settings URL takes priority over `VITE_API_BASE_URL`; existing saved
URLs are not overwritten. Settings work before login. Only connect to a trusted
backend. For deployed use, use HTTPS and coordinate cookie/CORS configuration
with the backend; localhost development uses HTTP.

The mounted owner provider uses `/auth/me`, `/auth/login`, and `/auth/logout`.
Only the backend-returned username lives in memory. Login confirms `/auth/me`
after the POST to detect rejected cookies. No JWT, registration, fake owner,
external identity provider, password storage, or token storage was added.
The previously unmounted Hercules AuthProvider was replaced. The legacy
Hercules hooks, sign-in/callback components, Convex provider, backend scaffold,
and their unused dependencies have since been removed from this frontend.

All configured-backend API requests default to `credentials: "include"`.
401s from protected calls—including reads outside React Query—clear private data,
cancel pending requests, and show sign-in. Session checks also run on window focus
and visibility return. Late responses cannot restore a previous session. Backend
URL changes remount the provider/query cache and abort old requests; they do not
revoke the old backend cookie. Sign out before switching if revocation is wanted.

Sign-out immediately hides private screens and clears query/mutation caches. If
the network request fails, the app warns that the server session may still exist
and offers retry. It does not report successful revocation or auto-check the old
session on focus in that state. Reloading the app may discover that server session.
Cancellation cannot undo server writes already accepted.

429 login errors advise waiting about a minute. The backend currently does not
CORS-expose `Retry-After`, so the UI does not claim a precise server countdown.
503 can mean backend/database unavailability or missing owner configuration.
Network failures can also indicate CORS; the browser does not reliably distinguish
these cases to frontend JavaScript. Browser Origin is never set manually.

## Contract and editing

The existing helpers preserve paginated projects, array subcollections,
snake_case, POST 201, PATCH 200, and DELETE 204. This frontend iteration proposes
two backend additions that are **not available in the currently deployed API**:
task classification/acceptance fields and `POST /projects/import`. Until that
backend migration is deployed, older tasks remain readable (a missing category
is displayed as `other`), but task writes and batch import will receive honest
HTTP validation/not-found errors rather than a browser fallback.

Task `category` is a constrained field because the current product needs stable,
reliable filtering rather than a general tagging system. Values are `design`,
`frontend`, `backend`, `test`, `infrastructure`, `security`, `backup`,
`documentation`, `release`, `research`, and `other`. `acceptance_criteria` is
nullable multiline text with a 10,000-character frontend limit. Task POST sends
both fields; PATCH sends them only when changed and sends explicit null when
criteria are cleared. IDs, timestamps, and all other server-owned fields remain
excluded.

The Projects tab provides project editing; the Board, Sprints, and Milestones
tabs expose their corresponding edit/delete controls. The Architecture tab
manages repositories for one selected Project. The toolbar creates the four
planning resources. A project is required before creating its dependents.

Forms whitelist writable fields; IDs, audit timestamps, and sprint velocity never
enter mutation payloads. PATCH includes only fields changed since the form opened.
Blank nullable inputs deliberately send null; unchanged nullable fields remain
omitted. Task sprint options are filtered by project. Changing the task project
clears the selected sprint. Normal Delete's 409 conflicts explain that dependents
must be moved or removed explicitly. The separate, explicitly confirmed deletion
workflow below delegates deletion/unlinking to the backend. Failed/uncertain
writes do not fabricate success or automatically retry.

Project/sprint boundaries and milestone due dates are `YYYY-MM-DD` calendar dates,
parsed as local calendar components for display. A milestone is overdue only
after its due day. Completion timestamps use `toISOString()` when marking complete;
existing timestamps remain untouched unless completion is toggled, and reopening
sends null. Audit timestamps and velocity remain server-owned.

The previous summary selected only the first active sprint. It now explicitly
shows **Active Sprint Points**, summed across all active sprints. Sprint velocity
continues to use the backend value, not a client-written calculation.

Projects filtering is URL-backed. The controlled `tab` query parameter selects
`projects`, `board`, `sprints`, `milestones`, `gantt`, or `architecture`; repeated `project`,
`sprint`, `milestone`, and `gantt_type` values represent multi-select filters.
Attribute filters use `task_status`, `priority`, `category`, `assignee`,
`sprint_status`, `project_status`, and `project_priority`. Refresh and browser
Back/Forward therefore preserve the view, and Project context can cross tabs.
Unknown IDs and invalid enum values are removed only after collection loading,
so valid deep links are not erased while the request is pending. An empty value
set means **All**, and changing Project automatically removes selected Sprints
or Milestones outside the new Project scope.

Every filter in this iteration is **CLIENT** filtering against the complete
shared Projects snapshot:

- Projects: status and priority.
- Board: Project, Sprint (including **No sprint**), status (including the
  aggregate **Not done** choice), priority, category, and assignee (including
  **Unassigned**).
- Sprints: Project and the real Sprint status field.
- Milestones: Project only. Milestones have no status field and there is no
  Sprint↔Milestone relationship in the current contract.
- Gantt: Project, Sprint, Milestone, and item type. Item types are Project,
  Sprint, and Milestone because Tasks are not rendered by the current Gantt.

Different filter dimensions compose with AND semantics; multiple selected IDs
inside one dimension match any of those selected IDs. Gantt child selectors are
restricted by Project. Selecting a Sprint shows the selected Sprint and its
Project parent when that item type is enabled, not date-overlapping Milestones;
selecting a Milestone similarly does not claim Sprint membership. The filter bar
wraps on narrow screens, reports shown/total counts and active dimensions, and
distinguishes no source data from no filtered matches.

Task cards display project, sprint, category, priority, status, story points,
and a compact criteria indicator; complete criteria remain in the editor.
Missing category values from pre-migration tasks render as `other`. Relationship
labels use an honest unavailable fallback when a referenced record is absent
from the current snapshot.

The planning Projects tabs consume the shared `['projects', 'data']` query,
loading all four planning collections and following project pagination.
Successful planning writes invalidate Projects, Dashboard, and Intelligence
queries. This refreshes summary, Kanban, sprint progress/velocity, milestones,
and Gantt; inactive tabs see the new snapshot on opening. Architecture uses a
separate `['projects', 'repositories', projectId]` query so repository data is
loaded only for the selected Project. Gantt no longer uses a separate
effect-based fetch. Projects without an end date show a start-only marker rather
than an invented 30-day duration.
Long timeline ranges use bounded tick density. Legitimate empty states stay empty.
The existing singular `project_id`, `sprint_id`, and `status` adapter parameters
remain available for explicitly server-scoped reads, but these tab filters do not
use them. No new endpoint query parameter, response field, or migration is needed
because the frontend has the complete intentionally small collections; applying
server filters to only one collection would also make relationship option lists
incomplete.

## Normal Delete versus Delete Project and Contents

**Normal Delete** is unchanged: the existing confirmation dialog calls restrictive
`DELETE /projects/{id}`. A 409 keeps that dialog open. It never escalates into a
cascade, never calls the new POST, and never deletes children one by one.

**Delete project and contents** is a separate action on each Project card in the
Projects tab, implementing the ILTO Backend 0.1.16 contract:

1. Opening the dialog fetches `GET /projects/{id}/delete-impact` (200). It shows
   a loading state with no guessed counts. Failed or malformed previews keep the
   dialog open with deletion disabled and a manual refresh action.
2. Backend `will_delete` counts describe Tasks, Sprints, Milestones, Repositories
   and FocusSessions that will be permanently deleted with the Project. The
   separate `focus_sessions` summary groups active, paused and finished history.
   Finished history is explicitly called out as permanent; resume-note contents
   are never displayed. Backend `will_unlink` counts describe Learning goals,
   Study schedules, and Study sessions that survive with their Project link
   removed. Zero-count resource rows are hidden; an empty section says no
   related records, not that the Project itself will survive.
3. Any `blocking_dependencies`, or an active/paused FocusSession summary,
   disables deletion. The UI displays only backend reasons; it does not
   interpret opaque resources, expose dependency IDs/types or unknown counts,
   inspect other users' records, automatically finish/pause sessions, or offer
   a force bypass.
4. The preview also supplies an opaque 64-character lowercase-hex
   `confirmation_token`. The dialog keeps the exact preview the user reviewed;
   unrelated query refetches cannot replace its token during confirmation.
5. Confirmation requires `typedValue === impact.project.name`: case and every
   space matter, with no trimming, case-folding, or normalization. The preview's
   current name is used even when a cached Project card has an older name.
6. Confirmation sends exactly `{confirm_name: typedValue, confirmation_token}`
   using the reviewed preview token to `POST /projects/{id}/delete-with-contents`.
   The existing API client supplies credentials; the browser supplies Origin.
   There is no optimistic removal, automatic mutation retry, list of resources,
   or submitted preview count. Pending state prevents duplicate submits and
   dialog dismissal.
7. The backend recomputes dependencies and owns confirmation validation and the
   deletion transaction. A 200 `status: "deleted"` result displays the **actual**
   `deleted` and `unlinked` counts until Done/close, never preview counts. The
   dialog is hosted outside project rows so refresh/removal cannot erase the
   result; a failed collection refetch does not turn a confirmed deletion into
   a failed mutation.

401 uses the existing global session-loss handling; 403 uses origin/permission
guidance. A preview or mutation 404 says the Project is no longer available,
disables deletion, and refreshes Projects. A 409 is classified using the
documented detail: stale previews and unfinished FocusSessions both trigger one
fresh preview, retain no old token for submission, and require the user to
review and type the exact Project name again; unsafe-dependency and database
constraint conflicts preserve their backend message and also require review.
The client never retries the destructive POST automatically. 422 exact-name or
token validation errors preserve safe guidance without echoing input values.
503 allows manual retry.
Network/timeout or malformed POST responses do not claim success and warn that
the server operation may already have completed. Non-conflict recoverable
failures preserve typed input; a 409 clears it so the refreshed preview must be
explicitly reviewed and confirmed again. Reopening the dialog starts with empty
confirmation and a new GET.

Successful deletion invalidates these prefixes, and no unrelated modules:

- `['projects']`: `['projects', 'data']` and
  `['projects', 'repositories', projectId]`, including inactive tab data.
- `['learning']`: goals, goal-progress/detail, study schedules, study sessions,
  dashboard, and other derived Learning caches that can expose cleared links.
- `['dashboard']` and `['intelligence']`: existing Project consumers.
- `['horizon']`: `['horizon', 'entries', from, to]`, because Project milestones
  are projected into the calendar.

The temporary `['project-delete-impact', projectId, instance, revision]` query is
deliberately outside the collection prefix so successful deletion does not
refetch a deleted record's preview. Each dialog instance and explicit refresh
gets its own selector/query revision; it has zero retention and no automatic
focus/reconnect refetch.

Explicit deletion with contents is initiated from the Projects list and stays on
`/projects`; the existing URL-filter logic clears deleted Project/Sprint/Milestone
selections after collection refresh. The new workspace links back to this flow;
an open workspace whose Project disappears shows Project unavailable rather than
redirecting to another Project. Focus returns to the triggering
button on cancel, or the Projects list when the deleted button no longer exists.
The shared keyboard-accessible Dialog has labelled confirmation input, textual
warnings, a scrollable mobile body, and stacked actions on narrow screens.

Tests use mocked HTTP/jsdom, including no/finished/unfinished FocusSession
previews, token payloads, stale-preview reconciliation, explicit reconfirmation,
and list-row removal. No live deletion, backend/database modification, or
dependency-rule implementation is part of this frontend change.

## Project repositories and external architecture

The Architecture tab implements the backend's `ProjectRepository` contract:

```text
Project
└── Repositories
    ├── external GitHub view
    └── external GitDiagram view
```

`GET /projects/repositories?project_id=<id>` returns a plain array; POST uses
`/projects/repositories`, and PATCH/DELETE use
`/projects/repositories/:id`. A create body contains exactly `project_id`,
`label`, fixed provider `github`, and `repository_url`. PATCH contains only
changed `label` and `repository_url` values. Repository ID, Project ownership,
provider, and audit timestamps are not client-editable.

Architecture requires one selected Project. Its selector reuses the repeated
`project` URL parameter rather than creating global state. No repository request
runs without a selection. Changing Project changes the scoped query key
immediately, so cards from the previous Project are not retained while the next
request loads. Successful confirmed writes invalidate only that Project's
repository query; failed writes leave their dialog and values visible, and
mutations do not retry automatically.

The backend accepts only HTTPS `github.com/{owner}/{repository}` URLs and returns
a lowercase canonical URL after removing an optional trailing slash and `.git`.
The frontend validates the returned canonical shape again before rendering an
external link. A valid URL is displayed as `owner/repository`; invalid server
data is described without becoming a clickable link.

**Open GitHub** uses the backend-returned canonical URL. **Open GitDiagram**
derives `https://gitdiagram.com/{owner}/{repository}` in memory and never stores
a duplicate URL. Both open in a new tab with `noopener noreferrer`. GitDiagram
remains an external service, and private repositories may require authentication
there. ILTO does not request or store GitHub/GitDiagram credentials.

The view supports multiple repositories, a dedicated no-repositories state, and
stacked actions on narrow screens. It does not claim build, commit, branch, or
repository health data. GitDiagram embedding/self-hosting or API calls, GitHub
OAuth/PATs or API calls, cloning/source ingestion, branch/PR/CI tracking, source
search, snapshots/history/diffs, automatic refresh, and coding-agent integration
remain deferred.

## Projects import pilot

The toolbar now opens an accessible import dialog. It accepts CSV or JSON up to
2 MB and 2,000 rows, parses the selected file locally, never stores its contents
in localStorage, and never sends it to a third party. CSV represents one selected
resource. A JSON array also represents one selected resource, while a JSON object
can package `projects`, `sprints`, `tasks`, and `milestones` arrays in one import.

Exact field names auto-map. Users can manually map source fields or ignore them.
The preview reports every row as valid, warning, or invalid, explains issues,
and includes all rows in its counts; rendering is explicitly capped to the first
100 rows for responsiveness. Client pre-validation covers required fields,
enums, story points, date syntax/order, duplicate package keys, and project/sprint
relationships. It does not claim authority over ownership, foreign keys,
duplicates, constraints, or transactions.

References accept an existing opaque ID, an existing unique case-insensitive
name, or a JSON package-local `import_key`. The normalized request sends explicit
references as `{ kind: "id" | "import_key", value: string }`; users do not need
to know database IDs for package imports. Projects and sprints can define an
`import_key`; sprints/tasks/milestones use `project_ref`, and tasks can use a
nullable `sprint_ref`. Duplicate package keys and a sprint/project mismatch are
invalid. Potential existing-name/title duplicates are warnings, while the batch
always requests the conservative backend policy `duplicate_policy: "reject"`.

Only confirmation sends data, in one authenticated JSON request to
`POST /projects/import`; the browser never posts rows individually. A successful
response displays created counts for all four resources plus skipped, failed,
and warning counts, then invalidates Projects, Dashboard, and Intelligence data.
A failed request keeps the file, mapping, and preview open and does not fabricate
success. The expected backend implementation is atomic: a validation/conflict
failure creates nothing.

Templates are generated from the same frontend field definitions used by mapping:

- CSV single-resource templates for projects, sprints, tasks, and milestones.
- JSON single-resource examples for the same resources.
- A JSON Project Phoenix package demonstrating `phoenix` and `s01` local keys.

CSV fields are the applicable writable fields. For example, tasks use
`project_ref,sprint_ref,title,description,status,priority,category,story_points,acceptance_criteria,assignee`.
Server-owned IDs, `user_id`, audit timestamps, and sprint velocity are excluded.
The complete endpoint, validation, migration, and transaction handoff is in
[projects-backend-implementation-prompt.md](projects-backend-implementation-prompt.md).

## Verification and remaining live checklist

Automated tests use mocked fetch responses and jsdom; they do **not** verify a
real browser cookie jar, CORS, actual database rules, or the running backend.
No real records are created by these tests. No new packages were added.

Once the backend agent has verified configuration/migrations, perform browser
checks against an explicitly approved disposable test dataset:

- Confirm pre-login Settings, `/auth/me` 401, invalid login, and successful login.
- Inspect the HTTP-only cookie, credentialed requests, and browser-generated Origin.
- Confirm a reload retains a valid session; revoked/expired sessions hide private
  screens and clear their cached data. Check focus return and pending-request races.
- Test logout success and failed logout/retry; test a backend URL switch.
- Create/edit/delete all four resources; test null clearing, a task without a
  sprint, same-project sprint assignment, date boundaries, and fractional points.
- Verify 409 deletion restrictions without cascades, and backend velocity updates
  when changing done status, story points, or sprint assignment.
- Check every affected view after writes, including returning to an inactive Gantt
  tab. Verify multiple active sprints and calendar dates in a negative UTC timezone.
- Combine project and sprint filters on the Board, including **No sprint**, and
  combine status/priority/category/assignee filters; confirm task relationship
  labels and criteria indicators remain correct after refresh.
- After the backend schema/import migration is explicitly confirmed, create and
  edit disposable categorized tasks, including criteria clearing. Import each
  single-resource format and one related JSON package; retain returned IDs and
  delete only those records in dependency order.
- Exercise malformed files locally, duplicate/invalid package rows, an API 409,
  an API 422, a timeout/uncertain result, and a successful atomic batch. Refresh
  and confirm imported data persists without a page reload.
- Check keyboard navigation, dialog focus return, narrow screens, and error states.

Backend code/databases, migrations, deployment, and live data population remain
outside this frontend task. No live import or real browser verification was run
because the current backend lacks the new task fields and import endpoint.
Non-Projects modules may still show unavailable-route errors. These browser
checks are a handoff checklist, not claims of live testing.

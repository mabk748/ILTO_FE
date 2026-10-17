# V0.2 Phase 2 — Focus execution workspace and persistent notes

Implemented inside the existing owner-protected `/projects/:projectId/now`
workspace. NEXT and EXPLORE remain the Phase 1 planning/management views. No new
packages, backend changes, database writes, deployment or real-data population
are part of this frontend change.

## Confirmed contract

Inspected backend 0.1.17 `docs/projects-module.md`, Projects schemas/routes/service,
Focus service tests, authentication routes and dependency documentation. Paths
below are relative to the configured API root (local development:
`http://localhost:8001/api/v1`). Existing Settings, credentials-included requests,
401 handling and HTTP-only cookie authentication apply unchanged.

| Request                                          | Payload                                                                                                           | Result                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET `/projects/:id/focus`                        | None                                                                                                              | Project, session contexts, recommendation/reason, alternatives, active Sprints, milestones, empty state |
| GET `/projects/focus-sessions/current`           | None                                                                                                              | Active FocusSession or JSON null; **not** a paused session                                              |
| GET `/projects/focus-sessions/resumable`         | None                                                                                                              | Paused FocusSession array; adapter available, workspace uses its Project projection instead             |
| POST `/projects/focus-sessions`                  | `task_id`, `idempotency_key`                                                                                      | 201 new / 200 replay                                                                                    |
| POST `/projects/focus-sessions/switch`           | `task_id`, `idempotency_key`, `expected_active_session_id`; optional paired `resume_note` + `expected_updated_at` | 201 new / 200 replay; atomically pauses current work and starts target                                  |
| POST `/projects/focus-sessions/:id/pause`        | `{}` unchanged; paired `resume_note` + `expected_updated_at` for an explicit update                               | 200 session                                                                                             |
| POST `/projects/focus-sessions/:id/resume`       | No body                                                                                                           | 200 session                                                                                             |
| POST `/projects/focus-sessions/:id/finish`       | No body                                                                                                           | 200 session; does not complete Task                                                                     |
| PATCH `/projects/focus-sessions/:id/resume-note` | `resume_note` (string or null), `expected_updated_at`                                                             | 200 complete session; 409 on stale/finished session                                                     |
| GET `/projects/tasks?project_id=:id`             | None                                                                                                              | Full Task array including description/free-text criteria omitted from Focus summaries                   |
| PATCH `/projects/tasks/:id`                      | Only `status: review` or `status: done`                                                                           | 200 Task, separately confirmed                                                                          |

Repositories and the shared Projects/Sprints/Tasks/Milestones snapshot continue
using their existing adapters. Dates remain calendar dates; Focus audit timestamps
must include a timezone. IDs and timestamps are never written by the frontend.
Runtime validation rejects malformed/mis-scoped session projections and mismatched
transition responses. Backend authorization remains the security boundary.

## Components and journey

- `project-focus.ts`: typed adapters and response validation.
- `focus-data.ts`: focused query keys, refresh/error/offline helpers.
- `focus-actions.ts`: mutation intents, identity/current-session preflight, stable
  start/switch keys and explicit retries.
- `FocusNow`: recommendations, active/paused/elsewhere states, URL selection and
  operation-result recovery. Existing `workspace.tsx` supplies Project context.
- `FocusTaskDetails` / `FocusRepositories`: Task context and available repository links.
- `FocusSessionControls`: editable persistent notes, Pause/Resume, Finish,
  explicit Switch dialog and scoped unsaved-draft navigation protection.
- `VerifyTaskDialog`: separate manually acknowledged Task status mutation.

With no active/paused work, show the server's recommendation/reason, full Task
context, Start Task, Choose Another and View Details. Explicit URL Task selection
is preserved with browser history and does not change execution. Active work takes
precedence over a conflicting Task selection; Switch Task requires confirmation.
Cross-Project active work links to that Project and prevents an implicit start.
Paused work restores saved context; optional `session` query selection distinguishes
multiple paused records for the same Task. Empty, done-only, review-only and other
no-eligible-Task cases do not fabricate recommendations.

Start/resume may move backlog/todo to `in_progress` on the backend. Execution
controls are visually separated from links to ordinary Task status management.
There are no timers, scores, dependency graphs, structured checklists or AI claims.
The backend supplies recommendations; the browser does not select a first active
Sprint or reimplement ranking. The existing summary aggregates all active Sprints.

## Notes and completion semantics

The backend 0.1.15 `PATCH /projects/focus-sessions/:id/resume-note` endpoint
supports an explicit Save Note action while a session is active or paused. The
frontend sends the note as a string or null and the `updated_at` captured when
the draft began. A 409 refreshes authoritative Focus state, keeps the draft, and
requires an explicit Retry Save Note action after review; it never silently
rebases or retries. The returned complete session updates the current and
Project Focus caches before the normal authoritative refetch. Notes are limited
to 1,000 characters, are not persisted locally, and clear with an explicit empty
value. Failed saves retain the draft. Unsaved drafts block Finish/Resume and warn
on browser exit; internal links and browser history show an accessible
Stay/Discard confirmation scoped to this Focus editor.

Backend 0.1.17 applies the same optimistic note-version guard to Pause and
Switch. The frontend omits both note fields when the draft is unchanged, so the
persisted note is preserved. A changed or explicitly cleared draft sends the
nullable note together with the `updated_at` captured when editing began. A 409
never rebases or repeats a lifecycle action automatically. The draft remains
bound to its originating FocusSession ID and base version; if refetch reveals a
different session, the original draft is retained, protected from navigation,
and never displayed or submitted as the new session's note.

Finish Session changes only the session. Finish & Verify first waits for a confirmed
finish response, then opens the separate Task completion dialog. A checkbox is a
**manual acknowledgement** of existing free-text criteria, never automated
verification or persisted checklist state. Task PATCH sends only the selected
review/done status. Cancel does not undo an already confirmed session finish.

Before PATCH, refetch the Task. Changed status, timestamp or criteria requires
review and acknowledgement again. If PATCH fails, keep the confirmed finish visible
and retry only the Task step. If its response is lost, refetch the Task and report
only the observed status, without attributing an unseen commit to this request.

## Reconciliation and isolation

Queries use `['projects','focus', ...]` keys for owner-wide current session and
Project-scoped Focus/full Task data. Refresh on mount, window/visibility return,
reconnect, explicit refresh and a 15-second foreground poll. Writes refetch all
Focus queries and the exact shared `['projects','data']` snapshot. This updates
summary, NEXT, Kanban, Sprint progress/backend velocity, milestones and Gantt
(already a snapshot consumer). Dashboard/Intelligence and repository caches are
not invalidated by Focus actions.

No optimistic execution updates, automatic mutation retries or offline mutation
queue. A preflight reads the active session; mismatches prevent stale starts,
pauses, resumes or switches where detectable. Disagreement between current and
Project projection disables execution pending refresh. Unknown write outcomes
retain the original intent/key for explicit retry; controls stay blocked until
resolved. A missing current session is never treated as proof of a successful
finish. Retained last-loaded context is labelled with a read error and controls
disabled while read recovery is needed. A shared-snapshot refresh failure no
longer unmounts the execution recovery panel.

Existing authentication cancels requests and clears all private caches on logout
or expiry. It now also clears caches when `/auth/me` reports another username;
the private route remounts to discard draft UI. Each execution/verification write
checks the account identity first. Backend-URL changes already remount all private
providers. No passwords, tokens, session records or note drafts are stored locally.

## Contract limits and manual verification still needed

- Task PATCH has no conditional version/ETag. Focus switch now requires the
  expected outgoing session ID and refuses a stale switch with 409; preflight
  still cannot eliminate a race **between** the read and write. Standalone note
  saves and explicit Pause/Switch note changes use the session `updated_at`
  compare-and-swap contract and require explicit review after conflicts.
- Likewise, cookies can change between identity preflight and a write. The server's
  owner scoping/authorization is authoritative; these client checks are not a new
  security boundary.
- No per-session lookup/history endpoint exists. An unresolved finish must be
  explicitly retried to confirm its result. Unknown-outcome keys are retained only
  while NOW remains mounted; after navigation/reload, authoritative current/paused
  state is refetched, but a past finish cannot be reconstructed from absence.
- Another unfinished session for the Task can block review/done with 409. The
  backend currently blocks Task deletion and explicit Project deletion-with-contents
  when session history exists; the frontend does not cascade or remove history.
- A fresh workspace still needs the complete Projects snapshot. Initial snapshot
  failure blocks entry; stale loaded context can survive subsequent read failures.
- Backend migration `0019_focus_sessions` and backend 0.1.17 runtime support are
  prerequisites, handled separately. No live migrations, backend/browser
  writes, real two-tab sessions, cookie/CORS tests or mobile visual checks were
  run here.

Automated tests use in-memory HTTP fixtures and jsdom: full journey; separate
completion/partial success; explicit switch; stable-key unknown-outcome retry;
lost PATCH response; backend restart/read errors; offline refusal; independent
tab caches/conflicts; concurrent Task edits; invalid/deleted resources; URL history;
auth expiry/re-login and changed-owner isolation. Existing management tests cover
Gantt, milestone and other snapshot refresh behavior. These are **mocked tests**,
not proof of live server concurrency or rendering on a physical device.

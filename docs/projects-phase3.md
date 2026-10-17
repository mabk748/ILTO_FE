# V0.2 Phase 3 — NEXT queue and Project dashboard

Implemented inside the existing owner-protected Project workspace. This phase
does not add API endpoints, DTO fields, persistence, chart packages, backend
changes, migrations, deployment or sample data.

## NEXT execution horizon

NEXT combines the existing Project Task/Sprint snapshot with the confirmed
Project Focus projection. It is deliberately bounded and does not reproduce the
full backlog. A Task appears in only its first applicable group:

1. Paused FocusSession (up to five session records, separate from Task groups).
2. In-progress Tasks (up to five).
3. Critical/high-priority backlog or todo Tasks (up to five).
4. Remaining backlog/todo Tasks in any active Sprint (up to five).
5. Review Tasks (up to five; presented for review, not as startable Focus work).
6. Other backlog/todo Tasks (up to three).

Each group exposes its full count, Task status/priority/Sprint, a URL-backed NOW
selection and a relevant Board drill-down. Paused sessions preserve the backend
resume note and support either a server-confirmed direct resume or opening the
exact session in NOW. An owner-wide active session links to its NOW workspace.
The complete Board remains one action away. Focus loading/error states are
explicit; no blocker label, inferred dependency, sample Task or offline write is
introduced.

## Project overview definitions

All values are scoped from the Project route before reaching the overview.

| Display                 | Definition                                                               | Drill-down                                                          |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Total Tasks             | Number of Project Tasks                                                  | Board                                                               |
| Open tasks              | Total Tasks minus Tasks whose actual status is `done`                    | Board with `not_done` status filter                                 |
| Tasks by status         | Counts for `backlog`, `todo`, `in_progress`, `review`, `done`            | Board with that exact status filter                                 |
| Tasks completed         | `done` Tasks / all Project Tasks                                         | Done Board; percentage omitted when there are no Tasks              |
| Active Sprint points    | Done story points / all story points assigned to every active Sprint     | Active Sprint view; percentage omitted when the denominator is zero |
| Active Sprints          | Count of Sprints whose actual status is `active`                         | Active Sprint view                                                  |
| Milestones completed    | Records with `completed_at` / all Project Milestones                     | Milestones; percentage omitted when there are none                  |
| Upcoming Milestones     | First three incomplete, non-overdue records ordered by calendar due date | Selected Milestone and all-Milestones views                         |
| Repositories            | Up to three existing Project repository labels and total count           | Architecture                                                        |
| Next recommended action | Active, paused or backend-recommended Focus work, in that order          | Matching NOW workspace                                              |
| Backend Sprint velocity | Existing backend velocity values when at least two Sprints exist         | Sprint view                                                         |

The two ratios are labelled by their real denominators. Neither is presented as
objective completion. Calendar dates continue through the existing local-date
formatter and do not acquire a timezone offset.

## Scoped defect corrections

- The shared Radix Progress wrapper now supplies normalized numeric `value` and
  `max` semantics; non-finite input remains indeterminate.
- Milestone create/edit/delete and Project imports invalidate Horizon because
  Horizon derives deadline projections from Milestones.
- The global Dashboard aggregates all active Sprints instead of selecting the
  first one.
- Project status/progress charts use theme tokens rather than hardcoded chart
  colors in the Phase 3 surfaces.
- Gantt bars are keyboard-focusable links to the relevant Project workspace view.

## Verification boundary

Unit and integration coverage uses jsdom and mocked HTTP. It covers metric
definitions, zero denominators, multiple active Sprints, queue bounds and
exclusivity, URL/history drill-downs, milestone invalidation, Progress semantics,
Gantt keyboard links, Focus resume, loading/errors and existing management-view
regressions. Responsive classes are asserted where useful, but physical-device
layout, live cookies/CORS, real backend writes and two real browser tabs require
manual verification.

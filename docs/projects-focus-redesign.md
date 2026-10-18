# Atlas × Nexus Batch 3 — Focus workspace

The owner-protected Project workspace now presents the existing V0.2 execution
flows as one Atlas × Nexus command surface. This is a frontend composition
change only: it adds no endpoint, DTO field, dependency, entity or inferred
relationship.

## Shared workspace

`/projects/:projectId` still redirects to the Project's NOW route. The shared
header uses the route-scoped Project name, description, status and priority,
then exposes NOW, NEXT and EXPLORE as accessible links. Query parameters remain
attached while changing areas so Task selection, management view and history
behavior continue to work. The header's refresh action still refreshes the
existing shared Projects snapshot.

## NOW execution cockpit

NOW uses a single-column mobile flow and an approximately 70/30 desktop layout.
The primary region visibly distinguishes recommendation, selected Task, active,
paused, active-elsewhere, finished-session follow-up, empty, loading and error
states. It keeps the Task title, real status and priority, Sprint, description,
free-text acceptance criteria and execution controls together. FocusSession
completion remains separate from manual Task review/done confirmation.

The context rail is built only from confirmed data: the selected Task's Sprint,
the next incomplete Project Milestone (explicitly labelled as Project-level),
done Tasks divided by total Project Tasks, saved resume context, backend-provided
alternative Tasks and Project repository records. There is no blocker panel
because the current backend has no blocker contract, and no Milestone is claimed
to belong to a Task.

The presentation does not change Focus integrity. Pause and Switch still omit an
unchanged note; explicit updates carry the draft's captured
`expected_updated_at`; Switch retains `expected_active_session_id` and its stable
idempotency key for an uncertain identical attempt. Drafts remain keyed to their
originating FocusSession. A 409 refetches authoritative state without automatic
retry or draft rebinding. Dirty-note internal navigation and browser-exit guards
remain scoped to the Focus note editor.

## NEXT execution queue

NEXT retains `buildNextQueue` as the deterministic source of the bounded,
exclusive groups. It does not calculate a ranking score or duplicate the full
Board. Vertical queue sections expose real status, priority, Sprint and story
points; only the backend-recommended Task receives recommendation rationale.
Paused and active Focus context sits before the queue on narrow screens and in a
desktop context rail otherwise.

Priority and Sprint filters use `queue_priority` and `queue_sprint` URL
parameters. They filter the source Tasks before the existing queue builder and
can be cleared without removing unrelated route parameters. Task actions open
NOW, while group actions open the corresponding filtered Board.

## EXPLORE project intelligence

The overview now leads with one delivery panel: done Tasks divided by all
Project Tasks, a semantic status distribution, and drill-down links for totals,
open, in-progress, completed and individual statuses. Percentages remain absent
when a denominator is zero. The supporting panels use all active Sprints,
server-owned Sprint velocity, Project Milestones, repositories and the current
backend Focus projection.

Board, Sprints, Milestones, Gantt and Architecture remain existing management
views behind the same Radix tabs. Primary Task creation stays visually distinct;
secondary creation and management actions are quieter. Velocity uses the
existing chart at readable widths and a labelled data list on narrow screens;
no chart package was added.

## Responsive and accessibility boundary

Primary controls use full-width mobile treatments where execution speed matters,
while the desktop cockpit and queue add context rails at `lg`. NOW/NEXT content
does not require horizontal scrolling. EXPLORE detail views retain their existing
specialized overflow behavior. Navigation, queue actions, native filters,
dialogs and management links remain keyboard-operable. Progress uses numeric
Radix semantics, icons that do not add meaning are hidden from assistive
technology, and global reduced-motion rules cover the restrained status motion.

The automated coverage is mocked HTTP plus jsdom. It verifies state transitions,
draft/version conflicts, history guards, queue filters, responsive structure,
completion separation and cache reconciliation; it is not real-browser visual,
touch-device or live-backend validation.

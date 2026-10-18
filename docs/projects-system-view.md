# Projects directory and System View

## Routes and navigation

- `/projects` is the default Project directory.
- `/projects?view=system` is the Project System View.
- `/projects/:projectId` retains the existing replace-redirect to
  `/projects/:projectId/now`, including query parameters.
- `/projects?tab=projects|board|sprints|milestones|gantt|architecture` retains
  the cross-project management surface and its existing deep links.
- `/projects?create=milestone` continues to enter management and open the
  existing Milestone creation flow.

Directory search (`q`) and status (`status`) are URL-backed so refresh and
Back/Forward preserve the current directory view. Project cards use only the
loaded Project, Task, Sprint and Milestone fields: open Task count, active Sprint
count and the next unfinished Milestone date are direct projections, not progress
estimates. The owner-current FocusSession endpoint supplies the optional Current
Focus shortcut.

## System View data boundary

The implemented System View consumes:

- paginated Projects from the existing Projects snapshot;
- `GET /projects/repositories?project_id=:projectId` once per Project; and
- `ProjectRepository.project_id` as the only confirmed relationship edge.

It renders Project and Repository nodes and labels the edge as repository
ownership. It does not derive relationships from names, URLs, Tasks, shared
Sprints, dates or visual proximity. The canvas uses local React, CSS transforms
and SVG lines, so no graph package was added. It supports bounded zoom, pointer
pan, selection, contextual details and Project navigation. The list mode exposes
the same data and links without relying on spatial interpretation or pointer
input.

The current contract has no persisted System entity, System-to-Project
membership or Project-to-Project relationship. Consequently, System nodes and
inter-Project edges are intentionally absent. Projects without repositories are
shown as unlinked rather than connected speculatively.

## Minimal backend capability for full topology

A future full System View needs an owner-scoped read contract that provides:

1. Stable System identity and a user-facing name.
2. Explicit System-to-Project membership records referencing valid System and
   Project IDs.
3. Explicit Project-to-Project relationship records with stable identity,
   source Project ID, target Project ID, direction and a constrained relationship
   type.
4. Referential-integrity and deletion behavior for memberships and relationships,
   including what happens when a linked Project or System is archived or removed.
5. A collection read that returns the complete authorized topology, or documented
   pagination whose completeness can be established before drawing the graph.

Optional descriptions or display metadata should be defined by the backend only
when they represent persisted product meaning. Layout coordinates, inferred
similarity and name-based links should remain presentation concerns and must not
be stored as business relationships. No endpoint or DTO for these missing
capabilities is claimed by the current frontend.

## Verification boundary

Unit and jsdom integration tests use mocked HTTP and cover the default directory,
URL search/status filtering, Create Project, active Focus navigation, empty/error
states, graph data integrity, controls and keyboard-operable list links. Pure
tests assert that the graph builder emits only confirmed Project-to-Repository
edges. Existing workspace and management tests cover NOW redirects, deep links
and retained management actions.

These checks do not validate live cookie/CORS behavior, physical touch gestures,
real-device layout or the appearance of a running deployment. No backend,
database, dependency, deployment or real data was changed for this batch.

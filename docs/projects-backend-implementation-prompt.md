# Backend implementation prompt — richer Projects tasks and atomic import

Copy the prompt below into the ILTO backend coding agent. It is a backend-only
handoff derived from the implemented frontend contract.

```text
Implement the backend support required by the richer Projects task model and
Projects import UI. Work only in /home/momopc/Projects/ILTO_BE. Do not edit the
frontend, access or migrate an unapproved server database, deploy, commit, push,
or seed real/user data.

AUDIT BEFORE CODING

First read AGENTS.md, docs/projects-module.md, docs/user-isolation.md, the current
Projects models/schemas/routes/service/tests, shared auth/session and error
handling, database session ownership scoping, migration conventions, generated
SQL/testing conventions, and current OpenAPI behavior. Inspect the latest
migration head before choosing the next revision. Reconcile this requested
contract with actual backend conventions and report any disagreement before a
structural change. Reuse the existing Projects architecture; do not introduce a
generic repository, ETL framework, job queue, plugin system, or new service.

CURRENT VERIFIED MISMATCH

The frontend has implemented this contract, but the backend inspected at handoff
still has neither task.category nor task.acceptance_criteria and has no
POST /api/v1/projects/import route. Existing TaskCreate/TaskPatch/TaskOut and the
tasks table therefore need coordinated changes. The current Projects routes use
plain arrays for sprints/tasks/milestones, a paginated project collection,
POST 201, PATCH 200, DELETE 204, extra="forbid", cookie authentication, exact
Origin checks for writes, user-owned records, and service-level validation. Keep
those conventions.

1. RICHER TASK MODEL

Add a constrained task category with exactly these wire/database values:

- design
- frontend
- backend
- test
- infrastructure
- security
- backup
- documentation
- release
- research
- other

Add nullable multiline acceptance_criteria text. This is one text value, not a
checklist entity.

Update the SQLAlchemy Task model, Pydantic schemas, CRUD service output, and
OpenAPI so every returned Task includes:

  category: one of the literals above
  acceptance_criteria: string | null

Task POST writable fields must be exactly:

{
  project_id: string,
  sprint_id: string | null,
  title: string,
  description: string,
  status: "backlog" | "todo" | "in_progress" | "review" | "done",
  priority: "low" | "medium" | "high" | "critical",
  category: "design" | "frontend" | "backend" | "test" |
            "infrastructure" | "security" | "backup" |
            "documentation" | "release" | "research" | "other",
  assignee: string | null,
  story_points: finite number >= 0 and < 1000000000,
  acceptance_criteria: string | null
}

Task PATCH accepts any subset of the same fields. Omission means unchanged.
Explicit null is allowed only for sprint_id, assignee, and acceptance_criteria;
category and all other nonnullable fields reject null. Keep empty PATCH as a
no-op. Reject id, user_id, created_at, updated_at, and unknown fields with 422.
Keep title/name and assignee limits already established. Add a 10,000-character
maximum for non-null acceptance_criteria. Category should be represented as a
Pydantic Literal/enum consistent with existing schemas and backed by a database
check constraint; index it if the existing index conventions support filtering.

Create an Alembic migration from the actual current head. Add category as
non-null and safely backfill every existing task to "other" before enforcing the
constraint; do not delete or rewrite existing task content. Add nullable
acceptance_criteria Text. Include a downgrade that removes only this migration's
objects. Update any checked/generated SQL artifact only if that remains the
repository convention. Do not run the migration against a server target without
separate approval.

The current frontend performs category/status/priority/assignee filtering over
its complete user-scoped Projects snapshot, so no new GET query parameters are
required by this iteration. Preserve current task ordering and all existing
project/sprint relationship rules.

2. ATOMIC PROJECTS IMPORT ENDPOINT

Add this authenticated, Origin-protected route relative to /api/v1:

POST /projects/import

It accepts application/json, not multipart file upload. The browser parses CSV
or JSON locally and sends one normalized request. Return HTTP 201 only after the
entire batch is committed.

Exact request shape:

{
  "duplicate_policy": "reject",
  "resources": {
    "projects": [ProjectImportProject, ...],
    "sprints": [ProjectImportSprint, ...],
    "tasks": [ProjectImportTask, ...],
    "milestones": [ProjectImportMilestone, ...]
  }
}

All four arrays are required and may be empty. At least one total row is required.
Reject unknown top-level, resources, row, and nested-reference fields. The only
supported duplicate policy is the literal "reject". Do not silently overwrite,
upsert, or partially persist records.

Reference DTO:

{
  "kind": "id" | "import_key",
  "value": nonblank string
}

ProjectImportProject fields:

{
  "import_key"?: nonblank string up to 100 characters,
  "name": string,
  "description": string,
  "status": existing ProjectStatus,
  "priority": existing Priority,
  "start_date": YYYY-MM-DD,
  "end_date": YYYY-MM-DD | null
}

ProjectImportSprint fields:

{
  "import_key"?: nonblank string up to 100 characters,
  "project_ref": ProjectImportReference,
  "name": string,
  "goal": string,
  "status": existing SprintStatus,
  "start_date": YYYY-MM-DD,
  "end_date": YYYY-MM-DD
}

ProjectImportTask fields:

{
  "project_ref": ProjectImportReference,
  "sprint_ref": ProjectImportReference | null,
  "title": string,
  "description": string,
  "status": existing TaskStatus,
  "priority": existing Priority,
  "category": TaskCategory,
  "story_points": existing Points contract,
  "acceptance_criteria": string | null,
  "assignee": string | null
}

ProjectImportMilestone fields:

{
  "project_ref": ProjectImportReference,
  "title": string,
  "description": string,
  "due_date": YYYY-MM-DD,
  "completed_at": timezone-aware ISO timestamp | null
}

Reuse the existing Project/Sprint/Task/Milestone field aliases, bounds, date
validation, nullable rules, and business validation rather than duplicating
slightly different rules. import_key is request-scoped only: never persist or
return it as a domain field. It is case-sensitive after trimming, must be unique
within its resource type in the request, and may contain any nonblank text up to
100 characters. A project and sprint may use the same key because their key
namespaces are separate.

REFERENCE RESOLUTION AND OWNERSHIP

- {kind:"id"} must resolve only to an existing record visible to the current
  signed-in user. A missing or cross-user ID is unavailable; never reveal whether
  another user owns it.
- A project import_key resolves only to a project in this same request.
- A sprint import_key resolves only to a sprint in this same request.
- Sprints and milestones resolve project_ref.
- Tasks resolve project_ref and nullable sprint_ref.
- A task's resolved sprint must belong to its resolved project, including when
  both records are newly created in this batch.
- Never accept a package key for an absent resource and never resolve by an
  unscoped global name in the backend. The frontend converts an existing unique
  name to an owned ID before submission; package-local relationships use keys.
- Generate all persisted IDs server-side. Do not accept client IDs, user_id,
  audit timestamps, or sprint velocity.

Resolve/create in dependency order (projects, sprints, tasks/milestones), using
flush as needed to obtain generated IDs, but do not commit per row. Reuse normal
domain validation and ownership assignment. One transaction must cover the
whole package. On any Pydantic, relationship, ownership, duplicate, database, or
business-rule failure, roll back every row from the request.

DUPLICATE POLICY

Define and test conservative deterministic duplicate identities scoped to the
current user:

- project: case-insensitive trimmed name
- sprint: resolved project + case-insensitive trimmed name
- task: resolved project + case-insensitive trimmed title
- milestone: resolved project + case-insensitive trimmed title

Check both existing records and earlier rows in the same request. Under the only
supported policy "reject", any match returns 409 and the transaction creates
nothing. Do not silently skip, merge, or update. If the audit finds an established
backend uniqueness policy that materially conflicts with these identities, stop
and report it rather than inventing a second rule.

LIMITS

Enforce authoritative backend limits independently of the frontend:

- maximum 2 MiB JSON request body for this endpoint, using the repository's
  existing request-size mechanism if one exists
- maximum 2,000 total rows across all four arrays
- acceptance_criteria maximum 10,000 characters
- import_key maximum 100 characters
- preserve all existing per-field limits

Return 413 for body/row limit breaches if that matches shared exception handling;
otherwise document the framework-consistent status. Do not add background jobs,
multipart uploads, file storage, import history, rollback UI, XLSX, URL imports,
connectors, transformation scripts, fuzzy matching, or AI field mapping.

SUCCESS RESPONSE

Return HTTP 201 and exactly:

{
  "status": "completed",
  "created": {
    "projects": integer >= 0,
    "sprints": integer >= 0,
    "tasks": integer >= 0,
    "milestones": integer >= 0
  },
  "skipped": 0,
  "failed": 0,
  "warnings": [
    {
      "resource": "projects" | "sprints" | "tasks" | "milestones",
      "row": integer >= 1,
      "field": string | null,
      "code": string,
      "message": string
    }
  ]
}

Atomic reject mode means a successful response normally has skipped=0 and
failed=0. Keep warnings empty unless the server made a documented, non-destructive
normalization. Never return a successful/partial response after any failed row.

ERROR CONTRACT

- 401: no/expired session, using existing auth behavior.
- 403: missing/untrusted Origin on this write, using existing CSRF behavior.
- 409: duplicate_policy conflict or a database/business conflict; no rows persist.
- 413: authoritative import size/row limit where supported.
- 422: malformed DTO, unknown/server-owned field, invalid enum/value/date,
  duplicate import_key, unresolved/unavailable reference, or mismatched
  project/sprint; no rows persist.
- 503: use the existing generic database-unavailable handling; do not leak SQL,
  credentials, cross-user data, or imported financial/private content.

For import-specific semantic validation, return structured row-safe details that
identify resource, one-based row, field when applicable, stable code, and message,
without echoing entire input rows. Preserve FastAPI's standard validation detail
for request-schema errors unless the existing app already normalizes it. Document
the resulting OpenAPI error schemas. The frontend currently gives an honest
status-specific error and retains the preview; it does not claim success after
timeout/network uncertainty.

TESTS

Add automated tests consistent with the repository covering at least:

- migration upgrade from an existing task: category backfilled to other,
  acceptance_criteria null, constraints present; downgrade behavior
- task create/output with every category as appropriate and multiline criteria
- task PATCH changing category, clearing criteria with null, omitted-field/no-op
  behavior, 10,001-character rejection, null rejection for category
- rejection of id/user_id/timestamps/unknown fields
- existing task relationships, story points, ordering, velocity, and restricted
  deletion remain unchanged
- exact import request and 201 response counts for each individual resource
- one related project+sprint+task+milestone package using import_key references
- references to existing current-user records by ID
- missing keys/IDs, duplicate keys, wrong key namespace, and a task sprint from a
  different project
- cross-user project/sprint IDs are unavailable and reveal no ownership data
- every duplicate identity against existing data and inside one request returns
  409 with zero persisted rows
- a late invalid row/database constraint proves full transaction rollback
- empty package, over-2,000 rows, oversized body, invalid category, invalid dates,
  non-aware completed_at, and forbidden extra/server-owned fields
- session 401, Origin 403, and user isolation for all imported records
- OpenAPI includes Task fields, import DTOs, response model, and status code
- PostgreSQL-specific constraints/transaction behavior using the repository's
  established integration/migration verification where available

Do not weaken existing tests. Run the repository's formatter, lint/type checks,
unit/integration tests, migration checks, and OpenAPI checks. Record exact commands
and results. Do not apply the migration to the real server until separately
authorized.

DOCUMENTATION AND HANDOFF

Update docs/projects-module.md and API/OpenAPI documentation with the final
audited contract, migration revision, duplicate identities, limits, ownership,
atomic behavior, and deployment prerequisites. Explicitly tell the frontend agent
whether the final route/request/response differs from this prompt. Finish with
files changed, migration created (not applied), exact validation results,
limitations, and one proposed next step: coordinated disposable browser testing
after an approved local migration/deployment.
```

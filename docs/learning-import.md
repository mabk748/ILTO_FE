# Learning planning import

The Learning page provides a server-confirmed **Import plan** workflow for
planning structure only:

- Learning Goals
- recurring weekly study schedules
- Learning milestones

Study sessions, assessments, bottlenecks, weekly reviews, legacy roadmaps and
skills, reading entries, and spaced-repetition cards are not importable. They
remain evidence of work that is recorded through normal ILTO actions.

## Format

Version 1 accepts JSON. CSV is intentionally deferred: the reusable file parser
supports CSV, but field mapping, reference conversion, and CSV value coercion
in the existing importer are Projects-specific. Rebuilding those parts for
Learning would add meaningful complexity without improving the primary
LLM/human-authored package workflow.

A file can be either:

1. a package object with any of the canonical arrays `goals`, `schedules`,
   and `milestones`; or
2. a root JSON array, after which the user selects its one resource type.

Package keys and row fields are exact snake_case contract names. Unknown
package resources and unknown/server-owned row fields are rejected.

## Human-friendly references

An imported Goal may contain an optional `import_key`. The key is local to that
request, is never stored as Learning business data, is trimmed but
case-sensitive, and must be unique among imported Goals.

Schedules and milestones use a string `goal_ref`. Resolution is deterministic:

1. an exact unique package `import_key`;
2. an exact owner-visible existing Goal ID;
3. a case-insensitive, trimmed, unique exact existing Goal title.

There is no fuzzy matching. Missing or ambiguous references make the row
invalid. A resolved reference is sent as either
`{ "kind": "import_key", "value": "..." }` or
`{ "kind": "id", "value": "..." }`.

Goals and schedules may use `linked_project_id`. The human file may supply an
exact owner-visible Project ID or a unique case-insensitive exact Project name.
The request always sends the canonical Project ID. The importer never creates
Projects and does not support Project import keys.

## Validation and request

The browser checks all rows, including rows beyond the 100-row visual preview.
It mirrors current create constraints for required fields, lengths, enums,
integer ranges, real calendar dates, date ordering, nullable fields, references,
and package duplicates. It preserves explicit nullable values, zero
`planned_minutes`, false `active`, and omitted optional fields.

The frontend and backend limits are 2 MiB and 2,000 combined rows. Files are
parsed locally and are not persisted. Confirmation is disabled while any row is
invalid.

Every confirmation sends one authenticated request:

```json
{
  "duplicate_policy": "reject",
  "resources": {
    "goals": [],
    "schedules": [],
    "milestones": []
  }
}
```

The backend import is atomic. It creates records in dependency order and rolls
back the entire request if one record fails. Apparent duplicates are warnings in
the preview because the backend remains authoritative; they are never merged,
updated, overwritten, or silently skipped.

Structured backend errors containing `resource`, `row`, `field`, `code`,
and `message` are shown on the matching preview row. HTTP 409, 413, 422,
network, timeout, cancellation, and unavailable-service errors remain visible
without clearing the selected file or closing the dialog. Mutations are not
automatically retried.

After HTTP 201, the confirmed created/skipped/failed/warning counts remain
visible until the user chooses **View Learning**. The frontend then relies on
invalidation of the `["learning"]` query prefix to refresh the Dashboard,
Goals, schedules, milestones, and per-Goal progress consumers.

## Example package

```json
{
  "goals": [
    {
      "import_key": "aws-saa",
      "title": "AWS Solutions Architect Associate",
      "provider": "AWS",
      "type": "certification",
      "status": "active",
      "start_date": "2026-10-05",
      "target_date": "2026-12-28",
      "exam_date": null,
      "phase": "Phase 1",
      "description": "Prepare for the AWS Solutions Architect Associate exam.",
      "priority": "high",
      "linked_project_id": null
    },
    {
      "import_key": "terraform-004",
      "title": "Terraform Associate 004",
      "provider": "HashiCorp",
      "type": "certification",
      "status": "active",
      "start_date": "2026-10-05",
      "target_date": "2027-01-10",
      "exam_date": null,
      "phase": "Phase 1",
      "description": "Prepare for the Terraform Associate 004 certification.",
      "priority": "high",
      "linked_project_id": null
    }
  ],
  "schedules": [
    {
      "goal_ref": "aws-saa",
      "weekday": 4,
      "session_type": "study",
      "planned_minutes": 90,
      "topic": "Deep certification study",
      "notes": "Focus on the current highest-priority domain.",
      "start_date": "2026-10-05",
      "end_date": null,
      "active": true,
      "linked_project_id": null
    },
    {
      "goal_ref": "terraform-004",
      "weekday": 0,
      "session_type": "practice_questions",
      "planned_minutes": 60,
      "topic": "Practice questions and bottleneck discovery",
      "notes": "",
      "start_date": "2026-10-05",
      "end_date": null,
      "active": true,
      "linked_project_id": null
    }
  ],
  "milestones": [
    {
      "goal_ref": "aws-saa",
      "title": "Complete networking and VPC section",
      "target_date": "2026-11-02",
      "status": "planned"
    },
    {
      "goal_ref": "terraform-004",
      "title": "Complete first Terraform practice exam",
      "target_date": "2026-12-07",
      "status": "planned"
    }
  ]
}
```

The dialog can download this canonical package or a single-resource JSON
template generated from the same frontend contract.

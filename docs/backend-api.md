# Proposed ILTO backend API

This is the frontend's initial contract for the backend to be implemented in a
separate repository. It is a proposal, not a description of a deployed service.
No backend code, authentication server, or automation evaluator is implemented here.

## Connection and migration

The saved Settings API URL takes priority over `VITE_API_BASE_URL`.
Both contain the full root, e.g. `http://localhost:8001/api/v1`.
Endpoint paths below are appended to that root without repeating `/api/v1`.
The previous hardcoded n8n URLs and `VITE_API_BASE` override are retired.

Saving a different URL creates a fresh query cache and remounts the data views.
Old reads are cancelled through AbortSignal and cannot populate the new cache.
Changing domain visibility alone keeps the existing cache.
Requests already sent to a server, especially writes, cannot be undone by switching URLs.

A missing base URL produces a configuration error without a request. An offline
backend produces a network error; an unimplemented route produces an HTTP error.
There is no demo data fallback. Successful empty collections must return `[]`.

## Response and input conventions

- GET collections return JSON arrays unless listed otherwise.
- GET `/projects` returns `PaginatedResponse<Project>`: `{ data, total, page, per_page, total_pages }`.
  The frontend's `getAllProjects` helper follows all pages for overview/timeline screens.
  Defaults are page 1 and per_page 100. Page indexes start at 1; total_pages can be 0 for an empty result.
- GET entity lookups `getProject`, `getTrainingPlan`, and `getContact` translate HTTP 404 to null.
  Other functions propagate 404; latest-metric endpoints should return JSON null when no measurement exists.
- POST creates return HTTP 201 and the saved record, including server IDs and timestamps.
- PATCH returns HTTP 200 and the complete saved record. Omitted fields are unchanged;
  explicit null clears a nullable field. Reject unknown or server-owned fields.
- DELETE returns HTTP 204 with no body. POST `/notifications/read-all` also returns 204.
- Nonempty successful responses require `application/json` or a `+json` content type.
  Do not wrap arrays/records in `{ success, data }`; the frontend does not unwrap such envelopes.
- IDs are opaque nonempty strings. Route parameters are URL encoded. All property
  names on the wire use snake_case. Some frontend arguments use camelCase and are mapped in the adapter.
- Dates and timestamps use ISO 8601; timestamps include a timezone. Null means missing,
  not zero. Aggregated chart series and metric histories must be chronological.
- Collection functions with days/hours/months query parameters request time windows,
  not counts of rows. The backend applies these filters. `due=true` includes only
  cards whose next_review is at or before the current server time.
- Frontend collection adapters check the array/pagination envelope. Entity fields are
  currently trusted TypeScript contracts; full schema validation remains future work.

The DTO definitions are in `src/lib/api/types.ts`, with notification, trigger, and
comparison types in their matching API modules. Each implemented CRUD group exports
`Create<Entity>Input` and `Update<Entity>Input`. Create types omit server-generated
IDs, timestamps, and applicable computed fields; update types are partial create
inputs. Use these definitions when implementing backend request models, and validate
them server-side. This first pass does not add write endpoints for every read-only
aggregate or new CRUD forms.

## Existing screen actions

- Bills PATCH `{ paid: boolean }`; compliance and follow-ups PATCH `{ completed: boolean }`.
- Checklist item PATCH `{ completed: boolean }`. Reset POST sends `{}` and returns the
  complete checklist with all items incomplete. Item IDs are scoped by checklist ID.
- Calendar events PATCH `{ completed: true }`; completed events leave the upcoming list.
- Card review POST sends `{ reviewed_at: ISODateString }`. The backend records the review,
  increments times_reviewed and calculates next_review/interval_days. This initial
  request has no quality rating; the scheduling algorithm is a backend decision.
- Notifications PATCH `{ status: "read" | "dismissed" }`; mark-all-read POST sends `{}`.
  Marking read must not resurrect an already dismissed notification.
- Trigger create/update DTOs exclude trigger_count, last_triggered and created_at.
  Resolving a log entry PATCHes `{ resolved: true }`. The metric catalogue is static
  UI configuration; all rule evaluation, trigger counts and audit records belong to the backend.
- Buttons wait for server acknowledgement and then invalidate relevant query caches.
  A failed write leaves displayed data unchanged and shows an error.

## Errors, authentication, and deployment

HTTP errors may return `{ message: string }`, `{ detail: string }`, or a validation
`detail` array. The client keeps HTTP status and parsed details in ApiError.
It distinguishes configuration, network, timeout, cancellation, HTTP and invalid-response errors.
Reads retry once for network/server failures; configuration, cancellation, malformed-response
and 4xx errors are not retried. Writes are never automatically retried.

Owner authentication now uses the implemented HTTP-only session-cookie contract:
POST `/auth/login` accepts `{username,password}` and returns `{username}` (200),
GET `/auth/me` returns `{username}` (200) or 401, and POST `/auth/logout` returns
204 and revokes the session. The client defaults to `credentials: "include"`.
Passwords and session tokens are never persisted by the frontend. Login is not
retried automatically; 429, 503, invalid credentials, configuration, and network
errors have distinct guidance. Private requests returning 401 clear the session
and cancel/clear authenticated query data, including standalone requests.

Backend CORS must allow credentials from the exact frontend origin
(`http://localhost:5173`). The browser supplies Origin; never set it manually.
Use localhost for both apps. Client `VITE_*` settings are public, never secrets.
See [Projects integration](projects-integration.md) for implementation and test scope.

## Endpoint inventory

### projects

| Method | Path                       | Frontend function | Response                     |
| ------ | -------------------------- | ----------------- | ---------------------------- |
| GET    | `/projects`                | `getProjects`     | `PaginatedResponse<Project>` |
| GET    | `/projects/:id`            | `getProject`      | `Project \| null`            |
| GET    | `/projects/sprints`        | `getSprints`      | `Sprint[]`                   |
| GET    | `/projects/tasks`          | `getTasks`        | `Task[]`                     |
| GET    | `/projects/milestones`     | `getMilestones`   | `Milestone[]`                |
| POST   | `/projects`                | `createProject`   | `Project`                    |
| PATCH  | `/projects/:id`            | `updateProject`   | `Project`                    |
| DELETE | `/projects/:id`            | `deleteProject`   | `204 (no body)`              |
| POST   | `/projects/sprints`        | `createSprint`    | `Sprint`                     |
| PATCH  | `/projects/sprints/:id`    | `updateSprint`    | `Sprint`                     |
| DELETE | `/projects/sprints/:id`    | `deleteSprint`    | `204 (no body)`              |
| POST   | `/projects/tasks`          | `createTask`      | `Task`                       |
| PATCH  | `/projects/tasks/:id`      | `updateTask`      | `Task`                       |
| DELETE | `/projects/tasks/:id`      | `deleteTask`      | `204 (no body)`              |
| POST   | `/projects/milestones`     | `createMilestone` | `Milestone`                  |
| PATCH  | `/projects/milestones/:id` | `updateMilestone` | `Milestone`                  |
| DELETE | `/projects/milestones/:id` | `deleteMilestone` | `204 (no body)`              |

### infrastructure

| Method | Path                                           | Frontend function | Response               |
| ------ | ---------------------------------------------- | ----------------- | ---------------------- |
| GET    | `/infrastructure/nodes`                        | `getNodes`        | `InfraNode[]`          |
| GET    | `/infrastructure/nodes/:nodeId/metrics`        | `getNodeMetrics`  | `SystemMetric[]`       |
| GET    | `/infrastructure/nodes/:nodeId/metrics/latest` | `getLatestMetric` | `SystemMetric \| null` |
| GET    | `/infrastructure/git`                          | `getGitActivity`  | `GitActivity[]`        |
| POST   | `/infrastructure/nodes`                        | `createNode`      | `InfraNode`            |
| PATCH  | `/infrastructure/nodes/:id`                    | `updateNode`      | `InfraNode`            |
| DELETE | `/infrastructure/nodes/:id`                    | `deleteNode`      | `204 (no body)`        |

### health

| Method | Path                         | Frontend function       | Response               |
| ------ | ---------------------------- | ----------------------- | ---------------------- |
| GET    | `/health/training-plans`     | `getTrainingPlans`      | `TrainingPlan[]`       |
| GET    | `/health/training-plans/:id` | `getTrainingPlan`       | `TrainingPlan \| null` |
| GET    | `/health/workouts`           | `getWorkoutSessions`    | `WorkoutSession[]`     |
| GET    | `/health/metrics`            | `getHealthMetrics`      | `HealthMetric[]`       |
| GET    | `/health/metrics/latest`     | `getLatestHealthMetric` | `HealthMetric \| null` |
| POST   | `/health/training-plans`     | `createTrainingPlan`    | `TrainingPlan`         |
| PATCH  | `/health/training-plans/:id` | `updateTrainingPlan`    | `TrainingPlan`         |
| DELETE | `/health/training-plans/:id` | `deleteTrainingPlan`    | `204 (no body)`        |
| POST   | `/health/workouts`           | `createWorkoutSession`  | `WorkoutSession`       |
| PATCH  | `/health/workouts/:id`       | `updateWorkoutSession`  | `WorkoutSession`       |
| DELETE | `/health/workouts/:id`       | `deleteWorkoutSession`  | `204 (no body)`        |
| POST   | `/health/metrics`            | `createHealthMetric`    | `HealthMetric`         |
| PATCH  | `/health/metrics/:id`        | `updateHealthMetric`    | `HealthMetric`         |
| DELETE | `/health/metrics/:id`        | `deleteHealthMetric`    | `204 (no body)`        |

### finances

| Method | Path                              | Frontend function      | Response             |
| ------ | --------------------------------- | ---------------------- | -------------------- |
| GET    | `/finances/budget-categories`     | `getBudgetCategories`  | `BudgetCategory[]`   |
| GET    | `/finances/transactions`          | `getTransactions`      | `Transaction[]`      |
| GET    | `/finances/trades`                | `getTrades`            | `TradeEntry[]`       |
| GET    | `/finances/net-worth`             | `getNetWorthHistory`   | `NetWorthSnapshot[]` |
| GET    | `/finances/bills`                 | `getBills`             | `Bill[]`             |
| POST   | `/finances/transactions`          | `createTransaction`    | `Transaction`        |
| PATCH  | `/finances/transactions/:id`      | `updateTransaction`    | `Transaction`        |
| DELETE | `/finances/transactions/:id`      | `deleteTransaction`    | `204 (no body)`      |
| POST   | `/finances/budget-categories`     | `createBudgetCategory` | `BudgetCategory`     |
| PATCH  | `/finances/budget-categories/:id` | `updateBudgetCategory` | `BudgetCategory`     |
| DELETE | `/finances/budget-categories/:id` | `deleteBudgetCategory` | `204 (no body)`      |
| POST   | `/finances/bills`                 | `createBill`           | `Bill`               |
| PATCH  | `/finances/bills/:id`             | `updateBill`           | `Bill`               |
| DELETE | `/finances/bills/:id`             | `deleteBill`           | `204 (no body)`      |

### learning

| Method | Path                             | Frontend function    | Response                 |
| ------ | -------------------------------- | -------------------- | ------------------------ |
| GET    | `/learning/roadmaps`             | `getRoadmaps`        | `LearningRoadmap[]`      |
| GET    | `/learning/skills`               | `getSkills`          | `SkillNode[]`            |
| GET    | `/learning/sr-cards`             | `getDueCards`        | `SpacedRepetitionCard[]` |
| GET    | `/learning/sr-cards`             | `getAllCards`        | `SpacedRepetitionCard[]` |
| GET    | `/learning/reading`              | `getReadingList`     | `ReadingEntry[]`         |
| POST   | `/learning/roadmaps`             | `createRoadmap`      | `LearningRoadmap`        |
| PATCH  | `/learning/roadmaps/:id`         | `updateRoadmap`      | `LearningRoadmap`        |
| DELETE | `/learning/roadmaps/:id`         | `deleteRoadmap`      | `204 (no body)`          |
| POST   | `/learning/skills`               | `createSkill`        | `SkillNode`              |
| PATCH  | `/learning/skills/:id`           | `updateSkill`        | `SkillNode`              |
| DELETE | `/learning/skills/:id`           | `deleteSkill`        | `204 (no body)`          |
| POST   | `/learning/reading`              | `createReadingEntry` | `ReadingEntry`           |
| PATCH  | `/learning/reading/:id`          | `updateReadingEntry` | `ReadingEntry`           |
| DELETE | `/learning/reading/:id`          | `deleteReadingEntry` | `204 (no body)`          |
| POST   | `/learning/sr-cards/:id/reviews` | `reviewCard`         | `SpacedRepetitionCard`   |

### work

| Method | Path                       | Frontend function      | Response            |
| ------ | -------------------------- | ---------------------- | ------------------- |
| GET    | `/work/career-milestones`  | `getCareerMilestones`  | `CareerMilestone[]` |
| GET    | `/work/certifications`     | `getCertifications`    | `Certification[]`   |
| GET    | `/work/deadlines`          | `getDeadlines`         | `WorkDeadline[]`    |
| GET    | `/work/compliance`         | `getComplianceItems`   | `ComplianceItem[]`  |
| POST   | `/work/deadlines`          | `createDeadline`       | `WorkDeadline`      |
| PATCH  | `/work/deadlines/:id`      | `updateDeadline`       | `WorkDeadline`      |
| DELETE | `/work/deadlines/:id`      | `deleteDeadline`       | `204 (no body)`     |
| POST   | `/work/certifications`     | `createCertification`  | `Certification`     |
| PATCH  | `/work/certifications/:id` | `updateCertification`  | `Certification`     |
| DELETE | `/work/certifications/:id` | `deleteCertification`  | `204 (no body)`     |
| PATCH  | `/work/compliance/:id`     | `updateComplianceItem` | `ComplianceItem`    |

### social

| Method | Path                       | Frontend function    | Response           |
| ------ | -------------------------- | -------------------- | ------------------ |
| GET    | `/social/contacts`         | `getContacts`        | `Contact[]`        |
| GET    | `/social/contacts/:id`     | `getContact`         | `Contact \| null`  |
| GET    | `/social/networking-goals` | `getNetworkingGoals` | `NetworkingGoal[]` |
| GET    | `/social/follow-ups`       | `getFollowUps`       | `FollowUpPrompt[]` |
| POST   | `/social/contacts`         | `createContact`      | `Contact`          |
| PATCH  | `/social/contacts/:id`     | `updateContact`      | `Contact`          |
| DELETE | `/social/contacts/:id`     | `deleteContact`      | `204 (no body)`    |
| PATCH  | `/social/follow-ups/:id`   | `updateFollowUp`     | `FollowUpPrompt`   |

### appearance

| Method | Path                       | Frontend function     | Response            |
| ------ | -------------------------- | --------------------- | ------------------- |
| GET    | `/appearance/wardrobe`     | `getWardrobeItems`    | `WardrobeItem[]`    |
| GET    | `/appearance/outfits`      | `getOutfitLogs`       | `OutfitLog[]`       |
| GET    | `/appearance/grooming`     | `getGroomingRoutines` | `GroomingRoutine[]` |
| GET    | `/appearance/spend`        | `getAppearanceSpend`  | `AppearanceSpend[]` |
| POST   | `/appearance/wardrobe`     | `createWardrobeItem`  | `WardrobeItem`      |
| PATCH  | `/appearance/wardrobe/:id` | `updateWardrobeItem`  | `WardrobeItem`      |
| DELETE | `/appearance/wardrobe/:id` | `deleteWardrobeItem`  | `204 (no body)`     |
| POST   | `/appearance/outfits`      | `createOutfitLog`     | `OutfitLog`         |
| PATCH  | `/appearance/outfits/:id`  | `updateOutfitLog`     | `OutfitLog`         |
| DELETE | `/appearance/outfits/:id`  | `deleteOutfitLog`     | `204 (no body)`     |

### logistics

| Method | Path                                                 | Frontend function      | Response              |
| ------ | ---------------------------------------------------- | ---------------------- | --------------------- |
| GET    | `/logistics/trips`                                   | `getTrips`             | `Trip[]`              |
| GET    | `/logistics/checklists`                              | `getChecklists`        | `ChecklistTemplate[]` |
| GET    | `/logistics/documents`                               | `getDocuments`         | `DocumentRecord[]`    |
| GET    | `/logistics/events`                                  | `getLogisticsEvents`   | `LogisticsEvent[]`    |
| POST   | `/logistics/trips`                                   | `createTrip`           | `Trip`                |
| PATCH  | `/logistics/trips/:id`                               | `updateTrip`           | `Trip`                |
| DELETE | `/logistics/trips/:id`                               | `deleteTrip`           | `204 (no body)`       |
| POST   | `/logistics/documents`                               | `createDocument`       | `DocumentRecord`      |
| PATCH  | `/logistics/documents/:id`                           | `updateDocument`       | `DocumentRecord`      |
| DELETE | `/logistics/documents/:id`                           | `deleteDocument`       | `204 (no body)`       |
| POST   | `/logistics/events`                                  | `createLogisticsEvent` | `LogisticsEvent`      |
| PATCH  | `/logistics/events/:id`                              | `updateLogisticsEvent` | `LogisticsEvent`      |
| DELETE | `/logistics/events/:id`                              | `deleteLogisticsEvent` | `204 (no body)`       |
| PATCH  | `/logistics/checklists/:checklist_id/items/:item_id` | `updateChecklistItem`  | `ChecklistItem`       |
| POST   | `/logistics/checklists/:id/reset`                    | `resetChecklist`       | `ChecklistTemplate`   |

### intelligence

| Method | Path                               | Frontend function     | Response             |
| ------ | ---------------------------------- | --------------------- | -------------------- |
| GET    | `/intelligence/sleep-vs-commits`   | `getSleepVsCommits`   | `CorrelationPoint[]` |
| GET    | `/intelligence/budget-vs-velocity` | `getBudgetVsVelocity` | `CorrelationPoint[]` |
| GET    | `/intelligence/hrv-vs-rpe`         | `getHrvVsRpe`         | `CorrelationPoint[]` |
| GET    | `/intelligence/net-worth`          | `getNetWorthTrend`    | `CorrelationPoint[]` |
| GET    | `/intelligence/sleep-trend`        | `getSleepTrend`       | `(number \| null)[]` |
| GET    | `/intelligence/commits-trend`      | `getCommitsTrend`     | `(number \| null)[]` |

### notifications

| Method | Path                      | Frontend function                            | Response         |
| ------ | ------------------------- | -------------------------------------------- | ---------------- |
| GET    | `/notifications`          | `getNotifications`                           | `Notification[]` |
| PATCH  | `/notifications/:id`      | `markNotificationRead / dismissNotification` | `Notification`   |
| POST   | `/notifications/read-all` | `markAllRead`                                | `204 (no body)`  |

### triggers

| Method | Path                  | Frontend function        | Response            |
| ------ | --------------------- | ------------------------ | ------------------- |
| GET    | `/triggers/rules`     | `getTriggerRules`        | `TriggerRule[]`     |
| POST   | `/triggers/rules`     | `createTriggerRule`      | `TriggerRule`       |
| PATCH  | `/triggers/rules/:id` | `updateTriggerRule`      | `TriggerRule`       |
| DELETE | `/triggers/rules/:id` | `deleteTriggerRule`      | `204 (no body)`     |
| GET    | `/triggers/log`       | `getTriggerLog`          | `TriggerLogEntry[]` |
| PATCH  | `/triggers/log/:id`   | `resolveTriggerLogEntry` | `TriggerLogEntry`   |

## Read filters

| Function                   | Query parameters                         |
| -------------------------- | ---------------------------------------- |
| getProjects                | page, per_page                           |
| getSprints / getMilestones | project_id                               |
| getTasks                   | sprint_id, project_id, status            |
| getNodeMetrics             | hours (default 24)                       |
| getWorkoutSessions         | days (default 14)                        |
| getHealthMetrics           | days (default 30)                        |
| getNetWorthHistory         | months (default 12)                      |
| getSkills                  | roadmap_id                               |
| getDueCards                | due=true                                 |
| getFollowUps               | completed (optional; false is preserved) |
| getOutfitLogs              | limit (default 20)                       |

All functions accept a final optional ApiRequestOptions argument, including
signal, timeoutMs, headers and extra query parameters. The first implementation
returns all matching rows for unpaginated collections; add pagination to both
sides together when needed. Intelligence series return their own dated points;
the sleep/commit sparklines return arrays of numbers or null, ordered oldest first.

## Backend implementation order

1. Agree this contract, authentication, and CORS in the backend repository.
2. Implement projects and its subresources, then the nine domain read groups.
3. Implement write operations already used by screen buttons.
4. Implement notification aggregation and trigger rules/logs.
5. Implement intelligence aggregation; do not seed fabricated user records.
6. Run end-to-end tests against that server. Frontend tests currently stub transport only.

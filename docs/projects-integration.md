# Projects frontend integration

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

No backend contract was changed. Existing helpers preserve paginated projects,
array subcollections, snake_case, POST 201, PATCH 200, and DELETE 204.
The Projects tab provides project editing; the Board, Sprints, and Milestones
tabs expose their corresponding edit/delete controls. The toolbar creates all
four resources. A project is required before creating its dependents.

Forms whitelist writable fields; IDs, audit timestamps, and sprint velocity never
enter mutation payloads. PATCH includes only fields changed since the form opened.
Blank nullable inputs deliberately send null; unchanged nullable fields remain
omitted. Task sprint options are filtered by project. Changing the task project
clears the selected sprint. 409 conflicts explain that dependents must be moved
or removed explicitly; the frontend never cascades deletes. Failed/uncertain
writes do not fabricate success or automatically retry.

Project/sprint boundaries and milestone due dates are `YYYY-MM-DD` calendar dates,
parsed as local calendar components for display. A milestone is overdue only
after its due day. Completion timestamps use `toISOString()` when marking complete;
existing timestamps remain untouched unless completion is toggled, and reopening
sends null. Audit timestamps and velocity remain server-owned.

The previous summary selected only the first active sprint. It now explicitly
shows **Active Sprint Points**, summed across all active sprints. Sprint velocity
continues to use the backend value, not a client-written calculation.

All Projects tabs now consume the shared `['projects', 'data']` query, loading
all four collections and following project pagination. Successful writes invalidate
Projects, Dashboard, and Intelligence queries. This refreshes summary, Kanban,
sprint progress/velocity, milestones, and Gantt; inactive tabs see the new snapshot
on opening. Gantt no longer uses a separate effect-based fetch. Projects without
an end date show a start-only marker rather than an invented 30-day duration.
Long timeline ranges use bounded tick density. Legitimate empty states stay empty.

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
- Check keyboard navigation, dialog focus return, narrow screens, and error states.

Backend code/databases, migrations, deployment, and live data population remain
outside this frontend task. Non-Projects modules may still show unavailable-route
errors. These browser checks are a handoff checklist, not claims of live testing.

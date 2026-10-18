import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Flag,
  Layers3,
  Play,
  RefreshCw,
  Route,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import SessionControls, {
  type FocusNoteDraft,
} from "./FocusSessionControls.tsx";
import LoadError from "@/components/LoadError.tsx";
import type { Project, Sprint, Task } from "@/lib/api/types.ts";
import type { FocusSession, ProjectFocus } from "@/lib/api/project-focus.ts";
import { ApiError } from "@/lib/api/errors.ts";
import { formatCalendarDate } from "@/lib/calendar-date.ts";
import {
  focusError,
  refreshFocus,
  uncertainFocusOutcome,
  useFocusData,
} from "../focus-data.ts";
import { useFocusAction, type FocusIntent } from "../focus-actions.ts";
import { FocusRepositories, FocusTaskDetails } from "./FocusTaskDetails.tsx";
import VerifyTaskDialog from "./VerifyTaskDialog.tsx";

const eligible = (task: Task) =>
  ["backlog", "todo", "in_progress"].includes(task.status);

function FocusContextSidebar({
  project,
  task,
  tasks,
  sprints,
  focus,
  session,
}: {
  project: Project;
  task?: Task;
  tasks: Task[];
  sprints: Sprint[];
  focus: ProjectFocus;
  session?: FocusSession;
}) {
  const sprint = task?.sprint_id
    ? sprints.find((candidate) => candidate.id === task.sprint_id)
    : undefined;
  const completed = tasks.filter(
    (candidate) => candidate.status === "done",
  ).length;
  const completion = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : null;
  const nextMilestone = [...focus.milestones]
    .filter((milestone) => milestone.completed_at === null)
    .sort((left, right) => left.due_date.localeCompare(right.due_date))[0];
  const alternatives = focus.alternative_tasks
    .filter((candidate) => candidate.id !== task?.id)
    .slice(0, 3);

  return (
    <aside
      aria-label="Focus context"
      className="lg:sticky lg:top-5 lg:self-start"
    >
      <details open className="group/context">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl border border-border/70 bg-card/65 px-4 text-sm font-semibold marker:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden">
          Project context
          <span
            aria-hidden="true"
            className="text-primary transition-transform group-open/context:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="mt-3 space-y-3 lg:mt-0">
          {(sprint || nextMilestone || completion !== null) && (
            <section className="space-y-4 rounded-2xl border border-border/70 bg-surface/75 p-4 sm:p-5">
              <div>
                <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
                  Project signal
                </p>
                <h3 className="mt-1 font-mono font-semibold">
                  Execution context
                </h3>
              </div>

              {sprint && (
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Layers3 className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Current Sprint
                    </p>
                    <p className="truncate text-sm font-semibold">
                      {sprint.name}
                    </p>
                    {sprint.goal && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {sprint.goal}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {nextMilestone && (
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning">
                    <Flag className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Next Project Milestone
                    </p>
                    <p className="break-words text-sm font-semibold">
                      {nextMilestone.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Due {formatCalendarDate(nextMilestone.due_date)}
                    </p>
                  </div>
                </div>
              )}

              {completion !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Tasks completed
                    </span>
                    <span className="font-mono font-semibold">
                      {completed} / {tasks.length}
                    </span>
                  </div>
                  <Progress
                    aria-label={`Tasks completed: ${completed} of ${tasks.length}`}
                    value={completion}
                  />
                </div>
              )}
            </section>
          )}

          {(session?.resume_note || alternatives.length > 0) && (
            <section className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
              {session?.resume_note && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Route className="size-4 text-info" aria-hidden="true" />
                    Saved execution context
                  </h3>
                  <p className="mt-2 line-clamp-5 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                    {session.resume_note}
                  </p>
                </div>
              )}
              {alternatives.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Related next work</h3>
                  <ul className="space-y-1">
                    {alternatives.map((alternative) => (
                      <li key={alternative.id}>
                        <Link
                          className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          to={`/projects/${encodeURIComponent(project.id)}/now?${new URLSearchParams({ task: alternative.id })}`}
                        >
                          <span className="truncate">{alternative.title}</span>
                          <ArrowRight
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
            <FocusRepositories projectId={project.id} compact />
          </section>
        </div>
      </details>
    </aside>
  );
}

export default function FocusNow({
  project,
  sprints,
}: {
  project: Project;
  sprints: Sprint[];
}) {
  const queries = useFocusData(project.id);
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const picker = useRef<HTMLSelectElement>(null);
  const mutation = useFocusAction();
  const inFlight = useRef(false);
  const [recovery, setRecovery] = useState<FocusIntent | null>(null);
  const [focusDraft, setFocusDraft] = useState<FocusNoteDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [finishedTask, setFinishedTask] = useState<Task | null>(null);
  const [verify, setVerify] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<{
    id: string;
    sessionId?: string;
  } | null>(null);
  const noteDirty = Boolean(
    focusDraft && focusDraft.value !== focusDraft.baseNote,
  );

  const run = async (intent: FocusIntent, replay = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailure(null);
    setNotice(null);
    try {
      const result = await mutation.mutateAsync({ intent, replay });
      if (result.project_id !== project.id)
        throw new ApiError(
          "Unexpected Project in Focus response.",
          "invalid_response",
        );
      const submittedNote =
        intent.action === "pause" || intent.action === "switch"
          ? intent.noteUpdate
          : undefined;
      if (submittedNote) {
        setFocusDraft((previous) =>
          previous?.sessionId === submittedNote.sessionId &&
          previous.expectedUpdatedAt === submittedNote.expectedUpdatedAt &&
          previous.value === (submittedNote.note ?? "")
            ? null
            : previous,
        );
      }
      if (result.status !== "paused" && params.get("session") === result.id) {
        const next = new URLSearchParams(params);
        next.delete("session");
        setParams(next, { replace: true });
      }
      setRecovery(null);
      if (intent.action === "finish") {
        const task = queries.tasks.data?.find(
          (item) =>
            item.id === result.task_id && item.project_id === project.id,
        );
        setFinishedTask(task ?? null);
        setVerify(Boolean(intent.verify && task));
        setNotice(
          "Session finished. Task status has not been changed by this action.",
        );
      } else if (intent.action === "pause") {
        setNotice(
          intent.noteUpdate
            ? result.resume_note === intent.noteUpdate.note
              ? "Session paused. Resume note update confirmed by the server."
              : "Session is paused, but the server returned a different note. Refresh and review the session before continuing."
            : "Session paused. The existing resume note was preserved.",
        );
      } else {
        setNotice(`Server confirms the session is ${result.status}.`);
      }
    } catch (error) {
      const lifecycleConflict =
        (intent.action === "switch" || intent.action === "pause") &&
        ((error instanceof ApiError && error.status === 409) ||
          (error instanceof Error &&
            /(?:active|focus) session changed|session is no longer active/i.test(
              error.message,
            )));
      const conflictingNoteUpdate =
        intent.action === "switch" || intent.action === "pause"
          ? intent.noteUpdate
          : undefined;
      if (lifecycleConflict && conflictingNoteUpdate) {
        setFocusDraft((previous) =>
          previous?.sessionId === conflictingNoteUpdate.sessionId
            ? { ...previous, conflicted: true }
            : previous,
        );
      }
      if (lifecycleConflict && intent.action === "switch") {
        setFailure(
          "The active session or its note changed in another tab. Review the current Focus state before switching.",
        );
      } else setFailure(focusError(error));
      setRecovery(replay || uncertainFocusOutcome(error) ? intent : null);
    } finally {
      inFlight.current = false;
    }
  };

  const error =
    queries.project.error ?? queries.current.error ?? queries.tasks.error;
  const loading =
    queries.project.isPending ||
    queries.current.isPending ||
    queries.tasks.isPending;
  const refreshing =
    queries.project.isFetching ||
    queries.current.isFetching ||
    queries.tasks.isFetching;
  const focus = queries.project.data;
  const tasks = (queries.tasks.data ?? []).filter(
    (task) => task.project_id === project.id,
  );
  const taskId = params.get("task");
  const explicitTask = tasks.find((task) => task.id === taskId);
  const active = focus?.active_session;
  const elsewhere = focus?.active_session_elsewhere;
  const paused =
    focus?.paused_sessions.find(
      (item) =>
        item.task.id === taskId &&
        (!params.has("session") || item.session.id === params.get("session")),
    ) ?? (taskId === null ? focus?.paused_sessions[0] : undefined);
  const session = active?.session ?? paused?.session;
  const displayedId =
    active?.task.id ??
    (taskId !== null
      ? taskId
      : (paused?.task.id ?? focus?.recommended_task?.id));
  const task = tasks.find((item) => item.id === displayedId);
  const consistent =
    (queries.current.data?.id ?? null) ===
    (active?.session.id ?? elsewhere?.session.id ?? null);
  const staleSessionSelection = params.has("session") && !active && !paused;
  const blocked =
    mutation.isPending ||
    refreshing ||
    Boolean(error) ||
    Boolean(recovery) ||
    staleSessionSelection ||
    !consistent;
  const invalidSelection = taskId !== null && !explicitTask;
  const applyChoose = (id: string, sessionId?: string) => {
    const next = new URLSearchParams(params);
    next.delete("session");
    if (sessionId) next.set("session", sessionId);
    if (id) next.set("task", id);
    else next.delete("task");
    setParams(next);
  };
  const choose = (id: string, sessionId?: string) => {
    if (noteDirty && sessionId !== focusDraft?.sessionId) {
      setPendingChoice({ id, sessionId });
      return;
    }
    applyChoose(id, sessionId);
  };
  const focusState = finishedTask
    ? "finished"
    : elsewhere
      ? "elsewhere"
      : active
        ? "active"
        : paused
          ? "paused"
          : task
            ? taskId === null
              ? "recommended"
              : "selected"
            : "empty";

  return (
    <section
      aria-labelledby="now-heading"
      data-workspace-area="now"
      data-focus-state={error ? "error" : loading ? "loading" : focusState}
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-primary uppercase">
            Execution cockpit
          </p>
          <h2
            id="now-heading"
            className="mt-1 font-mono text-xl font-bold tracking-tight sm:text-2xl"
          >
            NOW
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Keep one authoritative FocusSession, preserve its context and move
            the current Task forward deliberately.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="self-start sm:self-auto"
          disabled={mutation.isPending || refreshing}
          onClick={() => void refreshFocus(client)}
        >
          <RefreshCw
            className={refreshing ? "animate-spin" : undefined}
            aria-hidden="true"
          />
          Refresh Focus
        </Button>
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-success/25 bg-success/5 p-3 text-sm"
        >
          {notice}
        </p>
      )}
      {failure && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm"
        >
          {failure}
        </p>
      )}
      {recovery && (
        <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
            Confirmation required
          </p>
          <p>
            The original operation is unresolved. Retry uses the same session or
            idempotency key; no operation is queued offline. A missing current
            session alone does not prove it finished.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending || refreshing || Boolean(error)}
            onClick={() => void run(recovery, true)}
          >
            Retry same operation
          </Button>
        </div>
      )}
      {error && (
        <LoadError
          error={error}
          title="Focus data unavailable"
          onRetry={() => void refreshFocus(client)}
        />
      )}
      {loading || !focus ? (
        !error && (
          <div
            role="status"
            className="grid min-h-80 place-items-center rounded-2xl border border-border/70 bg-surface/60 p-8 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-3">
              <CircleDot className="size-4 animate-pulse text-primary" />
              Loading Focus context…
            </span>
          </div>
        )
      ) : (
        <div
          data-layout="focus-cockpit"
          className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)] lg:items-start"
        >
          <div className="min-w-0 space-y-4">
            {!consistent && (
              <p
                role="alert"
                className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm"
              >
                Focus state changed while loading. Refresh Focus before acting.
              </p>
            )}

            {finishedTask && (
              <section
                aria-label="Finished session follow-up"
                className="relative overflow-hidden rounded-2xl border border-success/30 bg-success/5 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-success">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      FocusSession finished
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Session finish confirmed for {finishedTask.title}. Task
                      completion is a separate manual acknowledgement.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => setVerify(true)}
                  >
                    Verify Task completion
                  </Button>
                </div>
              </section>
            )}

            {invalidSelection && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm"
              >
                Selected task unavailable. It may have been deleted or may
                belong to another Project. Choose a task from this Project.
              </p>
            )}
            {staleSessionSelection && (
              <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
                <p role="alert">
                  The selected paused session is no longer available. Its
                  absence does not confirm it finished.
                </p>
                <Button
                  variant="outline"
                  disabled={mutation.isPending || Boolean(recovery)}
                  onClick={() => choose(taskId ?? "")}
                >
                  Clear stale session selection
                </Button>
              </div>
            )}

            {elsewhere && (
              <section className="relative overflow-hidden rounded-2xl border border-warning/35 bg-warning/5 p-5 sm:p-6">
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1 bg-warning"
                />
                <Badge variant="warning">Focus active elsewhere</Badge>
                <h3 className="mt-4 font-mono text-xl font-bold">
                  Another Project has active work
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {elsewhere.task.title} — {elsewhere.project.name}. No session
                  here will start automatically.
                </p>
                <Button asChild className="mt-5">
                  <Link
                    to={`/projects/${encodeURIComponent(elsewhere.project.id)}/now?${new URLSearchParams({ task: elsewhere.task.id })}`}
                  >
                    Go to active Project: {elsewhere.project.name}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </section>
            )}

            {active && explicitTask && explicitTask.id !== active.task.id && (
              <p className="rounded-xl border border-info/20 bg-info/5 p-3 text-sm text-muted-foreground">
                Your URL selects {explicitTask.title}. The active session still
                belongs to {active.task.title}; use Switch Task to change
                execution.
              </p>
            )}
            {session && !task && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm"
              >
                The session&apos;s Task is unavailable. Refresh Focus before
                continuing.
              </p>
            )}

            {task && (active || !invalidSelection) && (
              <article
                className={`relative min-w-0 overflow-hidden rounded-2xl border p-4 shadow-[0_26px_80px_-55px_color-mix(in_srgb,var(--primary)_75%,transparent)] sm:p-6 ${session?.status === "active" ? "border-primary/35 bg-surface/95" : session?.status === "paused" ? "border-warning/30 bg-surface/90" : "border-border/70 bg-surface/90"}`}
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-px ${session?.status === "paused" ? "bg-gradient-to-r from-transparent via-warning/80 to-transparent" : "bg-gradient-to-r from-transparent via-primary/80 to-transparent"}`}
                />
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
                    {session?.status === "active" ? (
                      <CircleDot
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                    ) : session?.status === "paused" ? (
                      <CalendarClock
                        className="size-4 text-warning"
                        aria-hidden="true"
                      />
                    ) : (
                      <Sparkles
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                    )}
                    {session
                      ? `${session.status} Focus session`
                      : taskId !== null
                        ? "Selected task"
                        : "Recommended task"}
                  </p>
                  {!session && taskId === null && (
                    <Badge variant="default">Backend recommendation</Badge>
                  )}
                </div>
                {!session && taskId === null && focus.recommendation_reason && (
                  <div className="mb-5 rounded-xl border border-primary/20 bg-primary/[0.045] p-3 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      Why this Task
                    </p>
                    <p className="mt-1">{focus.recommendation_reason}</p>
                  </div>
                )}
                <FocusTaskDetails
                  task={task}
                  project={project}
                  sprints={sprints}
                />
                {session ? (
                  <SessionControls
                    key={session.id}
                    session={session}
                    task={task}
                    tasks={tasks.filter(
                      (item) =>
                        eligible(item) &&
                        item.id !== task.id &&
                        !focus.paused_sessions.some(
                          (paused) => paused.task.id === item.id,
                        ),
                    )}
                    preferredTaskId={explicitTask?.id}
                    draft={focusDraft}
                    setDraft={setFocusDraft}
                    disabled={blocked || Boolean(elsewhere)}
                    onAction={(intent) => void run(intent)}
                    onChoose={() => picker.current?.focus()}
                  />
                ) : (
                  <section
                    aria-label="Task execution actions"
                    className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-5 sm:flex-row sm:flex-wrap"
                  >
                    {!elsewhere && eligible(task) && (
                      <Button
                        size="lg"
                        className="w-full sm:w-auto"
                        disabled={blocked}
                        onClick={() =>
                          void run({
                            action: "start",
                            taskId: task.id,
                            key: crypto.randomUUID(),
                            expectedActiveId: null,
                          })
                        }
                      >
                        <Play aria-hidden="true" />
                        Start Task
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => picker.current?.focus()}
                    >
                      Choose Another
                    </Button>
                    <Button asChild variant="ghost">
                      <Link
                        to={`/projects/${encodeURIComponent(project.id)}/explore?${new URLSearchParams({ view: "board", task: task.id })}`}
                      >
                        View Details
                      </Link>
                    </Button>
                    {!eligible(task) && (
                      <p className="w-full pt-2 text-sm text-muted-foreground">
                        Tasks in review or done cannot start a FocusSession.
                        Manage their status in EXPLORE.
                      </p>
                    )}
                  </section>
                )}
              </article>
            )}

            {!task &&
              !invalidSelection &&
              focus.recommended_task &&
              !session &&
              !elsewhere && (
                <p
                  role="alert"
                  className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm"
                >
                  The recommended Task is unavailable in the current Task data.
                  Refresh Focus before continuing.
                </p>
              )}
            {!task &&
              !invalidSelection &&
              !focus.recommended_task &&
              !session &&
              !elsewhere && (
                <section className="rounded-2xl border border-dashed border-border bg-surface/55 p-6 text-center sm:p-10">
                  <CheckCircle2
                    className="mx-auto size-8 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-mono text-lg font-semibold">
                    No immediate Focus recommendation
                  </h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    {focus.empty_state === "empty_project"
                      ? "No tasks yet. Create a task in EXPLORE to get started."
                      : tasks.length > 0 &&
                          tasks.every((item) => item.status === "done")
                        ? "All Tasks are done. There is no next recommendation."
                        : tasks.length > 0 &&
                            tasks.every((item) => item.status === "review")
                          ? "All Tasks are awaiting review. Review them in EXPLORE; no Task is eligible to start."
                          : "No eligible Task recommendation. Choose existing work or review Tasks in EXPLORE."}
                  </p>
                  <Button asChild variant="outline" className="mt-5">
                    <Link
                      to={`/projects/${encodeURIComponent(project.id)}/explore?view=board`}
                    >
                      Open Project Board
                    </Link>
                  </Button>
                </section>
              )}

            <section className="rounded-xl border border-border/65 bg-card/55 p-3">
              <label className="block space-y-2 text-sm">
                <span className="font-semibold">Selected task</span>
                <select
                  ref={picker}
                  className="min-h-11 w-full min-w-0 rounded-lg border bg-background p-2"
                  value={explicitTask?.id ?? ""}
                  disabled={mutation.isPending || Boolean(recovery)}
                  onChange={(event) => choose(event.target.value)}
                >
                  <option value="">Use current work or recommendation</option>
                  {tasks.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {focus.paused_sessions.length > 0 && (
              <section
                aria-label="Paused work"
                className="space-y-3 rounded-2xl border border-border/70 bg-card/55 p-4"
              >
                <div>
                  <h3 className="font-semibold">Paused work</h3>
                  <p className="text-xs text-muted-foreground">
                    Return to server-saved stopping context.
                  </p>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {focus.paused_sessions.map((item) => (
                    <li key={item.session.id}>
                      <button
                        aria-label={item.task.title}
                        className="min-h-12 w-full rounded-xl border border-border/70 bg-canvas/30 p-3 text-left transition-colors hover:border-warning/35 hover:bg-warning/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => choose(item.task.id, item.session.id)}
                      >
                        <span className="block text-sm font-semibold">
                          {item.task.title}
                        </span>
                        <span className="mt-1 block line-clamp-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                          {item.session.resume_note || "No resume note saved."}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <FocusContextSidebar
            project={project}
            task={task}
            tasks={tasks}
            sprints={sprints}
            focus={focus}
            session={session}
          />
        </div>
      )}
      {verify && finishedTask && (
        <VerifyTaskDialog
          task={finishedTask}
          onClose={() => setVerify(false)}
          onCompleted={(message) => {
            setVerify(false);
            setFinishedTask(null);
            setNotice(message);
            choose("");
          }}
        />
      )}
      <Dialog
        open={pendingChoice !== null}
        onOpenChange={(open) => {
          if (!open) setPendingChoice(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Focus note</DialogTitle>
            <DialogDescription>
              This Task selection would leave the current Focus note draft
              behind. Stay and continue editing, or discard the draft before
              choosing another Task.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingChoice(null)}>
              Stay and continue editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const choice = pendingChoice;
                setPendingChoice(null);
                setFocusDraft(null);
                if (choice) applyChoose(choice.id, choice.sessionId);
              }}
            >
              Discard changes and choose
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

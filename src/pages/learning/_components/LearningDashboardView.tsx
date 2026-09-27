import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock3, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import { formatInstant } from "@/lib/time-zone.ts";
import type {
  LearningDashboard,
  LearningGoal,
  Project,
} from "@/lib/api/types.ts";
import { StudySessionControls } from "./LearningPlanControls.tsx";
import { sessionTypeLabel, sortBottlenecks } from "../learning-plan.ts";

function calendarLabel(value: string | null): string {
  if (!value) return "Not scheduled";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "Invalid date";
}

export default function LearningDashboardView({
  dashboard,
  goals,
  projects,
}: {
  dashboard: LearningDashboard;
  goals: readonly LearningGoal[];
  projects: readonly Project[];
}) {
  const timeZone = useTimeZone();
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const planned = dashboard.minutes_planned ?? 0;
  const completed = dashboard.minutes_completed ?? 0;
  const completion =
    planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : null;
  const openBottlenecks = sortBottlenecks(dashboard.open_bottlenecks ?? []);
  const todaySessions = dashboard.today_sessions ?? [];
  const activeGoals = dashboard.active_goals ?? [];
  const futureGoals = goals.filter((goal) => goal.status === "planned");

  return (
    <div className="space-y-6">
      <section aria-labelledby="today-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              {formatInstant(new Date(), timeZone, { weekday: "long" })}
            </p>
            <h2 id="today-heading" className="text-xl font-semibold">
              Today
            </h2>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            {todaySessions.reduce(
              (sum, session) => sum + session.planned_minutes,
              0,
            )}{" "}
            planned minutes
          </p>
        </div>

        {todaySessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No study sessions are planned for today.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {todaySessions.map((session) => {
              const goal = goalById.get(session.learning_goal_id);
              return (
                <Card
                  key={session.id}
                  className={
                    session.completed ? "opacity-70" : "border-primary/40"
                  }
                >
                  <CardContent className="space-y-4 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {goal?.title ?? "Deleted or unavailable goal"}
                        </p>
                        <p className="mt-1 text-lg capitalize">
                          {sessionTypeLabel(session.session_type)}
                        </p>
                      </div>
                      <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                        {session.completed
                          ? "Completed"
                          : `${session.planned_minutes} min`}
                      </span>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Current focus
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {session.topic}
                      </p>
                    </div>
                    {!session.completed && (
                      <StudySessionControls
                        goals={goals}
                        projects={projects}
                        session={session}
                        completeMode
                        label="Complete / log session"
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="tracks-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tracks-heading" className="text-lg font-semibold">
            Active learning tracks
          </h2>
          <span className="text-xs text-muted-foreground">
            {activeGoals.length} active
          </span>
        </div>
        {activeGoals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No active learning goals yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeGoals.map((goal) => {
              const goalSessions = dashboard.week_sessions.filter(
                (session) => session.learning_goal_id === goal.id,
              );
              const weeklyMinutes = goalSessions
                .filter((session) => session.completed)
                .reduce((sum, session) => sum + session.actual_minutes, 0);
              const latestScore = dashboard.assessment_score_history
                .filter((point) => point.learning_goal_id === goal.id)
                .at(-1)?.score_percent;
              const topBottleneck = openBottlenecks.find(
                (item) => item.learning_goal_id === goal.id,
              );
              return (
                <Card key={goal.id} className="gap-4 py-5">
                  <CardHeader className="px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          {goal.title}
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {goal.provider} · {goal.type}
                        </p>
                      </div>
                      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-400">
                        Active
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 px-5 text-sm">
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Target
                        </dt>
                        <dd>{calendarLabel(goal.target_date)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          This week
                        </dt>
                        <dd>
                          {weeklyMinutes} min · {goalSessions.length} sessions
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Latest score
                        </dt>
                        <dd>
                          {latestScore == null ? "No score" : `${latestScore}%`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Exam readiness
                        </dt>
                        <dd>Not calculated</dd>
                      </div>
                    </dl>
                    <div className="rounded-md border border-border/70 p-2.5">
                      <p className="text-xs text-muted-foreground">
                        Top bottleneck
                      </p>
                      <p className="mt-0.5 font-medium">
                        {topBottleneck?.topic ?? "No open bottleneck"}
                      </p>
                    </div>
                    <Link
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      to={`/learning/goals/${encodeURIComponent(goal.id)}`}
                    >
                      Open learning goal <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" /> What should I study?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            {dashboard.next_focus && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs uppercase tracking-wide text-primary">
                  Next focus
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {dashboard.next_focus.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dashboard.next_focus.detail}
                </p>
              </div>
            )}
            {openBottlenecks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No unresolved bottlenecks. Use the next planned session or
                milestone.
              </p>
            ) : (
              openBottlenecks.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{item.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {goalById.get(item.learning_goal_id)?.title ??
                        "Unavailable goal"}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold uppercase text-primary">
                    {item.priority}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" /> Weekly execution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-mono font-bold">
                  {completed} / {planned}
                </p>
                <p className="text-xs text-muted-foreground">
                  actual vs planned minutes
                </p>
              </div>
              <span className="text-sm font-medium">
                {completion == null ? "No plan" : `${completion}%`}
              </span>
            </div>
            <Progress value={completion ?? 0} />
            <p className="text-xs text-muted-foreground">
              No completion percentage is inferred when no minutes are planned.
            </p>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="future-heading" className="space-y-3">
        <h2
          id="future-heading"
          className="text-sm font-semibold text-muted-foreground"
        >
          Future goals
        </h2>
        {futureGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No planned goals.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {futureGoals.map((goal) => (
              <Link
                key={goal.id}
                to={`/learning/goals/${encodeURIComponent(goal.id)}`}
                className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="font-medium text-foreground">
                  {goal.title}
                </span>{" "}
                · {calendarLabel(goal.target_date)}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

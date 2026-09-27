import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  ExternalLink,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LoadError from "@/components/LoadError.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  getAssessmentAttempts,
  getLearningGoalProgress,
  getLearningGoals,
} from "@/lib/api/learning.ts";
import { useProjectsData } from "@/pages/projects/projects-data.ts";
import { learningQueryKeys } from "./learning-query-keys.ts";
import { sessionTypeLabel } from "./learning-plan.ts";
import {
  LearningGoalControls,
  MilestoneControls,
  StudySessionControls,
} from "./_components/LearningPlanControls.tsx";
import BottleneckView from "./_components/BottleneckView.tsx";

function calendarLabel(value: string | null): string {
  if (!value) return "Not scheduled";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(date)
    : "Invalid date";
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="font-mono text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LearningGoalPage() {
  const { goalId = "" } = useParams();
  const progress = useQuery({
    queryKey: learningQueryKeys.goalProgress(goalId),
    queryFn: ({ signal }) => getLearningGoalProgress(goalId, { signal }),
    enabled: Boolean(goalId),
  });
  const goals = useQuery({
    queryKey: learningQueryKeys.goals,
    queryFn: ({ signal }) => getLearningGoals({ signal }),
  });
  const assessments = useQuery({
    queryKey: [...learningQueryKeys.assessments, goalId],
    queryFn: ({ signal }) => getAssessmentAttempts(goalId, { signal }),
    enabled: Boolean(goalId),
  });
  const projects = useProjectsData();
  const error =
    progress.error ?? goals.error ?? assessments.error ?? projects.error;
  const loading =
    progress.isPending ||
    goals.isPending ||
    assessments.isPending ||
    projects.isPending;
  const retry = async () => {
    await Promise.all([
      progress.refetch(),
      goals.refetch(),
      assessments.refetch(),
      projects.refetch(),
    ]);
  };

  if (!goalId) {
    return (
      <div className="p-6">
        <LoadError
          error={new Error("A learning goal ID is required.")}
          onRetry={() => undefined}
        />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <LoadError error={error} onRetry={() => void retry()} />
      </div>
    );
  }
  if (
    loading ||
    !progress.data ||
    !goals.data ||
    !assessments.data ||
    !projects.data
  ) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const data = progress.data;
  const goal = data.goal;
  const projectById = new Map(
    projects.data.projects.map((project) => [project.id, project]),
  );
  const scoreData = [...data.assessment_score_history]
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
    .map((attempt) => ({
      timestamp: attempt.date,
      label: calendarLabel(attempt.date),
      score: attempt.score_percent,
    }));
  const latestScore = scoreData.at(-1)?.score;
  const milestoneCompletion =
    data.milestones_total > 0
      ? Math.round((data.milestones_completed / data.milestones_total) * 100)
      : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <Link
          to="/learning"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Learning
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {goal.title}
              </h1>
              <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                {goal.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {goal.provider} · {goal.type}
              {goal.phase ? ` · ${goal.phase}` : ""}
            </p>
            {goal.description && (
              <p className="mt-2 max-w-3xl text-sm">{goal.description}</p>
            )}
          </div>
          <LearningGoalControls goal={goal} projects={projects.data.projects} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Target date"
          value={calendarLabel(goal.target_date)}
          icon={CalendarDays}
        />
        <Stat
          label="Exam date"
          value={calendarLabel(goal.exam_date)}
          icon={Target}
        />
        <Stat
          label="Total study time"
          value={`${data.total_study_minutes} min`}
          icon={Clock3}
        />
        <Stat
          label="This week"
          value={`${data.weekly_study_minutes} min`}
          icon={TrendingUp}
        />
      </div>

      <Card className="border-primary/40 bg-primary/5 py-5">
        <CardContent className="px-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Next focus
          </p>
          <p className="mt-2 text-lg font-semibold">
            {data.next_focus?.title ?? "No next focus is available yet."}
          </p>
          {data.next_focus && (
            <div className="mt-1 text-xs text-muted-foreground">
              <p className="capitalize">
                Selected from {data.next_focus.kind.replaceAll("_", " ")}
              </p>
              <p>{data.next_focus.detail}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Assessment score trend</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            {scoreData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No assessment scores yet.
              </p>
            ) : (
              <div className="h-56" aria-label="Assessment score trend chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreData}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(_, payload) =>
                        payload[0]?.payload.timestamp ?? ""
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">
              Assessment and milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Exam readiness</span>
                <span>Not calculated</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Latest assessment:{" "}
                {latestScore == null ? "No score" : `${latestScore}%`}. The
                backend does not expose a separate readiness score.
              </p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Milestone completion</span>
                <span>
                  {milestoneCompletion == null
                    ? "No milestones"
                    : `${milestoneCompletion}%`}
                </span>
              </div>
              <Progress value={milestoneCompletion ?? 0} />
            </div>
            <div className="space-y-2">
              {data.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{milestone.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.target_date} ·{" "}
                      {milestone.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <MilestoneControls goals={goals.data} milestone={milestone} />
                </div>
              ))}
              {data.milestones.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No milestones yet.
                </p>
              )}
            </div>
            <MilestoneControls goals={goals.data} learningGoalId={goal.id} />
          </CardContent>
        </Card>
      </div>

      <BottleneckView
        bottlenecks={[...data.open_bottlenecks, ...data.resolved_bottlenecks]}
        goals={goals.data}
        assessments={assessments.data}
        projects={projects.data.projects}
      />

      <section className="space-y-3" aria-labelledby="recent-sessions">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="recent-sessions" className="text-lg font-semibold">
              Recent study sessions
            </h2>
            <p className="text-sm text-muted-foreground">
              Actual execution, newest first.
            </p>
          </div>
          <StudySessionControls
            goals={goals.data}
            projects={projects.data.projects}
            defaults={{ learning_goal_id: goal.id }}
          />
        </div>
        {data.recent_sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No study sessions recorded for this goal.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.recent_sessions.map((session) => (
              <Card key={session.id} className="gap-2 py-3">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
                  <div>
                    <p className="font-medium">{session.topic}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {sessionTypeLabel(session.session_type)} ·{" "}
                      {calendarLabel(session.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {session.actual_minutes} / {session.planned_minutes} min
                    </span>
                    <StudySessionControls
                      goals={goals.data}
                      projects={projects.data.projects}
                      session={session}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="practical-application">
        <h2 id="practical-application" className="text-lg font-semibold">
          Practical application
        </h2>
        {data.practical_project_sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No practical project sessions are linked to this goal.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.practical_project_sessions.map((session) => (
              <Card key={session.id} className="gap-3 py-4">
                <CardContent className="px-4">
                  <p className="font-medium">{session.topic}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5" /> Applied in:{" "}
                    {session.linked_project_id
                      ? (projectById.get(session.linked_project_id)?.name ??
                        "Deleted or unavailable project")
                      : "No linked project"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

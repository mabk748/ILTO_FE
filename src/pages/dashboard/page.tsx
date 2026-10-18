import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  Server,
  HeartPulse,
  TrendingUp,
  BookOpen,
  Briefcase,
  Users,
  Activity,
  Monitor,
  Dumbbell,
  CreditCard,
  GitCommit,
  Brain,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  ModuleHeader,
  ModulePage,
  ModuleSectionHeader,
} from "@/components/layout/ModulePage.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { getAllProjects, getSprints, getTasks } from "@/lib/api/projects.ts";
import { getNodes, getGitActivity } from "@/lib/api/infrastructure.ts";
import { getHealthMetrics, getWorkoutSessions } from "@/lib/api/health.ts";
import { getBudgetCategories } from "@/lib/api/finances.ts";
import { getDueCards, getAllCards } from "@/lib/api/learning.ts";
import { getDeadlines, getCertifications } from "@/lib/api/work.ts";
import { getFollowUps, getContacts } from "@/lib/api/social.ts";
import { getSleepTrend, getCommitsTrend } from "@/lib/api/intelligence.ts";
import { hasTrendObservations, toSparklinePoints } from "./sparkline-data.ts";
import {
  financesScore,
  healthScore,
  infraScore,
  learningScore,
  projectsScore,
  socialScore,
  systemScore,
  workScore,
  type DashboardScore,
} from "./dashboard-scores.ts";
import type {
  Project,
  Sprint,
  Task,
  InfraNode,
  GitActivity,
  HealthMetric,
  WorkoutSession,
  BudgetCategory,
  SpacedRepetitionCard,
  WorkDeadline,
  Certification,
  FollowUpPrompt,
  Contact,
  DomainName,
} from "@/lib/api/types.ts";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import {
  ErrorState,
  ErrorStateContent,
  ErrorStateDescription,
  ErrorStateHeader,
  ErrorStateMedia,
  ErrorStateTitle,
} from "@/components/ui/error-state.tsx";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state.tsx";
import { useSettings } from "@/components/providers/settings-context.ts";
import { useFinancePreferences } from "@/components/providers/finance-preferences-context.ts";
import { financeCurrency, formatMoney } from "@/lib/finance.ts";
import { formatInstant } from "@/lib/time-zone.ts";
import { summarizeActiveSprints } from "./project-summary.ts";

// ─── Data shape ─────────────────────────────────────────────────────────────

interface DashboardData {
  projects: Project[];
  sprints: Sprint[];
  tasks: Task[];
  nodes: InfraNode[];
  gitActivity: GitActivity[];
  healthMetrics: HealthMetric[];
  workoutSessions: WorkoutSession[];
  budgetCategories: BudgetCategory[];
  dueCards: SpacedRepetitionCard[];
  allCards: SpacedRepetitionCard[];
  deadlines: WorkDeadline[];
  certifications: Certification[];
  followUps: FollowUpPrompt[];
  contacts: Contact[];
  sleepTrend: (number | null)[];
  commitsTrend: (number | null)[];
}

// ─── Score helpers ───────────────────────────────────────────────────────────

type ScoreStatus = "on-track" | "needs-attention" | "critical";

function scoreStatus(score: number): ScoreStatus {
  if (score >= 75) return "on-track";
  if (score >= 50) return "needs-attention";
  return "critical";
}

const STATUS_BADGE: Record<ScoreStatus, string> = {
  "on-track": "border border-success/25 bg-success/12 text-success",
  "needs-attention": "border border-warning/25 bg-warning/12 text-warning",
  critical: "border border-destructive/25 bg-destructive/12 text-destructive",
};

const STATUS_RING: Record<ScoreStatus, string> = {
  "on-track": "group-hover:border-success/45",
  "needs-attention": "group-hover:border-warning/45",
  critical: "group-hover:border-destructive/45",
};

const STATUS_LABEL: Record<ScoreStatus, string> = {
  "on-track": "On Track",
  "needs-attention": "Needs Attention",
  critical: "Critical",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({
  data,
  color,
}: {
  data: (number | null)[];
  color: string;
}) {
  const points = toSparklinePoints(data);
  return (
    <ResponsiveContainer width="100%" height={28}>
      <LineChart
        data={points}
        margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
      >
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TickerItem({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span className="flex items-center gap-2 px-4 shrink-0">
      <Activity className="h-3 w-3 text-primary/60 shrink-0" />
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "text-xs font-semibold",
          accent ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </span>
    </span>
  );
}

interface DomainCardProps {
  domain: DomainName;
  label: string;
  icon: React.ElementType;
  path: string;
  score: DashboardScore;
  color: string;
  bg: string;
  metrics: Array<{ label: string; value: string }>;
  sparkline?: (number | null)[];
  sparklineColor?: string;
  emptySparklineLabel?: string;
  privacyMasked?: boolean;
}

async function loadDashboardData({
  signal,
}: {
  signal: AbortSignal;
}): Promise<DashboardData> {
  const [
    projectsResponse,
    sprints,
    tasks,
    nodes,
    gitActivity,
    healthMetrics,
    workoutSessions,
    budgetCategories,
    dueCards,
    allCards,
    deadlines,
    certifications,
    followUps,
    contacts,
    sleepTrend,
    commitsTrend,
  ] = await Promise.all([
    getAllProjects({ signal }),
    getSprints(undefined, { signal }),
    getTasks(undefined, { signal }),
    getNodes({ signal }),
    getGitActivity({ signal }),
    getHealthMetrics(30, { signal }),
    getWorkoutSessions(14, { signal }),
    getBudgetCategories({ signal }),
    getDueCards({ signal }),
    getAllCards({ signal }),
    getDeadlines({ signal }),
    getCertifications({ signal }),
    getFollowUps(undefined, { signal }),
    getContacts({ signal }),
    getSleepTrend({ signal }),
    getCommitsTrend({ signal }),
  ]);

  return {
    projects: projectsResponse,
    sprints,
    tasks,
    nodes,
    gitActivity,
    healthMetrics,
    workoutSessions,
    budgetCategories,
    dueCards,
    allCards,
    deadlines,
    certifications,
    followUps,
    contacts,
    sleepTrend,
    commitsTrend,
  };
}

function DashboardHeader({ clock, date }: { clock: string; date: string }) {
  return (
    <ModuleHeader
      title="Command Center"
      description={date}
      icon={Activity}
      eyebrow="ILTO operational overview"
      actions={
        <div className="rounded-xl border border-primary/20 bg-primary/[0.055] px-4 py-2 text-right">
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Local time
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-primary sm:text-3xl">
            {clock}
          </p>
        </div>
      }
    />
  );
}

export function DomainHealthCard({
  label,
  icon: Icon,
  path,
  score,
  color,
  bg,
  metrics,
  sparkline,
  sparklineColor,
  emptySparklineLabel,
  privacyMasked = false,
}: DomainCardProps) {
  const status = score === null || privacyMasked ? null : scoreStatus(score);
  return (
    <Link to={path} className="group cursor-pointer">
      <Card
        className={cn(
          "h-full transition-all duration-200 border",
          status ? STATUS_RING[status] : "hover:border-muted-foreground/30",
          "hover:bg-card/80",
        )}
      >
        <CardContent className="pt-4 pb-4 space-y-3">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className={cn("p-1.5 rounded-md", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                status
                  ? STATUS_BADGE[status]
                  : "border border-border bg-muted text-muted-foreground",
              )}
            >
              {privacyMasked
                ? "Hidden"
                : status
                  ? STATUS_LABEL[status]
                  : "No data"}
            </span>
          </div>
          {/* Label + score */}
          <div>
            <p
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {label}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    status === "on-track"
                      ? "bg-success"
                      : status === "needs-attention"
                        ? "bg-warning"
                        : status === "critical"
                          ? "bg-destructive"
                          : "bg-transparent",
                  )}
                  style={{
                    width: score === null || privacyMasked ? "0%" : `${score}%`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                {privacyMasked ? "••••" : score === null ? "—" : `${score}%`}
              </span>
            </div>
          </div>
          {/* Key metrics */}
          <div className="space-y-1">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-medium text-foreground">{m.value}</span>
              </div>
            ))}
          </div>
          {/* Sparkline */}
          {sparkline &&
            hasTrendObservations(sparkline) &&
            sparkline.length > 1 && (
              <div className="mt-1 opacity-70">
                <Sparkline
                  data={sparkline}
                  color={sparklineColor ?? "var(--chart-2)"}
                />
              </div>
            )}
          {sparkline &&
            !hasTrendObservations(sparkline) &&
            emptySparklineLabel && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {emptySparklineLabel}
              </p>
            )}
        </CardContent>
      </Card>
    </Link>
  );
}

function KPITile({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-lg border border-border bg-card/50 min-w-[130px]">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-[11px] text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <span
        className="text-xl font-bold text-foreground tabular-nums"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());
  const { settings } = useSettings();
  const { selectedCurrencies, masked: financesMasked } =
    useFinancePreferences();
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: loadDashboardData,
  });

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = formatInstant(time, settings.timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = formatInstant(time, settings.timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // ── Derived values ──────────────────────────────────────────────────────────
  const { activeSprints, sprintTasks, doneTasks } = data
    ? summarizeActiveSprints(data.sprints, data.tasks)
    : { activeSprints: [], sprintTasks: [], doneTasks: 0 };

  const budgetsByCurrency = selectedCurrencies.map((currency) => {
    const categories =
      data?.budgetCategories.filter(
        (category) => financeCurrency(category.currency) === currency,
      ) ?? [];
    const spent = categories.reduce(
      (total, category) => total + category.spent_this_month,
      0,
    );
    const limit = categories.reduce(
      (total, category) => total + category.monthly_limit,
      0,
    );
    return { currency, spent, limit, remaining: limit - spent };
  });
  const financeSummary = (field: "spent" | "limit" | "remaining"): string =>
    budgetsByCurrency.length === 0
      ? "No currencies selected"
      : budgetsByCurrency
          .map(({ currency, ...amounts }) =>
            formatMoney(amounts[field], currency, financesMasked, 0),
          )
          .join(" · ");

  const lastMetric = data?.healthMetrics.reduce<HealthMetric | undefined>(
    (latest, metric) =>
      !latest || new Date(metric.date) > new Date(latest.date)
        ? metric
        : latest,
    undefined,
  );
  const onlineCount =
    data?.nodes.filter((n) => n.status === "online").length ?? 0;
  const degradedCount =
    data?.nodes.filter((n) => n.status === "degraded").length ?? 0;
  const totalCommitsToday =
    data?.gitActivity.reduce((a, g) => a + g.commits_today, 0) ?? 0;
  const totalCommitsWeek =
    data?.gitActivity.reduce((a, g) => a + g.commits_week, 0) ?? 0;
  const overdueDeadlines =
    data?.deadlines.filter((d) => d.status === "overdue").length ?? 0;
  const overdueFollowUps = data
    ? data.followUps.filter(
        (f) => !f.completed && new Date(f.due_date) < new Date(),
      ).length
    : 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const workoutCount = data
    ? data.workoutSessions.filter(
        (session) =>
          session.type !== "rest" &&
          session.duration_minutes > 0 &&
          new Date(session.completed_at) >= sevenDaysAgo,
      ).length
    : 0;
  const studyHours =
    data?.certifications.reduce((a, c) => a + c.study_hours_logged, 0) ?? 0;
  const cardsReviewed =
    data?.allCards.reduce((a, c) => a + c.times_reviewed, 0) ?? 0;
  const followedUp = data?.followUps.filter((f) => f.completed).length ?? 0;
  const hasDashboardObservations = data
    ? [
        data.projects,
        data.sprints,
        data.tasks,
        data.nodes,
        data.gitActivity,
        data.healthMetrics,
        data.workoutSessions,
        data.budgetCategories,
        data.allCards,
        data.deadlines,
        data.certifications,
        data.followUps,
        data.contacts,
      ].some((records) => records.length > 0) ||
      hasTrendObservations(data.sleepTrend) ||
      hasTrendObservations(data.commitsTrend)
    : false;

  // ── Health scores ───────────────────────────────────────────────────────────
  const scores = data
    ? (() => {
        const infrastructure = infraScore(data.nodes);
        const learning = learningScore(data.dueCards, data.allCards);
        const work = workScore(data.deadlines);
        return {
          projects: projectsScore(data.tasks, data.sprints),
          infra: infrastructure,
          health: healthScore(data.healthMetrics),
          finances:
            selectedCurrencies.length === 1
              ? financesScore(data.budgetCategories, selectedCurrencies[0])
              : null,
          learning,
          work,
          social: socialScore(data.contacts),
          system: systemScore(infrastructure, work, learning),
        };
      })()
    : null;

  // ── Domain card definitions ─────────────────────────────────────────────────
  const domainCards: DomainCardProps[] =
    scores && data
      ? [
          {
            domain: "projects",
            label: "Projects",
            icon: FolderKanban,
            path: "/projects",
            score: scores.projects,
            color: "text-primary",
            bg: "bg-primary/10",
            metrics: [
              {
                label: "Active sprints",
                value: `${activeSprints.length}`,
              },
              {
                label: "Tasks done (active sprints)",
                value: `${doneTasks} / ${sprintTasks.length}`,
              },
              {
                label: "Active projects",
                value: `${data.projects.filter((project) => project.status === "active").length}`,
              },
            ],
          },
          {
            domain: "infrastructure",
            label: "Infrastructure",
            icon: Server,
            path: "/infrastructure",
            score: scores.infra,
            color: "text-info",
            bg: "bg-info/10",
            metrics: [
              {
                label: "Nodes online",
                value: `${onlineCount} / ${data.nodes.length}`,
              },
              { label: "Degraded", value: `${degradedCount}` },
              { label: "Git today", value: `${totalCommitsToday} commits` },
            ],
            sparkline: data.commitsTrend,
            sparklineColor: "var(--chart-3)",
            emptySparklineLabel: "No dated commit history",
          },
          {
            domain: "health",
            label: "Health (7d sleep / 8h target)",
            icon: HeartPulse,
            path: "/health",
            score: scores.health,
            color: "text-destructive",
            bg: "bg-destructive/10",
            metrics: [
              {
                label: "Last sleep",
                value:
                  lastMetric?.sleep_hours != null
                    ? `${lastMetric.sleep_hours.toFixed(1)}h`
                    : "—",
              },
              {
                label: "Resting HR",
                value:
                  lastMetric?.resting_hr != null
                    ? `${lastMetric.resting_hr} bpm`
                    : "—",
              },
              { label: "Workouts (7d)", value: `${workoutCount} sessions` },
            ],
            sparkline: data.sleepTrend,
            sparklineColor: "var(--destructive)",
            emptySparklineLabel: "No stored sleep trend",
          },
          {
            domain: "finances",
            label: "Finances",
            icon: TrendingUp,
            path: "/finances",
            score: scores.finances,
            privacyMasked: financesMasked,
            color: "text-success",
            bg: "bg-success/10",
            metrics:
              budgetsByCurrency.length === 0
                ? [{ label: "Currency filter", value: "None selected" }]
                : budgetsByCurrency.flatMap(
                    ({ currency, spent, limit, remaining }) => [
                      {
                        label: `Spent (${currency})`,
                        value: formatMoney(spent, currency, financesMasked, 0),
                      },
                      {
                        label: `Limit (${currency})`,
                        value: formatMoney(limit, currency, financesMasked, 0),
                      },
                      {
                        label: `Remaining (${currency})`,
                        value: formatMoney(
                          remaining,
                          currency,
                          financesMasked,
                          0,
                        ),
                      },
                    ],
                  ),
          },
          {
            domain: "learning",
            label: "Learning",
            icon: BookOpen,
            path: "/learning",
            score: scores.learning,
            color: "text-warning",
            bg: "bg-warning/10",
            metrics: [
              { label: "Cards due", value: `${data.dueCards.length}` },
              { label: "Total reviewed", value: `${cardsReviewed}` },
              { label: "Study hours", value: `${studyHours}h logged` },
            ],
          },
          {
            domain: "work",
            label: "Work (100 − 25 per overdue)",
            icon: Briefcase,
            path: "/work",
            score: scores.work,
            color: "text-warning",
            bg: "bg-warning/10",
            metrics: [
              { label: "Overdue", value: `${overdueDeadlines} deadlines` },
              {
                label: "Pending",
                value: `${data.deadlines.filter((d) => d.status === "pending").length}`,
              },
              {
                label: "Certs in progress",
                value: `${data.certifications.filter((c) => c.status === "in_progress").length}`,
              },
            ],
          },
          {
            domain: "social",
            label: "Social (active contacts %)",
            icon: Users,
            path: "/social",
            score: scores.social,
            color: "text-primary",
            bg: "bg-primary/10",
            metrics: [
              {
                label: "Active contacts",
                value: `${data.contacts.filter((c) => c.status === "active").length}`,
              },
              {
                label: "Follow-ups due",
                value: `${data.followUps.filter((f) => !f.completed).length}`,
              },
              { label: "Overdue", value: `${overdueFollowUps}` },
            ],
          },
          {
            domain: "infrastructure",
            label: "System",
            icon: Monitor,
            path: "/infrastructure",
            score: scores.system,
            color: "text-info",
            bg: "bg-info/10",
            metrics: [
              { label: "Commits / week", value: `${totalCommitsWeek}` },
              {
                label: "Node fleet",
                value: `${onlineCount}/${data.nodes.length} online`,
              },
              { label: "Degraded nodes", value: `${degradedCount}` },
            ],
          },
        ]
      : [];

  const visibleDomainCards = domainCards.filter(
    (card) => settings.domainVisibility[card.domain],
  );

  if (error) {
    return (
      <ModulePage>
        <DashboardHeader clock={clock} date={dateStr} />
        <ErrorState>
          <ErrorStateMedia />
          <ErrorStateHeader>
            <ErrorStateTitle>Could not load the dashboard</ErrorStateTitle>
            <ErrorStateDescription>
              {error instanceof Error
                ? error.message
                : "The data request failed."}
            </ErrorStateDescription>
          </ErrorStateHeader>
          <ErrorStateContent>
            <Button onClick={() => void refetch()}>Try again</Button>
          </ErrorStateContent>
        </ErrorState>
      </ModulePage>
    );
  }

  return (
    <ModulePage>
      {/* ── Header ── */}
      <DashboardHeader clock={clock} date={dateStr} />

      {/* ── Status ticker ── */}
      {(loading || hasDashboardObservations) && (
        <section
          aria-label="Current operational signals"
          className="overflow-hidden rounded-xl border border-border/70 bg-card/55"
        >
          <div className="scrollbar-none flex items-center divide-x divide-border overflow-x-auto overflow-y-hidden py-2">
            {loading ? (
              <div className="flex items-center gap-4 px-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-24" />
                ))}
              </div>
            ) : (
              <>
                <TickerItem
                  label="Nodes"
                  value={`${onlineCount}/${data?.nodes.length ?? 0} online`}
                />
                {degradedCount > 0 && (
                  <TickerItem
                    label="Degraded"
                    value={`${degradedCount}`}
                    accent
                  />
                )}
                <TickerItem
                  label="Active sprints"
                  value={
                    activeSprints.length
                      ? `${activeSprints.length}: ${activeSprints.map((sprint) => sprint.name).join(", ")}`
                      : "None"
                  }
                />
                <TickerItem
                  label="Tasks"
                  value={`${doneTasks}/${sprintTasks.length} done`}
                />
                <TickerItem
                  label="Budget"
                  value={`${financeSummary("spent")} / ${financeSummary("limit")}`}
                />
                <TickerItem
                  label="Sleep last"
                  value={
                    lastMetric?.sleep_hours != null
                      ? `${lastMetric.sleep_hours.toFixed(1)}h`
                      : "—"
                  }
                />
                <TickerItem
                  label="Resting HR"
                  value={
                    lastMetric?.resting_hr != null
                      ? `${lastMetric.resting_hr} bpm`
                      : "—"
                  }
                />
                <TickerItem
                  label="Git today"
                  value={`${totalCommitsToday} commits`}
                />
                <TickerItem
                  label="SR due"
                  value={`${data?.dueCards.length ?? 0} cards`}
                />
                {overdueDeadlines > 0 && (
                  <TickerItem
                    label="Overdue deadlines"
                    value={`${overdueDeadlines}`}
                    accent
                  />
                )}
                {overdueFollowUps > 0 && (
                  <TickerItem
                    label="Follow-ups overdue"
                    value={`${overdueFollowUps}`}
                    accent
                  />
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Main content ── */}
      <div className="space-y-8">
        {!loading && data && !hasDashboardObservations ? (
          <EmptyState className="py-7 md:py-7">
            <EmptyStateMedia>
              <Activity aria-hidden="true" />
            </EmptyStateMedia>
            <EmptyStateTitle>No operational records yet</EmptyStateTitle>
            <EmptyStateDescription>
              Domain health and weekly metrics appear after ILTO receives real
              Project, infrastructure, health, finance, learning, work or social
              records.
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <>
            {/* Domain health grid */}
            <section className="space-y-4">
              <ModuleSectionHeader
                title="Domain health"
                description="Direct links into each visible operating domain, using only its existing backend-derived score and metrics."
              />
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleDomainCards.map((card) => (
                    <DomainHealthCard key={card.label} {...card} />
                  ))}
                </div>
              )}
            </section>

            {/* Weekly KPI digest */}
            <section className="space-y-4">
              <ModuleSectionHeader
                title="Weekly digest"
                description="A compact view of the existing cross-domain weekly counters."
              />
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  <KPITile
                    label="Commits / week"
                    value={`${totalCommitsWeek}`}
                    icon={GitCommit}
                    color="text-info"
                  />
                  <KPITile
                    label="Workouts (7d)"
                    value={`${workoutCount}`}
                    icon={Dumbbell}
                    color="text-destructive"
                  />
                  <KPITile
                    label="Budget left"
                    value={financeSummary("remaining")}
                    icon={CreditCard}
                    color="text-success"
                  />
                  <KPITile
                    label="Study hours"
                    value={`${studyHours}h`}
                    icon={Brain}
                    color="text-warning"
                  />
                  <KPITile
                    label="Cards reviewed"
                    value={`${cardsReviewed}`}
                    icon={BookOpen}
                    color="text-primary"
                  />
                  <KPITile
                    label="Followed up"
                    value={`${followedUp}`}
                    icon={UserCheck}
                    color="text-primary"
                  />
                  <KPITile
                    label="Overdue items"
                    value={`${overdueDeadlines + overdueFollowUps}`}
                    icon={AlertTriangle}
                    color="text-warning"
                  />
                </div>
              )}
            </section>
          </>
        )}

        {/* Quick actions */}
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card/55 p-4 sm:p-5">
          <ModuleSectionHeader
            title="Quick actions"
            description="Open the existing module workflow for the next common action."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="cursor-pointer"
            >
              <Link to="/health?tab=sessions&action=log-workout">
                <Dumbbell className="h-3.5 w-3.5 mr-1.5" />
                Log workout
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="cursor-pointer"
            >
              <Link to="/finances">
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Log transaction
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="cursor-pointer"
            >
              <Link to="/learning">
                <Brain className="h-3.5 w-3.5 mr-1.5" />
                Review cards
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="cursor-pointer"
            >
              <Link to="/intelligence">
                <Brain className="h-3.5 w-3.5 mr-1.5" />
                Intelligence
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="cursor-pointer"
            >
              <Link to="/social">
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                Check follow-ups
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </ModulePage>
  );
}

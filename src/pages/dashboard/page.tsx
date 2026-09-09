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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { getProjects, getSprints, getTasks } from "@/lib/api/projects.ts";
import { getNodes, getGitActivity } from "@/lib/api/infrastructure.ts";
import { getHealthMetrics, getWorkoutSessions } from "@/lib/api/health.ts";
import { getBudgetCategories } from "@/lib/api/finances.ts";
import { getDueCards, getAllCards } from "@/lib/api/learning.ts";
import { getDeadlines, getCertifications } from "@/lib/api/work.ts";
import { getFollowUps, getContacts } from "@/lib/api/social.ts";
import { getSleepTrend, getCommitsTrend } from "@/lib/api/intelligence.ts";
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
import { useSettings } from "@/components/providers/settings-context.ts";

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
  sleepTrend: number[];
  commitsTrend: number[];
}

// ─── Score helpers ───────────────────────────────────────────────────────────

type ScoreStatus = "on-track" | "needs-attention" | "critical";

function scoreStatus(score: number): ScoreStatus {
  if (score >= 75) return "on-track";
  if (score >= 50) return "needs-attention";
  return "critical";
}

const STATUS_BADGE: Record<ScoreStatus, string> = {
  "on-track": "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  "needs-attention":
    "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  critical: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const STATUS_RING: Record<ScoreStatus, string> = {
  "on-track": "group-hover:border-emerald-500/50",
  "needs-attention": "group-hover:border-amber-500/50",
  critical: "group-hover:border-red-500/50",
};

const STATUS_LABEL: Record<ScoreStatus, string> = {
  "on-track": "On Track",
  "needs-attention": "Needs Attention",
  critical: "Critical",
};

// ─── Score computations ──────────────────────────────────────────────────────

function projectsScore(tasks: Task[], sprints: Sprint[]): number {
  const activeSprint = sprints.find((s) => s.status === "active");
  const st = activeSprint
    ? tasks.filter((t) => t.sprint_id === activeSprint.id)
    : tasks;
  if (st.length === 0) return 50;
  return Math.round(
    (st.filter((t) => t.status === "done").length / st.length) * 100,
  );
}

function infraScore(nodes: InfraNode[]): number {
  if (nodes.length === 0) return 0;
  return Math.round(
    (nodes.filter((n) => n.status === "online").length / nodes.length) * 100,
  );
}

function healthScore(metrics: HealthMetric[]): number {
  const sleepValues = metrics
    .slice(-7)
    .map((metric) => metric.sleep_hours)
    .filter((hours): hours is number => hours !== null);
  if (sleepValues.length === 0) return 0;
  const avg =
    sleepValues.reduce((sum, hours) => sum + hours, 0) / sleepValues.length;
  return Math.min(100, Math.round((avg / 8) * 100));
}

function financesScore(cats: BudgetCategory[]): number {
  const total = cats.reduce((a, c) => a + c.monthly_limit, 0);
  const spent = cats.reduce((a, c) => a + c.spent_this_month, 0);
  return total > 0
    ? Math.max(0, Math.min(100, Math.round((1 - spent / total) * 100)))
    : 50;
}

function learningScore(dueCards: SpacedRepetitionCard[]): number {
  return Math.max(0, 100 - dueCards.length * 15);
}

function workScore(deadlines: WorkDeadline[]): number {
  const overdue = deadlines.filter((d) => d.status === "overdue").length;
  return Math.max(0, 100 - overdue * 25);
}

function socialScore(contacts: Contact[]): number {
  if (contacts.length === 0) return 50;
  return Math.round(
    (contacts.filter((c) => c.status === "active").length / contacts.length) *
      100,
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v) => ({ v }));
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
          accent ? "text-amber-400" : "text-foreground",
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
  score: number;
  color: string;
  bg: string;
  metrics: Array<{ label: string; value: string }>;
  sparkline?: number[];
  sparklineColor?: string;
}

async function loadDashboardData(): Promise<DashboardData> {
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
    getProjects(),
    getSprints(),
    getTasks(),
    getNodes(),
    getGitActivity(),
    getHealthMetrics(30),
    getWorkoutSessions(14),
    getBudgetCategories(),
    getDueCards(),
    getAllCards(),
    getDeadlines(),
    getCertifications(),
    getFollowUps(),
    getContacts(),
    getSleepTrend(),
    getCommitsTrend(),
  ]);

  return {
    projects: projectsResponse.data,
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
    <div className="border-b border-border px-6 py-4 flex items-center justify-between">
      <div>
        <h1
          className="text-2xl font-bold text-foreground tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{date}</p>
      </div>
      <div
        className="text-3xl font-bold tabular-nums text-primary"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {clock}
      </div>
    </div>
  );
}

function DomainHealthCard({
  label,
  icon: Icon,
  path,
  score,
  color,
  bg,
  metrics,
  sparkline,
  sparklineColor,
}: DomainCardProps) {
  const status = scoreStatus(score);
  return (
    <Link to={path} className="group cursor-pointer">
      <Card
        className={cn(
          "h-full transition-all duration-200 border",
          STATUS_RING[status],
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
                STATUS_BADGE[status],
              )}
            >
              {STATUS_LABEL[status]}
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
                      ? "bg-emerald-500"
                      : status === "needs-attention"
                        ? "bg-amber-500"
                        : "bg-red-500",
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                {score}%
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
          {sparkline && sparkline.length > 1 && (
            <div className="mt-1 opacity-70">
              <Sparkline data={sparkline} color={sparklineColor ?? "#a78bfa"} />
            </div>
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

  const clock = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = time.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // ── Derived values ──────────────────────────────────────────────────────────
  const activeSprint = data?.sprints.find((s) => s.status === "active");
  const sprintTasks =
    activeSprint && data
      ? data.tasks.filter((t) => t.sprint_id === activeSprint.id)
      : [];
  const doneTasks = sprintTasks.filter((t) => t.status === "done").length;

  const totalSpent =
    data?.budgetCategories.reduce((a, c) => a + c.spent_this_month, 0) ?? 0;
  const totalLimit =
    data?.budgetCategories.reduce((a, c) => a + c.monthly_limit, 0) ?? 0;
  const budgetRemaining = totalLimit - totalSpent;

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

  // ── Health scores ───────────────────────────────────────────────────────────
  const scores = data
    ? {
        projects: projectsScore(data.tasks, data.sprints),
        infra: infraScore(data.nodes),
        health: healthScore(data.healthMetrics),
        finances: financesScore(data.budgetCategories),
        learning: learningScore(data.dueCards),
        work: workScore(data.deadlines),
        social: socialScore(data.contacts),
        system: 0,
      }
    : null;

  if (scores) {
    scores.system = Math.round(
      (scores.infra + scores.work + scores.learning) / 3,
    );
  }

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
            color: "text-violet-400",
            bg: "bg-violet-500/10",
            metrics: [
              { label: "Active sprint", value: activeSprint?.name ?? "None" },
              {
                label: "Tasks done",
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
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            metrics: [
              {
                label: "Nodes online",
                value: `${onlineCount} / ${data.nodes.length}`,
              },
              { label: "Degraded", value: `${degradedCount}` },
              { label: "Git today", value: `${totalCommitsToday} commits` },
            ],
            sparkline: data.commitsTrend,
            sparklineColor: "#60a5fa",
          },
          {
            domain: "health",
            label: "Health",
            icon: HeartPulse,
            path: "/health",
            score: scores.health,
            color: "text-rose-400",
            bg: "bg-rose-500/10",
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
            sparklineColor: "#f87171",
          },
          {
            domain: "finances",
            label: "Finances",
            icon: TrendingUp,
            path: "/finances",
            score: scores.finances,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            metrics: [
              { label: "Spent", value: `€${totalSpent.toFixed(0)}` },
              { label: "Budget limit", value: `€${totalLimit.toFixed(0)}` },
              { label: "Remaining", value: `€${budgetRemaining.toFixed(0)}` },
            ],
          },
          {
            domain: "learning",
            label: "Learning",
            icon: BookOpen,
            path: "/learning",
            score: scores.learning,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            metrics: [
              { label: "Cards due", value: `${data.dueCards.length}` },
              { label: "Total reviewed", value: `${cardsReviewed}` },
              { label: "Study hours", value: `${studyHours}h logged` },
            ],
          },
          {
            domain: "work",
            label: "Work",
            icon: Briefcase,
            path: "/work",
            score: scores.work,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
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
            label: "Social",
            icon: Users,
            path: "/social",
            score: scores.social,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
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
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
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
      <div className="min-h-full">
        <DashboardHeader clock={clock} date={dateStr} />
        <div className="p-6">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* ── Header ── */}
      <DashboardHeader clock={clock} date={dateStr} />

      {/* ── Status ticker ── */}
      <div className="border-b border-border bg-muted/20">
        <div className="flex items-center py-2 overflow-x-auto scrollbar-none divide-x divide-border">
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
                label="Sprint"
                value={activeSprint?.name ?? "No active sprint"}
              />
              <TickerItem
                label="Tasks"
                value={`${doneTasks}/${sprintTasks.length} done`}
              />
              <TickerItem
                label="Budget"
                value={`€${totalSpent.toFixed(0)} / €${totalLimit.toFixed(0)}`}
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
      </div>

      {/* ── Main content ── */}
      <div className="p-6 space-y-8">
        {/* Domain health grid */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Domain Health
          </p>
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
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Weekly KPI Digest
          </p>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-36 shrink-0 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
              <KPITile
                label="Commits / week"
                value={`${totalCommitsWeek}`}
                icon={GitCommit}
                color="text-blue-400"
              />
              <KPITile
                label="Workouts (7d)"
                value={`${workoutCount}`}
                icon={Dumbbell}
                color="text-rose-400"
              />
              <KPITile
                label="Budget left"
                value={`€${budgetRemaining.toFixed(0)}`}
                icon={CreditCard}
                color="text-emerald-400"
              />
              <KPITile
                label="Study hours"
                value={`${studyHours}h`}
                icon={Brain}
                color="text-amber-400"
              />
              <KPITile
                label="Cards reviewed"
                value={`${cardsReviewed}`}
                icon={BookOpen}
                color="text-violet-400"
              />
              <KPITile
                label="Followed up"
                value={`${followedUp}`}
                icon={UserCheck}
                color="text-cyan-400"
              />
              <KPITile
                label="Overdue items"
                value={`${overdueDeadlines + overdueFollowUps}`}
                icon={AlertTriangle}
                color="text-orange-400"
              />
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Quick Actions
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="cursor-pointer"
            >
              <Link to="/health">
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
    </div>
  );
}

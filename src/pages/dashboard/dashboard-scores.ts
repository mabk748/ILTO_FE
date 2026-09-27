import type {
  BudgetCategory,
  Contact,
  FinanceCurrency,
  HealthMetric,
  InfraNode,
  SpacedRepetitionCard,
  Sprint,
  Task,
  WorkDeadline,
} from "@/lib/api/types.ts";
import { financeCurrency } from "@/lib/finance.ts";

export type DashboardScore = number | null;

export function projectsScore(
  tasks: Task[],
  sprints: Sprint[],
): DashboardScore {
  const activeSprint = sprints.find((sprint) => sprint.status === "active");
  const relevantTasks = activeSprint
    ? tasks.filter((task) => task.sprint_id === activeSprint.id)
    : tasks;
  if (relevantTasks.length === 0) return null;
  return Math.round(
    (relevantTasks.filter((task) => task.status === "done").length /
      relevantTasks.length) *
      100,
  );
}

export function infraScore(nodes: InfraNode[]): DashboardScore {
  if (nodes.length === 0) return null;
  return Math.round(
    (nodes.filter((node) => node.status === "online").length / nodes.length) *
      100,
  );
}

export function healthScore(
  metrics: HealthMetric[],
  now = Date.now(),
): DashboardScore {
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const sleepValues = metrics
    .filter((metric) => Date.parse(metric.date) >= sevenDaysAgo)
    .map((metric) => metric.sleep_hours)
    .filter((hours): hours is number => hours !== null);
  if (sleepValues.length === 0) return null;
  const average =
    sleepValues.reduce((sum, hours) => sum + hours, 0) / sleepValues.length;
  return Math.min(100, Math.round((average / 8) * 100));
}

export function financesScore(
  categories: BudgetCategory[],
  currency: FinanceCurrency = "EUR",
): DashboardScore {
  const matchingCategories = categories.filter(
    (category) => financeCurrency(category.currency) === currency,
  );
  const total = matchingCategories.reduce(
    (sum, category) => sum + category.monthly_limit,
    0,
  );
  if (total <= 0) return null;
  const spent = matchingCategories.reduce(
    (sum, category) => sum + category.spent_this_month,
    0,
  );
  return Math.max(0, Math.min(100, Math.round((1 - spent / total) * 100)));
}

export function learningScore(
  dueCards: SpacedRepetitionCard[],
  allCards: SpacedRepetitionCard[],
): DashboardScore {
  if (allCards.length === 0) return null;
  return Math.max(0, 100 - dueCards.length * 15);
}

export function workScore(deadlines: WorkDeadline[]): DashboardScore {
  if (deadlines.length === 0) return null;
  const overdue = deadlines.filter(
    (deadline) => deadline.status === "overdue",
  ).length;
  return Math.max(0, 100 - overdue * 25);
}

export function socialScore(contacts: Contact[]): DashboardScore {
  if (contacts.length === 0) return null;
  return Math.round(
    (contacts.filter((contact) => contact.status === "active").length /
      contacts.length) *
      100,
  );
}

export function systemScore(
  infrastructure: DashboardScore,
  work: DashboardScore,
  learning: DashboardScore,
): DashboardScore {
  if (infrastructure === null || work === null || learning === null)
    return null;
  return Math.round((infrastructure + work + learning) / 3);
}

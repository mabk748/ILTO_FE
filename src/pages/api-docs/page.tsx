import { useState, useMemo } from "react";
import { Code2, Search, Terminal } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface Endpoint {
  fn: string;
  method: HttpMethod;
  path: string;
  returns: string;
  consumer: string;
}

interface DomainDocs {
  id: string;
  label: string;
  color: string;
  endpoints: Endpoint[];
  snippet: string;
}

// ─── Endpoint data ────────────────────────────────────────────────────────────

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  POST: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  PUT: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-400 border border-red-500/30",
  PATCH: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
};

const DOMAIN_DOCS: DomainDocs[] = [
  {
    id: "projects",
    label: "Projects",
    color: "text-violet-400",
    endpoints: [
      {
        fn: "getProjects",
        method: "GET",
        path: "/api/v1/projects",
        returns: "PaginatedResponse<Project>",
        consumer: "ProjectsPage (Milestones tab sidebar)",
      },
      {
        fn: "getProject",
        method: "GET",
        path: "/api/v1/projects/:id",
        returns: "Project",
        consumer: "ProjectsPage",
      },
      {
        fn: "getSprints",
        method: "GET",
        path: "/api/v1/sprints",
        returns: "Sprint[]",
        consumer: "SprintList component",
      },
      {
        fn: "getTasks",
        method: "GET",
        path: "/api/v1/tasks",
        returns: "Task[]",
        consumer: "KanbanBoard component",
      },
      {
        fn: "getMilestones",
        method: "GET",
        path: "/api/v1/milestones",
        returns: "Milestone[]",
        consumer: "MilestoneList component",
      },
    ],
    snippet: `// BEFORE (mock)
export async function getProjects(): Promise<PaginatedResponse<Project>> {
  await delay();
  return { data: mockProjects, total: mockProjects.length, page: 1, per_page: 20, total_pages: 1 };
}

// AFTER (real API)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getProjects(): Promise<PaginatedResponse<Project>> {
  const res = await fetch(\`\${BASE_URL}/api/v1/projects\`, {
    headers: { Authorization: \`Bearer \${getToken()}\` },
  });
  if (!res.ok) throw new Error(\`API error: \${res.status}\`);
  return res.json() as Promise<PaginatedResponse<Project>>;
}`,
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    color: "text-blue-400",
    endpoints: [
      {
        fn: "getNodes",
        method: "GET",
        path: "/api/v1/infrastructure/nodes",
        returns: "InfraNode[]",
        consumer: "NodeCard component",
      },
      {
        fn: "getNodeMetrics",
        method: "GET",
        path: "/api/v1/infrastructure/nodes/:id/metrics",
        returns: "SystemMetric[]",
        consumer: "MetricsChart component",
      },
      {
        fn: "getLatestMetric",
        method: "GET",
        path: "/api/v1/infrastructure/nodes/:id/metrics/latest",
        returns: "SystemMetric",
        consumer: "NodeCard component",
      },
      {
        fn: "getGitActivity",
        method: "GET",
        path: "/api/v1/infrastructure/git",
        returns: "GitActivity[]",
        consumer: "GitActivityTable component",
      },
    ],
    snippet: `// BEFORE (mock)
export async function getNodes(): Promise<InfraNode[]> {
  await delay();
  return mockNodes;
}

// AFTER (real API)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getNodes(): Promise<InfraNode[]> {
  const res = await fetch(\`\${BASE_URL}/api/v1/infrastructure/nodes\`, {
    headers: { Authorization: \`Bearer \${getToken()}\` },
  });
  if (!res.ok) throw new Error(\`API error: \${res.status}\`);
  return res.json() as Promise<InfraNode[]>;
}

// WebSocket upgrade for live metrics:
// const ws = new WebSocket(\`ws://your-server:8000/ws/metrics/\${nodeId}\`);`,
  },
  {
    id: "health",
    label: "Health",
    color: "text-rose-400",
    endpoints: [
      {
        fn: "getTrainingPlans",
        method: "GET",
        path: "/api/v1/health/training-plans",
        returns: "TrainingPlan[]",
        consumer: "TrainingPlanList component",
      },
      {
        fn: "getWorkoutSessions",
        method: "GET",
        path: "/api/v1/health/sessions",
        returns: "WorkoutSession[]",
        consumer: "SessionList component",
      },
      {
        fn: "getHealthMetrics",
        method: "GET",
        path: "/api/v1/health/metrics",
        returns: "HealthMetric[]",
        consumer: "MetricsCharts component",
      },
    ],
    snippet: `// BEFORE (mock)
export async function getHealthMetrics(days = 30): Promise<HealthMetric[]> {
  await delay();
  return mockHealthMetrics.slice(-days);
}

// AFTER (real API)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getHealthMetrics(days = 30): Promise<HealthMetric[]> {
  const res = await fetch(\`\${BASE_URL}/api/v1/health/metrics?days=\${days}\`, {
    headers: { Authorization: \`Bearer \${getToken()}\` },
  });
  if (!res.ok) throw new Error(\`API error: \${res.status}\`);
  return res.json() as Promise<HealthMetric[]>;
}`,
  },
  {
    id: "finances",
    label: "Finances",
    color: "text-emerald-400",
    endpoints: [
      {
        fn: "getBudgetCategories",
        method: "GET",
        path: "/api/v1/finances/budget-categories",
        returns: "BudgetCategory[]",
        consumer: "BudgetView component",
      },
      {
        fn: "getTransactions",
        method: "GET",
        path: "/api/v1/finances/transactions",
        returns: "Transaction[]",
        consumer: "BudgetView component",
      },
      {
        fn: "getTrades",
        method: "GET",
        path: "/api/v1/finances/trades",
        returns: "TradeEntry[]",
        consumer: "PortfolioView component",
      },
      {
        fn: "getNetWorthSnapshots",
        method: "GET",
        path: "/api/v1/finances/net-worth",
        returns: "NetWorthSnapshot[]",
        consumer: "PortfolioView component",
      },
      {
        fn: "getBills",
        method: "GET",
        path: "/api/v1/finances/bills",
        returns: "Bill[]",
        consumer: "BillsView component",
      },
    ],
    snippet: `// BEFORE (mock)
export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  await delay();
  return mockBudgetCategories;
}

// AFTER (real API)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  const res = await fetch(\`\${BASE_URL}/api/v1/finances/budget-categories\`, {
    headers: { Authorization: \`Bearer \${getToken()}\` },
  });
  if (!res.ok) throw new Error(\`API error: \${res.status}\`);
  return res.json() as Promise<BudgetCategory[]>;
}`,
  },
  {
    id: "learning",
    label: "Learning",
    color: "text-amber-400",
    endpoints: [
      {
        fn: "getRoadmaps",
        method: "GET",
        path: "/api/v1/learning/roadmaps",
        returns: "LearningRoadmap[]",
        consumer: "RoadmapList component",
      },
      {
        fn: "getSkills",
        method: "GET",
        path: "/api/v1/learning/skills",
        returns: "SkillNode[]",
        consumer: "RoadmapList component (expanded)",
      },
      {
        fn: "getSRCards",
        method: "GET",
        path: "/api/v1/learning/sr-cards",
        returns: "SpacedRepetitionCard[]",
        consumer: "ReviewQueue component",
      },
      {
        fn: "getReading",
        method: "GET",
        path: "/api/v1/learning/reading",
        returns: "ReadingEntry[]",
        consumer: "ReadingList component",
      },
    ],
    snippet: `// BEFORE (mock)
export async function getSRCards(): Promise<SpacedRepetitionCard[]> {
  await delay();
  return mockSRCards;
}

// AFTER (real API)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getSRCards(): Promise<SpacedRepetitionCard[]> {
  const res = await fetch(\`\${BASE_URL}/api/v1/learning/sr-cards\`, {
    headers: { Authorization: \`Bearer \${getToken()}\` },
  });
  if (!res.ok) throw new Error(\`API error: \${res.status}\`);
  return res.json() as Promise<SpacedRepetitionCard[]>;
}`,
  },
  {
    id: "work",
    label: "Work",
    color: "text-orange-400",
    endpoints: [
      {
        fn: "getCareerMilestones",
        method: "GET",
        path: "/api/v1/work/career-milestones",
        returns: "CareerMilestone[]",
        consumer: "CareerRoadmap component",
      },
      {
        fn: "getCertifications",
        method: "GET",
        path: "/api/v1/work/certifications",
        returns: "Certification[]",
        consumer: "CareerRoadmap component",
      },
      {
        fn: "getDeadlines",
        method: "GET",
        path: "/api/v1/work/deadlines",
        returns: "WorkDeadline[]",
        consumer: "DeadlineQueue component",
      },
      {
        fn: "getCompliance",
        method: "GET",
        path: "/api/v1/work/compliance",
        returns: "ComplianceItem[]",
        consumer: "ComplianceChecklist component",
      },
    ],
    snippet: `// BEFORE (mock)
export async function getDeadlines(): Promise<WorkDeadline[]> {
  await delay();
  return mockDeadlines;
}

// AFTER (real API)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getDeadlines(): Promise<WorkDeadline[]> {
  const res = await fetch(\`\${BASE_URL}/api/v1/work/deadlines\`, {
    headers: { Authorization: \`Bearer \${getToken()}\` },
  });
  if (!res.ok) throw new Error(\`API error: \${res.status}\`);
  return res.json() as Promise<WorkDeadline[]>;
}`,
  },
  {
    id: "social",
    label: "Social",
    color: "text-cyan-400",
    endpoints: [
      {
        fn: "getContacts",
        method: "GET",
        path: "/api/v1/social/contacts",
        returns: "Contact[]",
        consumer: "ContactList component",
      },
      {
        fn: "getFollowUps",
        method: "GET",
        path: "/api/v1/social/follow-ups",
        returns: "FollowUpPrompt[]",
        consumer: "FollowUpList component",
      },
      {
        fn: "getNetworkingGoals",
        method: "GET",
        path: "/api/v1/social/networking-goals",
        returns: "NetworkingGoal[]",
        consumer: "NetworkingGoals component",
      },
    ],
    snippet: `// BEFORE (mock)
export async function getContacts(): Promise<Contact[]> {
  await delay();
  return mockContacts;
}

// AFTER (real API)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getContacts(): Promise<Contact[]> {
  const res = await fetch(\`\${BASE_URL}/api/v1/social/contacts\`, {
    headers: { Authorization: \`Bearer \${getToken()}\` },
  });
  if (!res.ok) throw new Error(\`API error: \${res.status}\`);
  return res.json() as Promise<Contact[]>;
}`,
  },
];

const FILE_MAP = `src/
├── App.tsx                          # Root: routing + dark mode lock
├── main.tsx                         # Vite entry point
├── index.css                        # Global CSS variables / theme
│
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx            # Sidebar + bottom nav shell
│   └── ui/                          # shadcn/ui components (auto-generated)
│
├── hooks/
│   └── use-auth.ts                  # Hercules Auth hook
│
├── lib/
│   ├── utils.ts                     # cn() + shared utilities
│   └── api/
│       ├── types.ts                 # All TypeScript types — mirrors PostgreSQL schema
│       ├── index.ts                 # Re-exports all domain APIs
│       ├── projects.ts              # GET /api/v1/projects, /sprints, /tasks, /milestones
│       ├── infrastructure.ts        # GET /api/v1/infrastructure/nodes, /git
│       ├── health.ts                # GET /api/v1/health/training-plans, /sessions, /metrics
│       ├── finances.ts              # GET /api/v1/finances/budget-categories, /transactions, /trades, /net-worth, /bills
│       ├── learning.ts              # GET /api/v1/learning/roadmaps, /skills, /sr-cards, /reading
│       ├── work.ts                  # GET /api/v1/work/career-milestones, /certifications, /deadlines, /compliance
│       ├── social.ts                # GET /api/v1/social/contacts, /follow-ups, /networking-goals
│       └── mock/
│           ├── projects.mock.ts     # Mock projects, sprints, tasks, milestones
│           ├── infrastructure.mock.ts # Mock nodes, metrics, git activity
│           ├── health.mock.ts       # Mock training plans, sessions, biometrics
│           ├── finances.mock.ts     # Mock budget categories, transactions, trades, net worth, bills
│           ├── learning.mock.ts     # Mock roadmaps, skills, SR cards, reading list
│           ├── work.mock.ts         # Mock career milestones, certs, deadlines, compliance
│           └── social.mock.ts       # Mock contacts, networking goals, follow-ups
│
└── pages/
    ├── dashboard/
    │   └── page.tsx                 # Command Center — loads all domain summaries
    ├── projects/
    │   └── page.tsx                 # Kanban board, sprint view, milestone tracker
    ├── infrastructure/
    │   └── page.tsx                 # Node health, system metrics, git velocity
    ├── health/
    │   └── page.tsx                 # Training plans, biometric charts, workout log
    ├── finances/
    │   └── page.tsx                 # Budget categories, trades, net worth, bills
    ├── learning/
    │   └── page.tsx                 # Skill roadmaps, SR queue, reading list
    ├── work/
    │   └── page.tsx                 # Career roadmap, certifications, deadlines
    ├── social/
    │   └── page.tsx                 # Contact CRM, follow-up queue, networking goals
    ├── api-docs/
    │   └── page.tsx                 # This file — developer integration reference
    └── NotFound.tsx                 # 404 page`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function EndpointRow({
  endpoint,
  highlight,
}: {
  endpoint: Endpoint;
  highlight: string;
}) {
  const match = (s: string) =>
    highlight ? s.toLowerCase().includes(highlight.toLowerCase()) : true;
  const isMatch =
    match(endpoint.fn) ||
    match(endpoint.path) ||
    match(endpoint.consumer) ||
    match(endpoint.returns);
  if (!isMatch) return null;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="py-2.5 px-3">
        <code className="text-xs font-mono text-primary">{endpoint.fn}</code>
      </td>
      <td className="py-2.5 px-3">
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded font-mono",
            METHOD_STYLE[endpoint.method],
          )}
        >
          {endpoint.method}
        </span>
        <code className="ml-2 text-xs font-mono text-muted-foreground">
          {endpoint.path}
        </code>
      </td>
      <td className="py-2.5 px-3">
        <code className="text-xs font-mono text-amber-400/80">
          {endpoint.returns}
        </code>
      </td>
      <td className="py-2.5 px-3">
        <span className="text-xs text-muted-foreground">
          {endpoint.consumer}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <Badge
          variant="secondary"
          className="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/15"
        >
          Mock
        </Badge>
      </td>
    </tr>
  );
}

function DomainSection({
  domain,
  search,
}: {
  domain: DomainDocs;
  search: string;
}) {
  const visibleCount = domain.endpoints.filter((ep) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ep.fn.toLowerCase().includes(q) ||
      ep.path.toLowerCase().includes(q) ||
      ep.consumer.toLowerCase().includes(q) ||
      ep.returns.toLowerCase().includes(q)
    );
  }).length;

  if (search && visibleCount === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        No endpoints match "{search}" in this domain.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Endpoint table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Function
              </th>
              <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Method + Path
              </th>
              <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Returns
              </th>
              <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Consumer
              </th>
              <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {domain.endpoints.map((ep) => (
              <EndpointRow key={ep.fn} endpoint={ep} highlight={search} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Integration snippet */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Integration snippet
          </p>
        </div>
        <pre className="bg-muted/40 border border-border rounded-lg p-4 text-xs font-mono text-foreground/80 overflow-x-auto leading-relaxed">
          {domain.snippet}
        </pre>
        <p className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded px-3 py-2 font-mono">
          Set <span className="text-primary">VITE_API_BASE_URL</span>
          =http://your-server:8000 in{" "}
          <span className="text-amber-400">.env.local</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("projects");

  const totalEndpoints = useMemo(
    () => DOMAIN_DOCS.reduce((a, d) => a + d.endpoints.length, 0),
    [],
  );

  const filteredTotal = useMemo(() => {
    if (!search) return totalEndpoints;
    const q = search.toLowerCase();
    return DOMAIN_DOCS.reduce(
      (acc, d) =>
        acc +
        d.endpoints.filter(
          (ep) =>
            ep.fn.toLowerCase().includes(q) ||
            ep.path.toLowerCase().includes(q) ||
            ep.consumer.toLowerCase().includes(q) ||
            ep.returns.toLowerCase().includes(q),
        ).length,
      0,
    );
  }, [search, totalEndpoints]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <Code2 className="h-6 w-6 text-primary" />
          <h1
            className="text-2xl font-bold text-foreground tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            API Integration Reference
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          All API endpoints consumed by this frontend.{" "}
          <span className="text-amber-400 font-medium">
            Mock data is active
          </span>{" "}
          — swap each function in{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            src/lib/api/[domain].ts
          </code>{" "}
          to connect your FastAPI backend.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">
              {totalEndpoints}
            </span>{" "}
            endpoints across{" "}
            <span className="text-foreground font-semibold">
              {DOMAIN_DOCS.length}
            </span>{" "}
            domains
          </span>
          {search && (
            <span className="text-xs text-primary">
              {filteredTotal} matching "{search}"
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Search bar */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by function, path, or component…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Domain tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
            {DOMAIN_DOCS.map((d) => (
              <TabsTrigger
                key={d.id}
                value={d.id}
                className={cn(
                  "text-xs cursor-pointer",
                  activeTab === d.id && d.color,
                )}
              >
                {d.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {DOMAIN_DOCS.map((d) => (
            <TabsContent key={d.id} value={d.id} className="mt-6">
              <DomainSection domain={d} search={search} />
            </TabsContent>
          ))}
        </Tabs>

        {/* Architecture notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              Architecture Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                All mock functions are in{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">
                  src/lib/api/mock/[domain].mock.ts
                </code>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                API modules in{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">
                  src/lib/api/[domain].ts
                </code>{" "}
                — one file per domain, swap mock returns for real fetch calls
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Types in{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">
                  src/lib/api/types.ts
                </code>{" "}
                — mirrors the PostgreSQL schema exactly
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Set{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded text-amber-400">
                  VITE_API_BASE_URL
                </code>{" "}
                in{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">
                  .env.local
                </code>{" "}
                to your FastAPI server URL
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Add{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">
                  Authorization: Bearer &lt;token&gt;
                </code>{" "}
                header after implementing JWT auth (v0.6)
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                WebSocket upgrade available for live metrics at{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded text-blue-400">
                  ws://your-server:8000/ws/metrics/:node_id
                </code>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* File map */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              File Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/40 border border-border rounded-lg p-4 text-xs font-mono text-foreground/75 overflow-x-auto leading-relaxed">
              {FILE_MAP}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

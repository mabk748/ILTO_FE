import { Link } from "react-router-dom";
import { ArrowDown, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import type { LearningGoal, Project } from "@/lib/api/types.ts";
import { LearningGoalControls } from "./LearningPlanControls.tsx";

function range(goals: readonly LearningGoal[]): string {
  if (goals.length === 0) return "Dates not set";
  const starts = goals.map((goal) => goal.start_date).sort();
  const targets = goals
    .map((goal) => goal.target_date)
    .filter((value): value is string => value !== null)
    .sort();
  return `${starts[0]} → ${targets.at(-1) ?? "Open-ended"}`;
}

function Phase({
  number,
  label,
  goals,
  projects,
}: {
  number: number;
  label: string;
  goals: readonly LearningGoal[];
  projects: readonly Project[];
}) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  return (
    <Card className="gap-4 py-5">
      <CardContent className="space-y-4 px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Phase {number}
          </p>
          <h3 className="mt-1 font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground">{range(goals)}</p>
        </div>
        {goals.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No goals in this phase.
          </p>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/learning/goals/${encodeURIComponent(goal.id)}`}
                      className="font-medium hover:underline"
                    >
                      {goal.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {goal.provider} · {goal.status}
                    </p>
                  </div>
                  <LearningGoalControls
                    goal={goal}
                    projects={projects}
                    compact
                  />
                </div>
                {goal.linked_project_id && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" /> Applied in:{" "}
                    {projectById.get(goal.linked_project_id)?.name ??
                      "Deleted or unavailable project"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PhaseRoadmapView({
  goals,
  projects,
}: {
  goals: readonly LearningGoal[];
  projects: readonly Project[];
}) {
  const phaseOne = goals.filter((goal) => {
    const phase = goal.phase?.toLocaleLowerCase();
    return (
      phase === "phase 1" ||
      ((goal.status === "active" ||
        goal.status === "paused" ||
        goal.status === "completed") &&
        phase !== "phase 2" &&
        phase !== "phase 3")
    );
  });
  const phaseTwo = goals.filter(
    (goal) =>
      goal.phase?.toLocaleLowerCase() === "phase 2" ||
      (!goal.phase && goal.status === "planned"),
  );
  const phaseThree = goals.filter(
    (goal) => !phaseOne.includes(goal) && !phaseTwo.includes(goal),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">FDE learning roadmap</h2>
          <p className="text-sm text-muted-foreground">
            A lightweight view derived from goal status and dates.
          </p>
        </div>
        <LearningGoalControls projects={projects} />
      </div>
      {goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No learning goals yet. Add the first goal to establish phase 1.
          </CardContent>
        </Card>
      ) : (
        <div className="mx-auto max-w-3xl space-y-3">
          <Phase
            number={1}
            label="Current execution"
            goals={phaseOne}
            projects={projects}
          />
          <ArrowDown
            className="mx-auto h-5 w-5 text-muted-foreground"
            aria-label="After completion"
          />
          <Phase
            number={2}
            label="Planned next"
            goals={phaseTwo}
            projects={projects}
          />
          <ArrowDown
            className="mx-auto h-5 w-5 text-muted-foreground"
            aria-label="After completion"
          />
          <Phase
            number={3}
            label="Chosen from future job or apprenticeship requirements"
            goals={phaseThree}
            projects={projects}
          />
        </div>
      )}
    </div>
  );
}

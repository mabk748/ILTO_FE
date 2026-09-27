import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import { formatInstant } from "@/lib/time-zone.ts";
import { resolveBottleneck, updateBottleneck } from "@/lib/api/learning.ts";
import type {
  AssessmentAttempt,
  LearningBottleneck,
  LearningGoal,
  Project,
} from "@/lib/api/types.ts";
import { learningQueryKeys } from "../learning-query-keys.ts";
import {
  dateKeyInTimeZone,
  learningPlanError,
  sortBottlenecks,
} from "../learning-plan.ts";
import {
  BottleneckEditor,
  StudySessionControls,
} from "./LearningPlanControls.tsx";

const priorityStyle: Record<LearningBottleneck["priority"], string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-400",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  low: "border-blue-500/40 bg-blue-500/10 text-blue-400",
};

export default function BottleneckView({
  bottlenecks,
  goals,
  assessments,
  projects,
}: {
  bottlenecks: readonly LearningBottleneck[];
  goals: readonly LearningGoal[];
  assessments: readonly AssessmentAttempt[];
  projects: readonly Project[];
}) {
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const assessmentById = new Map(
    assessments.map((attempt) => [attempt.id, attempt]),
  );
  const unresolved = sortBottlenecks(
    bottlenecks.filter((item) => item.status !== "resolved"),
  );
  const statusMutation = useMutation({
    retry: false,
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "improving" | "resolve";
    }) =>
      action === "resolve"
        ? resolveBottleneck(id)
        : updateBottleneck(id, { status: "improving" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: learningQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">What should I study?</h2>
          <p className="text-sm text-muted-foreground">
            Unresolved bottlenecks ranked by priority, then recency.
          </p>
        </div>
        <BottleneckEditor goals={goals} />
      </div>

      {statusMutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {learningPlanError(statusMutation.error)}
        </p>
      )}

      {unresolved.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No unresolved bottlenecks. Record weak areas after an assessment or
            follow the next planned milestone.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {unresolved.map((item) => {
            const assessment = item.assessment_attempt_id
              ? assessmentById.get(item.assessment_attempt_id)
              : undefined;
            const goal = goalById.get(item.learning_goal_id);
            const pending =
              statusMutation.isPending &&
              statusMutation.variables?.id === item.id;
            return (
              <Card key={item.id} className="gap-3 py-4">
                <CardContent className="space-y-3 px-4 md:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold">{item.topic}</p>
                        <p className="text-sm text-muted-foreground">
                          {goal?.title ?? "Deleted or unavailable goal"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${priorityStyle[item.priority]}`}
                      >
                        {item.priority}
                      </span>
                      <span className="rounded-full border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                        {item.status}
                      </span>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Added{" "}
                      {formatInstant(item.created_at, timeZone, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>
                      Source:{" "}
                      {assessment
                        ? `${assessment.assessment_type.replaceAll("_", " ")} · ${assessment.score_percent}%`
                        : item.assessment_attempt_id
                          ? "Unavailable assessment"
                          : "Manual"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StudySessionControls
                      goals={goals}
                      projects={projects}
                      label="Study now"
                      defaults={{
                        learning_goal_id: item.learning_goal_id,
                        date: dateKeyInTimeZone(new Date(), timeZone),
                        topic: item.topic,
                        planned_minutes: "60",
                        session_type: "study",
                        bottleneck_id: item.id,
                      }}
                    />
                    {item.status === "open" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          statusMutation.mutate({
                            id: item.id,
                            action: "improving",
                          })
                        }
                      >
                        Mark improving
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: item.id,
                          action: "resolve",
                        })
                      }
                    >
                      Resolve
                    </Button>
                    <BottleneckEditor goals={goals} bottleneck={item} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

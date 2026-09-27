import { Card, CardContent } from "@/components/ui/card.tsx";
import type { AssessmentAttempt, LearningGoal } from "@/lib/api/types.ts";
import { AssessmentEntry } from "./LearningPlanControls.tsx";

function calendarLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default function AssessmentsView({
  goals,
  assessments,
}: {
  goals: readonly LearningGoal[];
  assessments: readonly AssessmentAttempt[];
}) {
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const newest = [...assessments].sort(
    (left, right) => Date.parse(right.date) - Date.parse(left.date),
  );
  return (
    <div className="space-y-6">
      <AssessmentEntry goals={goals} />
      <section aria-labelledby="assessment-history" className="space-y-3">
        <h2 id="assessment-history" className="text-lg font-semibold">
          Assessment history
        </h2>
        {newest.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No assessments recorded yet.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Goal</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {newest.map((attempt) => (
                  <tr key={attempt.id} className="border-t">
                    <td className="p-3">{calendarLabel(attempt.date)}</td>
                    <td className="p-3 font-medium">
                      {goalById.get(attempt.learning_goal_id)?.title ??
                        "Unavailable goal"}
                    </td>
                    <td className="p-3 capitalize">
                      {attempt.assessment_type.replaceAll("_", " ")}
                    </td>
                    <td className="p-3 font-mono font-semibold">
                      {attempt.score_percent}%
                    </td>
                    <td className="p-3">
                      {attempt.duration_minutes == null
                        ? "—"
                        : `${attempt.duration_minutes} min`}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {attempt.source ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card.tsx";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import type { LearningGoal, WeeklyReview } from "@/lib/api/types.ts";
import { dateKeyInTimeZone } from "../learning-plan.ts";
import { WeeklyReviewEditor } from "./LearningPlanControls.tsx";

export default function WeeklyReviewsView({
  reviews,
  goals,
}: {
  reviews: readonly WeeklyReview[];
  goals: readonly LearningGoal[];
}) {
  const timeZone = useTimeZone();
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const ordered = [...reviews].sort(
    (left, right) =>
      right.week_start.localeCompare(left.week_start) ||
      left.id.localeCompare(right.id),
  );
  const localToday = dateKeyInTimeZone(new Date(), timeZone);
  const isSunday = new Date(`${localToday}T12:00:00Z`).getUTCDay() === 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Sunday review</h2>
          <p className="text-sm text-muted-foreground">
            {isSunday
              ? "Close the week, identify the blocker, and choose the next focus."
              : "The review is always available; Sunday is the intended weekly checkpoint."}
          </p>
        </div>
        <WeeklyReviewEditor goals={goals} />
      </div>

      <section aria-labelledby="previous-reviews" className="space-y-3">
        <div>
          <h2 id="previous-reviews" className="text-lg font-semibold">
            Previous reviews
          </h2>
          <p className="text-sm text-muted-foreground">
            Chronological, latest week first.
          </p>
        </div>
        {ordered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No weekly reviews yet.
            </CardContent>
          </Card>
        ) : (
          ordered.map((review) => (
            <Card key={review.id} className="gap-3 py-4">
              <CardContent className="space-y-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">Week of {review.week_start}</p>
                  <span className="text-xs text-muted-foreground">
                    {review.learning_goal_id
                      ? (goalById.get(review.learning_goal_id)?.title ??
                        "Unavailable goal")
                      : "All goals"}
                  </span>
                </div>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Learned</dt>
                    <dd>{review.learned}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Can do now
                    </dt>
                    <dd>{review.can_do_now}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Main blocker
                    </dt>
                    <dd>{review.main_bottleneck}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Applied to ILTO
                    </dt>
                    <dd>{review.applied_to_project}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Next focus
                    </dt>
                    <dd className="font-medium text-primary">
                      {review.next_week_focus}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

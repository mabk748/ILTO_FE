import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock3, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import { planStudySchedule } from "@/lib/api/learning.ts";
import type {
  LearningGoal,
  Project,
  StudySchedule,
  StudySession,
} from "@/lib/api/types.ts";
import { learningQueryKeys } from "../learning-query-keys.ts";
import {
  currentWeekDays,
  learningPlanError,
  sessionTypeLabel,
} from "../learning-plan.ts";
import {
  StudyScheduleControls,
  StudySessionControls,
} from "./LearningPlanControls.tsx";

function PlanScheduleButton({
  schedule,
  startDate,
  endDate,
}: {
  schedule: StudySchedule;
  startDate: string;
  endDate: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    retry: false,
    mutationFn: () =>
      planStudySchedule(schedule.id, {
        start_date: startDate,
        end_date: endDate,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: learningQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!schedule.active || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Planning…" : "Plan this week"}
      </Button>
      {mutation.isSuccess && (
        <p className="text-[11px] text-muted-foreground">
          {mutation.data.length === 0
            ? "No new sessions created"
            : `${mutation.data.length} session created`}
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-xs text-destructive">
          {learningPlanError(mutation.error)}
        </p>
      )}
    </div>
  );
}

export default function WeeklyPlanView({
  schedules,
  sessions,
  goals,
  projects,
}: {
  schedules: readonly StudySchedule[];
  sessions: readonly StudySession[];
  goals: readonly LearningGoal[];
  projects: readonly Project[];
}) {
  const timeZone = useTimeZone();
  const days = currentWeekDays(new Date(), timeZone);
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const sessionsByDate = new Map<string, StudySession[]>();
  for (const session of sessions) {
    const current = sessionsByDate.get(session.date) ?? [];
    current.push(session);
    sessionsByDate.set(session.date, current);
  }
  for (const list of sessionsByDate.values()) {
    list.sort((left, right) => left.id.localeCompare(right.id));
  }
  const schedulesByWeekday = new Map<number, StudySchedule[]>();
  for (const schedule of schedules) {
    const current = schedulesByWeekday.get(schedule.weekday) ?? [];
    current.push(schedule);
    schedulesByWeekday.set(schedule.weekday, current);
  }
  const weekStart = days[0].date;
  const weekEnd = days[6].date;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Weekly plan</h2>
          <p className="text-sm text-muted-foreground">
            Edit recurring templates, then explicitly plan their dated sessions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StudyScheduleControls goals={goals} projects={projects} />
          <StudySessionControls
            goals={goals}
            projects={projects}
            label="Plan one-off session"
          />
        </div>
      </div>

      {goals.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Create a learning goal before planning study sessions.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day, weekday) => {
          const daySessions = sessionsByDate.get(day.date) ?? [];
          const daySchedules = schedulesByWeekday.get(weekday) ?? [];
          return (
            <section
              key={day.date}
              aria-labelledby={`learning-day-${day.date}`}
              className="min-w-0 rounded-xl border bg-card p-3"
            >
              <div className="mb-3 border-b pb-2">
                <h3 id={`learning-day-${day.date}`} className="font-semibold">
                  {day.shortLabel}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {day.label.replace(`${day.shortLabel}, `, "")}
                </p>
              </div>
              <div className="space-y-3">
                {daySchedules.map((schedule) => (
                  <article
                    key={schedule.id}
                    className="space-y-2 rounded-lg border border-dashed border-primary/40 p-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <Repeat2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {goalById.get(schedule.learning_goal_id)?.title ??
                            "Unavailable goal"}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {sessionTypeLabel(schedule.session_type)} ·{" "}
                          {schedule.planned_minutes} min
                        </p>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs">{schedule.topic}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Weekly template ·{" "}
                      {schedule.active ? "Active" : "Inactive"}
                    </p>
                    <StudyScheduleControls
                      goals={goals}
                      projects={projects}
                      schedule={schedule}
                    />
                    <PlanScheduleButton
                      schedule={schedule}
                      startDate={weekStart}
                      endDate={weekEnd}
                    />
                  </article>
                ))}

                {daySessions.map((session) => (
                  <article
                    key={session.id}
                    className="space-y-2 rounded-lg border border-border/70 p-2.5"
                  >
                    <div className="flex items-start gap-2">
                      {session.completed ? (
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-green-400"
                          aria-label="Completed"
                        />
                      ) : (
                        <Circle
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                          aria-label="Not completed"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {goalById.get(session.learning_goal_id)?.title ??
                            "Unavailable goal"}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {sessionTypeLabel(session.session_type)}
                        </p>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs">{session.topic}</p>
                    <dl className="space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between gap-2">
                        <dt>Planned</dt>
                        <dd>{session.planned_minutes} min</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Actual</dt>
                        <dd>{session.actual_minutes} min</dd>
                      </div>
                    </dl>
                    <StudySessionControls
                      goals={goals}
                      projects={projects}
                      session={session}
                    />
                  </article>
                ))}

                {daySchedules.length === 0 && daySessions.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No template or session
                  </p>
                )}
                {goals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <StudyScheduleControls
                      goals={goals}
                      projects={projects}
                      defaults={{ weekday: weekday.toString() }}
                      label="Add recurring"
                    />
                    <StudySessionControls
                      goals={goals}
                      projects={projects}
                      defaults={{ date: day.date }}
                      label="Add one-off"
                    />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" />
        Calendar dates follow {timeZone}. Templates do not create sessions until
        you choose Plan this week.
      </p>
    </div>
  );
}

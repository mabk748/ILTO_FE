import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import type {
  AssessmentAttempt,
  LearningBottleneck,
  LearningGoal,
  LearningMilestone,
  Project,
  StudySchedule,
  StudySession,
  WeeklyReview,
} from "@/lib/api/types.ts";
import {
  createAssessmentAttempt,
  createBottleneck,
  createLearningGoal,
  createLearningMilestone,
  createStudySchedule,
  createStudySession,
  createWeeklyReview,
  deleteLearningGoal,
  deleteLearningMilestone,
  deleteStudySchedule,
  deleteStudySession,
  completeStudySession,
  updateBottleneck,
  updateLearningGoal,
  updateLearningMilestone,
  updateStudySchedule,
  updateStudySession,
  updateWeeklyReview,
} from "@/lib/api/learning.ts";
import {
  assessmentDraft,
  assessmentInput,
  assessmentTypes,
  bottleneckDraft,
  bottleneckInput,
  bottleneckStatuses,
  changedLearningFields,
  goalDraft,
  goalInput,
  learningGoalStatuses,
  learningGoalTypes,
  learningMilestoneStatuses,
  learningPlanError,
  learningPriorities,
  milestoneDraft,
  milestoneInput,
  reviewDraft,
  reviewInput,
  scheduleDraft,
  scheduleInput,
  sessionDraft,
  sessionInput,
  studySessionTypes,
  type AssessmentDraft,
  type BottleneckDraft,
  type LearningGoalDraft,
  type MilestoneDraft,
  type StudyScheduleDraft,
  type StudySessionDraft,
  type WeeklyReviewDraft,
} from "../learning-plan.ts";
import { learningQueryKeys } from "../learning-query-keys.ts";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
const textareaClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

async function refreshLearning(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: learningQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  ]);
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ErrorMessage({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="text-sm text-destructive">
      {learningPlanError(error)}
    </p>
  ) : null;
}

function GoalSelect({
  id,
  goals,
  value,
  onChange,
}: {
  id: string;
  goals: readonly LearningGoal[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label="Learning goal">
      <select
        id={id}
        className={selectClass}
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>
          Choose a learning goal
        </option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ProjectSelect({
  id,
  projects,
  value,
  onChange,
}: {
  id: string;
  projects: readonly Project[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label="Linked project (optional)">
      <select
        id={id}
        className={selectClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">No linked project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface GoalControlsProps {
  goal?: LearningGoal;
  projects: readonly Project[];
  compact?: boolean;
}

export function LearningGoalControls({
  goal,
  projects,
  compact = false,
}: GoalControlsProps) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const id = useId();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<LearningGoalDraft>(() =>
    goalDraft(goal, timeZone),
  );
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (mode === "delete") {
        if (!goal) throw new Error("Select a saved learning goal first.");
        return deleteLearningGoal(goal.id);
      }
      const input = goalInput(values);
      return goal
        ? updateLearningGoal(goal.id, changedLearningFields(input, goal))
        : createLearningGoal(input);
    },
  });
  const change = (field: keyof LearningGoalDraft, value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));
  const open = (nextMode: "edit" | "delete") => {
    setValues(goalDraft(goal, timeZone));
    mutation.reset();
    setMode(nextMode);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await refreshLearning(queryClient);
      setMode(null);
    } catch {
      // Keep the editor open with its current input and confirmed error.
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={goal || compact ? "outline" : "default"}
          onClick={() => open("edit")}
        >
          {!goal && <Plus className="h-4 w-4" />}
          {goal ? "Edit goal" : "New goal"}
        </Button>
        {goal && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => open("delete")}
          >
            Delete goal
          </Button>
        )}
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(openState) => !openState && setMode(null)}
      >
        {mode && (
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {mode === "delete" ? "Delete" : goal ? "Edit" : "Create"}{" "}
                learning goal
              </DialogTitle>
              <DialogDescription>
                {mode === "delete"
                  ? "Deletion waits for backend confirmation and also removes this goal's schedules, sessions, assessments, bottlenecks, and milestones."
                  : "Dates are calendar dates. Empty target, exam, phase, and project selections are saved as null."}
              </DialogDescription>
            </DialogHeader>
            <form
              noValidate
              className="space-y-4"
              onSubmit={(event) => void submit(event)}
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                {mode === "edit" && (
                  <>
                    <Field id={`${id}-title`} label="Title">
                      <Input
                        id={`${id}-title`}
                        required
                        maxLength={200}
                        value={values.title}
                        onChange={(event) =>
                          change("title", event.target.value)
                        }
                      />
                    </Field>
                    <Field id={`${id}-provider`} label="Provider">
                      <Input
                        id={`${id}-provider`}
                        required
                        maxLength={200}
                        value={values.provider}
                        onChange={(event) =>
                          change("provider", event.target.value)
                        }
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id={`${id}-type`} label="Type">
                        <select
                          id={`${id}-type`}
                          className={selectClass}
                          value={values.type}
                          onChange={(event) =>
                            change("type", event.target.value)
                          }
                        >
                          {learningGoalTypes.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field id={`${id}-status`} label="Status">
                        <select
                          id={`${id}-status`}
                          className={selectClass}
                          value={values.status}
                          onChange={(event) =>
                            change("status", event.target.value)
                          }
                        >
                          {learningGoalStatuses.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field id={`${id}-start`} label="Start date">
                        <Input
                          id={`${id}-start`}
                          type="date"
                          required
                          value={values.start_date}
                          onChange={(event) =>
                            change("start_date", event.target.value)
                          }
                        />
                      </Field>
                      <Field id={`${id}-target`} label="Target date (optional)">
                        <Input
                          id={`${id}-target`}
                          type="date"
                          value={values.target_date}
                          onChange={(event) =>
                            change("target_date", event.target.value)
                          }
                        />
                      </Field>
                      <Field id={`${id}-exam`} label="Exam date (optional)">
                        <Input
                          id={`${id}-exam`}
                          type="date"
                          value={values.exam_date}
                          onChange={(event) =>
                            change("exam_date", event.target.value)
                          }
                        />
                      </Field>
                      <Field id={`${id}-phase`} label="Phase (optional)">
                        <Input
                          id={`${id}-phase`}
                          maxLength={100}
                          value={values.phase}
                          onChange={(event) =>
                            change("phase", event.target.value)
                          }
                        />
                      </Field>
                      <Field id={`${id}-priority`} label="Priority">
                        <select
                          id={`${id}-priority`}
                          className={selectClass}
                          value={values.priority}
                          onChange={(event) =>
                            change("priority", event.target.value)
                          }
                        >
                          {learningPriorities.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field id={`${id}-description`} label="Description">
                      <textarea
                        id={`${id}-description`}
                        className={textareaClass}
                        rows={3}
                        required
                        maxLength={4000}
                        value={values.description}
                        onChange={(event) =>
                          change("description", event.target.value)
                        }
                      />
                    </Field>
                    <ProjectSelect
                      id={`${id}-project`}
                      projects={projects}
                      value={values.linked_project_id}
                      onChange={(value) => change("linked_project_id", value)}
                    />
                  </>
                )}
                <ErrorMessage error={mutation.error} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={mode === "delete" ? "destructive" : "default"}
                  >
                    {mutation.isPending
                      ? "Saving…"
                      : mode === "delete"
                        ? "Confirm delete"
                        : "Save goal"}
                  </Button>
                </div>
              </fieldset>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

interface ScheduleControlsProps {
  goals: readonly LearningGoal[];
  projects: readonly Project[];
  schedule?: StudySchedule;
  defaults?: Partial<StudyScheduleDraft>;
  label?: string;
}

export function StudyScheduleControls({
  goals,
  projects,
  schedule,
  defaults,
  label,
}: ScheduleControlsProps) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const id = useId();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const makeDraft = () => scheduleDraft(schedule, defaults, timeZone);
  const [values, setValues] = useState<StudyScheduleDraft>(makeDraft);
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (mode === "delete") {
        if (!schedule) throw new Error("Select a saved study schedule first.");
        return deleteStudySchedule(schedule.id);
      }
      const input = scheduleInput(values);
      if (!schedule) return createStudySchedule(input);
      return updateStudySchedule(
        schedule.id,
        changedLearningFields(input, schedule),
      );
    },
  });
  const change = (field: keyof StudyScheduleDraft, value: string | boolean) =>
    setValues((previous) => ({ ...previous, [field]: value }));
  const open = (nextMode: "edit" | "delete") => {
    setValues(makeDraft());
    mutation.reset();
    setMode(nextMode);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await refreshLearning(queryClient);
      setMode(null);
    } catch {
      // Retain the editable weekly template and the confirmed error.
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => open("edit")}
        >
          {!schedule && <Plus className="h-4 w-4" />}
          {label ?? (schedule ? "Edit schedule" : "Add recurring session")}
        </Button>
        {schedule && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => open("delete")}
          >
            Delete
          </Button>
        )}
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(openState) => !openState && setMode(null)}
      >
        {mode && (
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {mode === "delete" ? "Delete" : schedule ? "Edit" : "Add"}{" "}
                weekly schedule
              </DialogTitle>
              <DialogDescription>
                This is an editable weekly template. Planning it materializes
                dated sessions; it does not run automatically. Once sessions
                exist, the backend may require a replacement template to change
                the weekday.
              </DialogDescription>
            </DialogHeader>
            <form
              noValidate
              className="space-y-4"
              onSubmit={(event) => void submit(event)}
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                {mode === "edit" && (
                  <>
                    {schedule ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Learning goal</p>
                        <p className="rounded-md border px-3 py-2 text-sm">
                          {goals.find(
                            (goal) => goal.id === schedule.learning_goal_id,
                          )?.title ?? "Deleted or unavailable goal"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          A saved weekly schedule cannot be moved to another
                          goal.
                        </p>
                      </div>
                    ) : (
                      <GoalSelect
                        id={`${id}-goal`}
                        goals={goals}
                        value={values.learning_goal_id}
                        onChange={(value) => change("learning_goal_id", value)}
                      />
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id={`${id}-weekday`} label="Weekday">
                        <select
                          id={`${id}-weekday`}
                          className={selectClass}
                          value={values.weekday}
                          onChange={(event) =>
                            change("weekday", event.target.value)
                          }
                        >
                          {[
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                            "Sunday",
                          ].map((day, index) => (
                            <option key={day} value={index}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field id={`${id}-type`} label="Session type">
                        <select
                          id={`${id}-type`}
                          className={selectClass}
                          value={values.session_type}
                          onChange={(event) =>
                            change("session_type", event.target.value)
                          }
                        >
                          {studySessionTypes.map((value) => (
                            <option key={value} value={value}>
                              {value.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field id={`${id}-minutes`} label="Planned minutes">
                        <Input
                          id={`${id}-minutes`}
                          type="number"
                          min="0"
                          max="1000000"
                          step="1"
                          required
                          value={values.planned_minutes}
                          onChange={(event) =>
                            change("planned_minutes", event.target.value)
                          }
                        />
                      </Field>
                      <Field id={`${id}-start`} label="Starts on">
                        <Input
                          id={`${id}-start`}
                          type="date"
                          required
                          value={values.start_date}
                          onChange={(event) =>
                            change("start_date", event.target.value)
                          }
                        />
                      </Field>
                      <Field id={`${id}-end`} label="Ends on (optional)">
                        <Input
                          id={`${id}-end`}
                          type="date"
                          value={values.end_date}
                          onChange={(event) =>
                            change("end_date", event.target.value)
                          }
                        />
                      </Field>
                    </div>
                    <Field id={`${id}-topic`} label="Topic / focus">
                      <Input
                        id={`${id}-topic`}
                        required
                        maxLength={300}
                        value={values.topic}
                        onChange={(event) =>
                          change("topic", event.target.value)
                        }
                      />
                    </Field>
                    <Field id={`${id}-notes`} label="Notes">
                      <textarea
                        id={`${id}-notes`}
                        rows={3}
                        maxLength={4000}
                        className={textareaClass}
                        value={values.notes}
                        onChange={(event) =>
                          change("notes", event.target.value)
                        }
                      />
                    </Field>
                    <ProjectSelect
                      id={`${id}-project`}
                      projects={projects}
                      value={values.linked_project_id}
                      onChange={(value) => change("linked_project_id", value)}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={values.active}
                        onChange={(event) =>
                          change("active", event.target.checked)
                        }
                      />
                      Active
                    </label>
                  </>
                )}
                <ErrorMessage error={mutation.error} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={mode === "delete" ? "destructive" : "default"}
                  >
                    {mutation.isPending
                      ? "Saving…"
                      : mode === "delete"
                        ? "Confirm delete"
                        : "Save schedule"}
                  </Button>
                </div>
              </fieldset>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

interface SessionControlsProps {
  goals: readonly LearningGoal[];
  projects: readonly Project[];
  session?: StudySession;
  defaults?: Partial<StudySessionDraft>;
  label?: string;
  completeMode?: boolean;
}

export function StudySessionControls({
  goals,
  projects,
  session,
  defaults,
  label,
  completeMode = false,
}: SessionControlsProps) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const id = useId();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const makeDraft = () => {
    const draft = sessionDraft(session, defaults, timeZone);
    if (completeMode && !draft.completed) {
      draft.completed = true;
      if (draft.actual_minutes === "0")
        draft.actual_minutes = draft.planned_minutes;
    }
    return draft;
  };
  const [values, setValues] = useState<StudySessionDraft>(makeDraft);
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (mode === "delete") {
        if (!session) throw new Error("Select a saved study session first.");
        return deleteStudySession(session.id);
      }
      const input = sessionInput(values);
      if (completeMode) {
        if (!session) throw new Error("Select a saved study session first.");
        return completeStudySession(session.id, {
          actual_minutes: input.actual_minutes,
          notes: input.notes,
        });
      }
      return session
        ? updateStudySession(session.id, changedLearningFields(input, session))
        : createStudySession(input);
    },
  });
  const change = (field: keyof StudySessionDraft, value: string | boolean) =>
    setValues((previous) => ({ ...previous, [field]: value }));
  const open = (nextMode: "edit" | "delete") => {
    setValues(makeDraft());
    mutation.reset();
    setMode(nextMode);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await refreshLearning(queryClient);
      setMode(null);
    } catch {
      // Retain form and error.
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={session ? "outline" : "default"}
          onClick={() => open("edit")}
        >
          {!session && <Plus className="h-4 w-4" />}
          {label ?? (session ? "Edit session" : "Plan session")}
        </Button>
        {session && !completeMode && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => open("delete")}
          >
            Delete
          </Button>
        )}
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(openState) => !openState && setMode(null)}
      >
        {mode && (
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {mode === "delete"
                  ? "Delete"
                  : completeMode
                    ? "Complete and log"
                    : session
                      ? "Log or edit"
                      : "Plan"}{" "}
                study session
              </DialogTitle>
              <DialogDescription>
                Study dates are calendar dates in your configured {timeZone}{" "}
                time zone. Zero actual minutes and false completion are
                preserved.
              </DialogDescription>
            </DialogHeader>
            <form
              noValidate
              className="space-y-4"
              onSubmit={(event) => void submit(event)}
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                {mode === "edit" &&
                  (completeMode ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Planned: {values.planned_minutes} minutes ·{" "}
                        {values.topic}
                      </p>
                      <Field id={`${id}-actual`} label="Actual minutes">
                        <Input
                          id={`${id}-actual`}
                          type="number"
                          min="0"
                          max="1000000"
                          step="1"
                          required
                          value={values.actual_minutes}
                          onChange={(event) =>
                            change("actual_minutes", event.target.value)
                          }
                        />
                      </Field>
                      <Field id={`${id}-notes`} label="Session notes">
                        <textarea
                          id={`${id}-notes`}
                          rows={3}
                          maxLength={4000}
                          className={textareaClass}
                          value={values.notes}
                          onChange={(event) =>
                            change("notes", event.target.value)
                          }
                        />
                      </Field>
                    </>
                  ) : (
                    <>
                      <GoalSelect
                        id={`${id}-goal`}
                        goals={goals}
                        value={values.learning_goal_id}
                        onChange={(value) => change("learning_goal_id", value)}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field id={`${id}-date`} label="Date">
                          <Input
                            id={`${id}-date`}
                            type="date"
                            required
                            value={values.date}
                            onChange={(event) =>
                              change("date", event.target.value)
                            }
                          />
                        </Field>
                        <Field id={`${id}-type`} label="Session type">
                          <select
                            id={`${id}-type`}
                            className={selectClass}
                            value={values.session_type}
                            onChange={(event) =>
                              change("session_type", event.target.value)
                            }
                          >
                            {studySessionTypes.map((value) => (
                              <option key={value} value={value}>
                                {value.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field id={`${id}-planned`} label="Planned minutes">
                          <Input
                            id={`${id}-planned`}
                            type="number"
                            min="0"
                            max="1000000"
                            step="1"
                            required
                            value={values.planned_minutes}
                            onChange={(event) =>
                              change("planned_minutes", event.target.value)
                            }
                          />
                        </Field>
                        <Field id={`${id}-actual`} label="Actual minutes">
                          <Input
                            id={`${id}-actual`}
                            type="number"
                            min="0"
                            max="1000000"
                            step="1"
                            required
                            value={values.actual_minutes}
                            onChange={(event) =>
                              change("actual_minutes", event.target.value)
                            }
                          />
                        </Field>
                      </div>
                      <Field id={`${id}-topic`} label="Topic / current focus">
                        <Input
                          id={`${id}-topic`}
                          required
                          maxLength={300}
                          value={values.topic}
                          onChange={(event) =>
                            change("topic", event.target.value)
                          }
                        />
                      </Field>
                      <Field id={`${id}-notes`} label="Notes">
                        <textarea
                          id={`${id}-notes`}
                          rows={3}
                          maxLength={4000}
                          className={textareaClass}
                          value={values.notes}
                          onChange={(event) =>
                            change("notes", event.target.value)
                          }
                        />
                      </Field>
                      <ProjectSelect
                        id={`${id}-project`}
                        projects={projects}
                        value={values.linked_project_id}
                        onChange={(value) => change("linked_project_id", value)}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={values.completed}
                          onChange={(event) =>
                            change("completed", event.target.checked)
                          }
                        />
                        Completed
                      </label>
                    </>
                  ))}
                <ErrorMessage error={mutation.error} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={mode === "delete" ? "destructive" : "default"}
                  >
                    {mutation.isPending
                      ? "Saving…"
                      : mode === "delete"
                        ? "Confirm delete"
                        : completeMode
                          ? "Complete session"
                          : "Save session"}
                  </Button>
                </div>
              </fieldset>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

export function BottleneckEditor({
  goals,
  bottleneck,
  defaults,
  label,
}: {
  goals: readonly LearningGoal[];
  bottleneck?: LearningBottleneck;
  defaults?: Partial<BottleneckDraft>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<BottleneckDraft>(() =>
    bottleneckDraft(bottleneck, defaults),
  );
  const mutation = useMutation({
    retry: false,
    mutationFn: () => {
      const input = bottleneckInput(values);
      return bottleneck
        ? updateBottleneck(
            bottleneck.id,
            changedLearningFields(input, bottleneck),
          )
        : createBottleneck(input);
    },
  });
  const change = (field: keyof BottleneckDraft, value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await refreshLearning(queryClient);
      setOpen(false);
    } catch {
      // Retain draft.
    }
  };
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setValues(bottleneckDraft(bottleneck, defaults));
          mutation.reset();
          setOpen(true);
        }}
      >
        {!bottleneck && <Plus className="h-4 w-4" />}
        {label ?? (bottleneck ? "Edit" : "Add bottleneck")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bottleneck ? "Edit" : "Add"} bottleneck</DialogTitle>
            <DialogDescription>
              Capture one specific weak area so it can become the next study
              action.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={(event) => void submit(event)}
          >
            <fieldset disabled={mutation.isPending} className="space-y-4">
              {bottleneck ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Learning goal</p>
                  <p className="rounded-md border px-3 py-2 text-sm">
                    {goals.find(
                      (goal) => goal.id === bottleneck.learning_goal_id,
                    )?.title ?? "Deleted or unavailable goal"}
                  </p>
                </div>
              ) : (
                <GoalSelect
                  id={`${id}-goal`}
                  goals={goals}
                  value={values.learning_goal_id}
                  onChange={(value) => change("learning_goal_id", value)}
                />
              )}
              <Field id={`${id}-topic`} label="Topic / domain">
                <Input
                  id={`${id}-topic`}
                  required
                  maxLength={300}
                  value={values.topic}
                  onChange={(event) => change("topic", event.target.value)}
                />
              </Field>
              <Field id={`${id}-description`} label="What needs improvement?">
                <textarea
                  id={`${id}-description`}
                  rows={3}
                  maxLength={4000}
                  required
                  className={textareaClass}
                  value={values.description}
                  onChange={(event) =>
                    change("description", event.target.value)
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${id}-priority`} label="Priority">
                  <select
                    id={`${id}-priority`}
                    className={selectClass}
                    value={values.priority}
                    onChange={(event) => change("priority", event.target.value)}
                  >
                    {learningPriorities.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={`${id}-status`} label="Status">
                  <select
                    id={`${id}-status`}
                    className={selectClass}
                    value={values.status}
                    onChange={(event) => change("status", event.target.value)}
                  >
                    {bottleneckStatuses.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <ErrorMessage error={mutation.error} />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {mutation.isPending ? "Saving…" : "Save bottleneck"}
                </Button>
              </div>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AssessmentEntry({ goals }: { goals: readonly LearningGoal[] }) {
  const id = useId();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AssessmentDraft>(() =>
    assessmentDraft(undefined, goals[0]?.id, timeZone),
  );
  const [saved, setSaved] = useState<AssessmentAttempt | null>(null);
  const mutation = useMutation({
    retry: false,
    mutationFn: () => createAssessmentAttempt(assessmentInput(values)),
  });
  const change = (field: keyof AssessmentDraft, value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = await mutation.mutateAsync();
      setSaved(result);
      await refreshLearning(queryClient);
    } catch {
      // Preserve the attempted assessment.
    }
  };
  if (goals.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Create a learning goal before recording an assessment.
      </p>
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
      <form
        noValidate
        className="space-y-4 rounded-xl border bg-card p-5"
        onSubmit={(event) => void submit(event)}
      >
        <div>
          <h2 className="font-semibold">Log assessment</h2>
          <p className="text-sm text-muted-foreground">
            Fast entry for a baseline, question set, mock exam, or real exam.
          </p>
        </div>
        <fieldset disabled={mutation.isPending} className="space-y-4">
          <GoalSelect
            id={`${id}-goal`}
            goals={goals}
            value={values.learning_goal_id}
            onChange={(value) => change("learning_goal_id", value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-type`} label="Assessment type">
              <select
                id={`${id}-type`}
                className={selectClass}
                value={values.assessment_type}
                onChange={(event) =>
                  change("assessment_type", event.target.value)
                }
              >
                {assessmentTypes.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`${id}-date`} label="Date">
              <Input
                id={`${id}-date`}
                type="date"
                required
                value={values.date}
                onChange={(event) => change("date", event.target.value)}
              />
            </Field>
            <Field id={`${id}-score`} label="Score %">
              <Input
                id={`${id}-score`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                value={values.score_percent}
                onChange={(event) =>
                  change("score_percent", event.target.value)
                }
              />
            </Field>
            <Field id={`${id}-duration`} label="Duration minutes (optional)">
              <Input
                id={`${id}-duration`}
                type="number"
                min="1"
                step="1"
                value={values.duration_minutes}
                onChange={(event) =>
                  change("duration_minutes", event.target.value)
                }
              />
            </Field>
          </div>
          <Field id={`${id}-source`} label="Source (optional)">
            <Input
              id={`${id}-source`}
              maxLength={300}
              value={values.source}
              onChange={(event) => change("source", event.target.value)}
            />
          </Field>
          <Field id={`${id}-notes`} label="Notes">
            <textarea
              id={`${id}-notes`}
              rows={3}
              maxLength={4000}
              className={textareaClass}
              value={values.notes}
              onChange={(event) => change("notes", event.target.value)}
            />
          </Field>
          <ErrorMessage error={mutation.error} />
          <Button type="submit">
            {mutation.isPending ? "Saving…" : "Save assessment"}
          </Button>
        </fieldset>
      </form>
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Weak areas</h2>
        {saved ? (
          <div className="mt-3 space-y-3">
            <p className="text-3xl font-mono font-bold">
              {saved.score_percent}%
            </p>
            <p className="text-sm text-muted-foreground">
              Assessment saved. Add each weak area as a separate bottleneck.
            </p>
            <BottleneckEditor
              goals={goals}
              defaults={{
                learning_goal_id: saved.learning_goal_id,
                assessment_attempt_id: saved.id,
              }}
              label="Add weak area"
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Save the score first, then record its bottlenecks using the returned
            assessment ID.
          </p>
        )}
      </div>
    </div>
  );
}

export function MilestoneControls({
  goals,
  milestone,
  learningGoalId,
}: {
  goals: readonly LearningGoal[];
  milestone?: LearningMilestone;
  learningGoalId?: string;
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const id = useId();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<MilestoneDraft>(() =>
    milestoneDraft(milestone, learningGoalId, timeZone),
  );
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (mode === "delete") {
        if (!milestone) throw new Error("Select a saved milestone first.");
        return deleteLearningMilestone(milestone.id);
      }
      const input = milestoneInput(values);
      return milestone
        ? updateLearningMilestone(
            milestone.id,
            changedLearningFields(input, milestone),
          )
        : createLearningMilestone(input);
    },
  });
  const change = (field: keyof MilestoneDraft, value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await refreshLearning(queryClient);
      setMode(null);
    } catch {
      // Retain draft.
    }
  };
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setValues(milestoneDraft(milestone, learningGoalId, timeZone));
            mutation.reset();
            setMode("edit");
          }}
        >
          {!milestone && <Plus className="h-4 w-4" />}
          {milestone ? "Edit" : "Add milestone"}
        </Button>
        {milestone && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMode("delete")}
          >
            Delete
          </Button>
        )}
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(openState) => !openState && setMode(null)}
      >
        {mode && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {mode === "delete" ? "Delete" : milestone ? "Edit" : "Add"}{" "}
                milestone
              </DialogTitle>
              <DialogDescription>
                Milestones keep the plan concrete without creating a separate
                roadmap engine.
              </DialogDescription>
            </DialogHeader>
            <form
              noValidate
              className="space-y-4"
              onSubmit={(event) => void submit(event)}
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                {mode === "edit" && (
                  <>
                    <GoalSelect
                      id={`${id}-goal`}
                      goals={goals}
                      value={values.learning_goal_id}
                      onChange={(value) => change("learning_goal_id", value)}
                    />
                    <Field id={`${id}-title`} label="Title">
                      <Input
                        id={`${id}-title`}
                        required
                        maxLength={300}
                        value={values.title}
                        onChange={(event) =>
                          change("title", event.target.value)
                        }
                      />
                    </Field>
                    <Field id={`${id}-target`} label="Target date">
                      <Input
                        id={`${id}-target`}
                        type="date"
                        required
                        value={values.target_date}
                        onChange={(event) =>
                          change("target_date", event.target.value)
                        }
                      />
                    </Field>
                    <Field id={`${id}-status`} label="Status">
                      <select
                        id={`${id}-status`}
                        className={selectClass}
                        value={values.status}
                        onChange={(event) =>
                          change("status", event.target.value)
                        }
                      >
                        {learningMilestoneStatuses.map((value) => (
                          <option key={value} value={value}>
                            {value.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
                <ErrorMessage error={mutation.error} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={mode === "delete" ? "destructive" : "default"}
                  >
                    {mutation.isPending
                      ? "Saving…"
                      : mode === "delete"
                        ? "Confirm delete"
                        : "Save milestone"}
                  </Button>
                </div>
              </fieldset>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

export function WeeklyReviewEditor({
  goals,
  review,
}: {
  goals: readonly LearningGoal[];
  review?: WeeklyReview;
}) {
  const id = useId();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<WeeklyReviewDraft>(() =>
    reviewDraft(review, undefined, timeZone),
  );
  const mutation = useMutation({
    retry: false,
    mutationFn: () => {
      const input = reviewInput(values);
      return review
        ? updateWeeklyReview(review.id, changedLearningFields(input, review))
        : createWeeklyReview(input);
    },
  });
  const change = (field: keyof WeeklyReviewDraft, value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await refreshLearning(queryClient);
      if (!review) setValues(reviewDraft(undefined, undefined, timeZone));
    } catch {
      // Retain answers on failure.
    }
  };
  const prompt = (field: keyof WeeklyReviewDraft, label: string) => (
    <Field id={`${id}-${field}`} label={label}>
      <textarea
        id={`${id}-${field}`}
        rows={2}
        maxLength={4000}
        className={textareaClass}
        value={values[field]}
        onChange={(event) => change(field, event.target.value)}
      />
    </Field>
  );
  return (
    <form
      noValidate
      className="space-y-4 rounded-xl border bg-card p-5"
      onSubmit={(event) => void submit(event)}
    >
      <div>
        <h2 className="font-semibold">
          {review ? "Edit weekly review" : "Weekly review"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Five prompts, focused on evidence and next action.
        </p>
      </div>
      <fieldset disabled={mutation.isPending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-week`} label="Week starting">
            <Input
              id={`${id}-week`}
              type="date"
              required
              value={values.week_start}
              onChange={(event) => change("week_start", event.target.value)}
            />
          </Field>
          <Field id={`${id}-goal`} label="Learning goal (optional)">
            <select
              id={`${id}-goal`}
              className={selectClass}
              value={values.learning_goal_id}
              onChange={(event) =>
                change("learning_goal_id", event.target.value)
              }
            >
              <option value="">All learning goals</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {prompt("learned", "What did I learn this week?")}
        {prompt(
          "can_do_now",
          "What can I now do that I couldn't do last week?",
        )}
        {prompt("main_bottleneck", "What is currently blocking the exam?")}
        {prompt("applied_to_project", "What did I apply to ILTO?")}
        {prompt("next_week_focus", "What should I focus on next week?")}
        <ErrorMessage error={mutation.error} />
        <Button type="submit">
          {mutation.isPending ? "Saving…" : "Save weekly review"}
        </Button>
      </fieldset>
    </form>
  );
}

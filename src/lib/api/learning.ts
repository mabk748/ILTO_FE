/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId, getArray } from "./resource.ts";
import type {
  AssessmentAttempt,
  LearningBottleneck,
  LearningDashboard,
  LearningGoal,
  LearningGoalProgress,
  LearningMilestone,
  LearningRoadmap,
  ReadingEntry,
  SkillNode,
  SpacedRepetitionCard,
  StudySchedule,
  StudySession,
  WeeklyReview,
} from "./types.ts";

export function getRoadmaps(
  options: ApiRequestOptions = {},
): Promise<LearningRoadmap[]> {
  return getArray<LearningRoadmap>(`/learning/roadmaps`, options);
}

export function getSkills(
  roadmapId?: string,
  options: ApiRequestOptions = {},
): Promise<SkillNode[]> {
  return getArray<SkillNode>(`/learning/skills`, {
    ...options,
    query: { ...options.query, ...{ roadmap_id: roadmapId } },
  });
}

export function getDueCards(
  options: ApiRequestOptions = {},
): Promise<SpacedRepetitionCard[]> {
  return getArray<SpacedRepetitionCard>(`/learning/sr-cards`, {
    ...options,
    query: { ...options.query, ...{ due: true } },
  });
}

export function getAllCards(
  options: ApiRequestOptions = {},
): Promise<SpacedRepetitionCard[]> {
  return getArray<SpacedRepetitionCard>(`/learning/sr-cards`, options);
}

export function getReadingList(
  options: ApiRequestOptions = {},
): Promise<ReadingEntry[]> {
  return getArray<ReadingEntry>(`/learning/reading`, options);
}

export type CreateRoadmapInput = Omit<
  LearningRoadmap,
  "id" | "created_at" | "skills_total" | "skills_completed"
>;
export type UpdateRoadmapInput = Partial<CreateRoadmapInput>;

export type CreateSkillInput = Pick<
  SkillNode,
  | "roadmap_id"
  | "name"
  | "category"
  | "current_level"
  | "target_level"
  | "gap_score"
  | "resources"
>;
export type UpdateSkillInput = Partial<CreateSkillInput>;

const SKILL_WRITABLE_FIELDS = [
  "roadmap_id",
  "name",
  "category",
  "current_level",
  "target_level",
  "gap_score",
  "resources",
] as const satisfies readonly (keyof CreateSkillInput)[];

function createSkillPayload(input: CreateSkillInput): CreateSkillInput {
  return {
    roadmap_id: input.roadmap_id,
    name: input.name,
    category: input.category,
    current_level: input.current_level,
    target_level: input.target_level,
    gap_score: input.gap_score,
    resources: input.resources,
  };
}

function updateSkillPayload(input: UpdateSkillInput): UpdateSkillInput {
  return Object.fromEntries(
    SKILL_WRITABLE_FIELDS.filter((field) => Object.hasOwn(input, field)).map(
      (field) => [field, input[field]],
    ),
  ) as UpdateSkillInput;
}

export function createRoadmap(
  input: CreateRoadmapInput,
  options: ApiRequestOptions = {},
): Promise<LearningRoadmap> {
  return apiClient.post<LearningRoadmap>("/learning/roadmaps", input, options);
}

export function updateRoadmap(
  id: string,
  input: UpdateRoadmapInput,
  options: ApiRequestOptions = {},
): Promise<LearningRoadmap> {
  return apiClient.patch<LearningRoadmap>(
    `/learning/roadmaps/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteRoadmap(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/learning/roadmaps/${encodeId(id)}`, options);
}

export function createSkill(
  input: CreateSkillInput,
  options: ApiRequestOptions = {},
): Promise<SkillNode> {
  return apiClient.post<SkillNode>(
    "/learning/skills",
    createSkillPayload(input),
    options,
  );
}

export function updateSkill(
  id: string,
  input: UpdateSkillInput,
  options: ApiRequestOptions = {},
): Promise<SkillNode> {
  return apiClient.patch<SkillNode>(
    `/learning/skills/${encodeId(id)}`,
    updateSkillPayload(input),
    options,
  );
}

export function deleteSkill(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/learning/skills/${encodeId(id)}`, options);
}

export type CreateReadingEntryInput = Omit<ReadingEntry, "id">;
export type UpdateReadingEntryInput = Partial<CreateReadingEntryInput>;

export function createReadingEntry(
  input: CreateReadingEntryInput,
  options: ApiRequestOptions = {},
): Promise<ReadingEntry> {
  return apiClient.post<ReadingEntry>("/learning/reading", input, options);
}

export function updateReadingEntry(
  id: string,
  input: UpdateReadingEntryInput,
  options: ApiRequestOptions = {},
): Promise<ReadingEntry> {
  return apiClient.patch<ReadingEntry>(
    `/learning/reading/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteReadingEntry(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/learning/reading/${encodeId(id)}`, options);
}

export function reviewCard(
  id: string,
  input: { reviewed_at: string },
  options: ApiRequestOptions = {},
): Promise<SpacedRepetitionCard> {
  return apiClient.post<SpacedRepetitionCard>(
    `/learning/sr-cards/${encodeId(id)}/reviews`,
    input,
    options,
  );
}

export function getLearningGoals(
  options: ApiRequestOptions = {},
): Promise<LearningGoal[]> {
  return getArray<LearningGoal>("/learning/goals", options);
}

export function getStudySessions(
  filters: { learningGoalId?: string } = {},
  options: ApiRequestOptions = {},
): Promise<StudySession[]> {
  return getArray<StudySession>("/learning/study-sessions", {
    ...options,
    query: {
      ...options.query,
      learning_goal_id: filters.learningGoalId,
    },
  });
}

export function getStudySchedules(
  learningGoalId?: string,
  options: ApiRequestOptions = {},
): Promise<StudySchedule[]> {
  return getArray<StudySchedule>("/learning/study-schedules", {
    ...options,
    query: { ...options.query, learning_goal_id: learningGoalId },
  });
}

export function getAssessmentAttempts(
  learningGoalId?: string,
  options: ApiRequestOptions = {},
): Promise<AssessmentAttempt[]> {
  return getArray<AssessmentAttempt>("/learning/assessments", {
    ...options,
    query: { ...options.query, learning_goal_id: learningGoalId },
  });
}

export function getBottlenecks(
  filters: {
    learningGoalId?: string;
    status?: LearningBottleneck["status"];
  } = {},
  options: ApiRequestOptions = {},
): Promise<LearningBottleneck[]> {
  return getArray<LearningBottleneck>("/learning/bottlenecks", {
    ...options,
    query: {
      ...options.query,
      learning_goal_id: filters.learningGoalId,
      status: filters.status,
    },
  });
}

export function getLearningMilestones(
  learningGoalId?: string,
  options: ApiRequestOptions = {},
): Promise<LearningMilestone[]> {
  return getArray<LearningMilestone>("/learning/milestones", {
    ...options,
    query: { ...options.query, learning_goal_id: learningGoalId },
  });
}

export function getWeeklyReviews(
  learningGoalId?: string,
  options: ApiRequestOptions = {},
): Promise<WeeklyReview[]> {
  return getArray<WeeklyReview>("/learning/weekly-reviews", {
    ...options,
    query: { ...options.query, learning_goal_id: learningGoalId },
  });
}

export function getLearningDashboard(
  options: ApiRequestOptions = {},
): Promise<LearningDashboard> {
  return apiClient.get<LearningDashboard>("/learning/dashboard", options);
}

export function getLearningGoalProgress(
  id: string,
  options: ApiRequestOptions = {},
): Promise<LearningGoalProgress> {
  return apiClient.get<LearningGoalProgress>(
    `/learning/goals/${encodeId(id)}/progress`,
    options,
  );
}

export type CreateLearningGoalInput = Pick<
  LearningGoal,
  | "title"
  | "provider"
  | "type"
  | "status"
  | "start_date"
  | "target_date"
  | "exam_date"
  | "phase"
  | "description"
  | "priority"
  | "linked_project_id"
>;
export type UpdateLearningGoalInput = Partial<CreateLearningGoalInput>;

export type CreateStudyScheduleInput = Pick<
  StudySchedule,
  | "learning_goal_id"
  | "weekday"
  | "session_type"
  | "planned_minutes"
  | "topic"
  | "notes"
  | "start_date"
  | "end_date"
  | "active"
  | "linked_project_id"
>;
export type UpdateStudyScheduleInput = Partial<
  Pick<
    StudySchedule,
    | "weekday"
    | "session_type"
    | "planned_minutes"
    | "topic"
    | "notes"
    | "start_date"
    | "end_date"
    | "active"
    | "linked_project_id"
  >
>;
export type PlanStudyScheduleInput = {
  start_date: string;
  end_date: string;
};

export type CreateStudySessionInput = Pick<
  StudySession,
  | "learning_goal_id"
  | "date"
  | "session_type"
  | "planned_minutes"
  | "actual_minutes"
  | "topic"
  | "notes"
  | "completed"
  | "linked_project_id"
  | "bottleneck_id"
  | "study_schedule_id"
>;
export type UpdateStudySessionInput = Partial<CreateStudySessionInput>;
export type CompleteStudySessionInput = Pick<
  StudySession,
  "actual_minutes" | "notes"
>;

export type CreateAssessmentAttemptInput = Pick<
  AssessmentAttempt,
  | "learning_goal_id"
  | "date"
  | "assessment_type"
  | "score_percent"
  | "source"
  | "notes"
  | "duration_minutes"
>;

export type CreateBottleneckInput = Pick<
  LearningBottleneck,
  | "learning_goal_id"
  | "assessment_attempt_id"
  | "topic"
  | "description"
  | "priority"
  | "status"
>;
export type UpdateBottleneckInput = Partial<
  Pick<
    LearningBottleneck,
    "assessment_attempt_id" | "topic" | "description" | "priority" | "status"
  >
>;

export type CreateLearningMilestoneInput = Pick<
  LearningMilestone,
  "learning_goal_id" | "title" | "target_date" | "status"
>;
export type UpdateLearningMilestoneInput =
  Partial<CreateLearningMilestoneInput>;

export type CreateWeeklyReviewInput = Pick<
  WeeklyReview,
  | "week_start"
  | "learning_goal_id"
  | "learned"
  | "can_do_now"
  | "main_bottleneck"
  | "applied_to_project"
  | "next_week_focus"
  | "notes"
>;
export type UpdateWeeklyReviewInput = Partial<CreateWeeklyReviewInput>;

function pickPresent<T extends object>(
  input: T,
  fields: readonly (keyof T)[],
): Partial<T> {
  return Object.fromEntries(
    fields
      .filter((field) => Object.hasOwn(input, field))
      .map((field) => [field, input[field]]),
  ) as Partial<T>;
}

const GOAL_FIELDS = [
  "title",
  "provider",
  "type",
  "status",
  "start_date",
  "target_date",
  "exam_date",
  "phase",
  "description",
  "priority",
  "linked_project_id",
] as const satisfies readonly (keyof CreateLearningGoalInput)[];

const SCHEDULE_CREATE_FIELDS = [
  "learning_goal_id",
  "weekday",
  "session_type",
  "planned_minutes",
  "topic",
  "notes",
  "start_date",
  "end_date",
  "active",
  "linked_project_id",
] as const satisfies readonly (keyof CreateStudyScheduleInput)[];

const SCHEDULE_UPDATE_FIELDS = [
  "weekday",
  "session_type",
  "planned_minutes",
  "topic",
  "notes",
  "start_date",
  "end_date",
  "active",
  "linked_project_id",
] as const satisfies readonly (keyof UpdateStudyScheduleInput)[];

const SESSION_FIELDS = [
  "learning_goal_id",
  "date",
  "session_type",
  "planned_minutes",
  "actual_minutes",
  "topic",
  "notes",
  "completed",
  "linked_project_id",
  "bottleneck_id",
  "study_schedule_id",
] as const satisfies readonly (keyof CreateStudySessionInput)[];

const BOTTLENECK_CREATE_FIELDS = [
  "learning_goal_id",
  "assessment_attempt_id",
  "topic",
  "description",
  "priority",
  "status",
] as const satisfies readonly (keyof CreateBottleneckInput)[];

const BOTTLENECK_UPDATE_FIELDS = [
  "assessment_attempt_id",
  "topic",
  "description",
  "priority",
  "status",
] as const satisfies readonly (keyof UpdateBottleneckInput)[];

const ASSESSMENT_FIELDS = [
  "learning_goal_id",
  "date",
  "assessment_type",
  "score_percent",
  "source",
  "notes",
  "duration_minutes",
] as const satisfies readonly (keyof CreateAssessmentAttemptInput)[];

const MILESTONE_FIELDS = [
  "learning_goal_id",
  "title",
  "target_date",
  "status",
] as const satisfies readonly (keyof CreateLearningMilestoneInput)[];

const REVIEW_FIELDS = [
  "week_start",
  "learning_goal_id",
  "learned",
  "can_do_now",
  "main_bottleneck",
  "applied_to_project",
  "next_week_focus",
  "notes",
] as const satisfies readonly (keyof CreateWeeklyReviewInput)[];

export function createLearningGoal(
  input: CreateLearningGoalInput,
  options: ApiRequestOptions = {},
): Promise<LearningGoal> {
  return apiClient.post<LearningGoal>(
    "/learning/goals",
    pickPresent(input, GOAL_FIELDS),
    options,
  );
}

export function updateLearningGoal(
  id: string,
  input: UpdateLearningGoalInput,
  options: ApiRequestOptions = {},
): Promise<LearningGoal> {
  return apiClient.patch<LearningGoal>(
    `/learning/goals/${encodeId(id)}`,
    pickPresent(input, GOAL_FIELDS),
    options,
  );
}

export function deleteLearningGoal(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/learning/goals/${encodeId(id)}`, options);
}

export function createStudySchedule(
  input: CreateStudyScheduleInput,
  options: ApiRequestOptions = {},
): Promise<StudySchedule> {
  return apiClient.post<StudySchedule>(
    "/learning/study-schedules",
    pickPresent(input, SCHEDULE_CREATE_FIELDS),
    options,
  );
}

export function updateStudySchedule(
  id: string,
  input: UpdateStudyScheduleInput,
  options: ApiRequestOptions = {},
): Promise<StudySchedule> {
  return apiClient.patch<StudySchedule>(
    `/learning/study-schedules/${encodeId(id)}`,
    pickPresent(input, SCHEDULE_UPDATE_FIELDS),
    options,
  );
}

export function planStudySchedule(
  id: string,
  input: PlanStudyScheduleInput,
  options: ApiRequestOptions = {},
): Promise<StudySession[]> {
  return apiClient.post<StudySession[]>(
    `/learning/study-schedules/${encodeId(id)}/plan`,
    pickPresent(input, ["start_date", "end_date"]),
    options,
  );
}

export function deleteStudySchedule(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/learning/study-schedules/${encodeId(id)}`, options);
}

export function createStudySession(
  input: CreateStudySessionInput,
  options: ApiRequestOptions = {},
): Promise<StudySession> {
  return apiClient.post<StudySession>(
    "/learning/study-sessions",
    pickPresent(input, SESSION_FIELDS),
    options,
  );
}

export function updateStudySession(
  id: string,
  input: UpdateStudySessionInput,
  options: ApiRequestOptions = {},
): Promise<StudySession> {
  return apiClient.patch<StudySession>(
    `/learning/study-sessions/${encodeId(id)}`,
    pickPresent(input, SESSION_FIELDS),
    options,
  );
}

export function deleteStudySession(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/learning/study-sessions/${encodeId(id)}`, options);
}

export function completeStudySession(
  id: string,
  input: CompleteStudySessionInput,
  options: ApiRequestOptions = {},
): Promise<StudySession> {
  return apiClient.post<StudySession>(
    `/learning/study-sessions/${encodeId(id)}/complete`,
    pickPresent(input, ["actual_minutes", "notes"]),
    options,
  );
}

export function createAssessmentAttempt(
  input: CreateAssessmentAttemptInput,
  options: ApiRequestOptions = {},
): Promise<AssessmentAttempt> {
  return apiClient.post<AssessmentAttempt>(
    "/learning/assessments",
    pickPresent(input, ASSESSMENT_FIELDS),
    options,
  );
}

export function createBottleneck(
  input: CreateBottleneckInput,
  options: ApiRequestOptions = {},
): Promise<LearningBottleneck> {
  return apiClient.post<LearningBottleneck>(
    "/learning/bottlenecks",
    pickPresent(input, BOTTLENECK_CREATE_FIELDS),
    options,
  );
}

export function updateBottleneck(
  id: string,
  input: UpdateBottleneckInput,
  options: ApiRequestOptions = {},
): Promise<LearningBottleneck> {
  return apiClient.patch<LearningBottleneck>(
    `/learning/bottlenecks/${encodeId(id)}`,
    pickPresent(input, BOTTLENECK_UPDATE_FIELDS),
    options,
  );
}

export function resolveBottleneck(
  id: string,
  options: ApiRequestOptions = {},
): Promise<LearningBottleneck> {
  return apiClient.post<LearningBottleneck>(
    `/learning/bottlenecks/${encodeId(id)}/resolve`,
    undefined,
    options,
  );
}

export function createLearningMilestone(
  input: CreateLearningMilestoneInput,
  options: ApiRequestOptions = {},
): Promise<LearningMilestone> {
  return apiClient.post<LearningMilestone>(
    "/learning/milestones",
    pickPresent(input, MILESTONE_FIELDS),
    options,
  );
}

export function updateLearningMilestone(
  id: string,
  input: UpdateLearningMilestoneInput,
  options: ApiRequestOptions = {},
): Promise<LearningMilestone> {
  return apiClient.patch<LearningMilestone>(
    `/learning/milestones/${encodeId(id)}`,
    pickPresent(input, MILESTONE_FIELDS),
    options,
  );
}

export function deleteLearningMilestone(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/learning/milestones/${encodeId(id)}`, options);
}

export function createWeeklyReview(
  input: CreateWeeklyReviewInput,
  options: ApiRequestOptions = {},
): Promise<WeeklyReview> {
  return apiClient.post<WeeklyReview>(
    "/learning/weekly-reviews",
    pickPresent(input, REVIEW_FIELDS),
    options,
  );
}

export function updateWeeklyReview(
  id: string,
  input: UpdateWeeklyReviewInput,
  options: ApiRequestOptions = {},
): Promise<WeeklyReview> {
  return apiClient.patch<WeeklyReview>(
    `/learning/weekly-reviews/${encodeId(id)}`,
    pickPresent(input, REVIEW_FIELDS),
    options,
  );
}

export function deleteWeeklyReview(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/learning/weekly-reviews/${encodeId(id)}`, options);
}

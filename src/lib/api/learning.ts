/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId, getArray } from "./resource.ts";
import type {
  LearningRoadmap,
  SkillNode,
  SpacedRepetitionCard,
  ReadingEntry,
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

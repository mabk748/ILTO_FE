import type {
  LearningRoadmap,
  SkillNode,
  SpacedRepetitionCard,
  ReadingEntry,
} from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/learning";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(`GET /learning?resource=${resource} failed: ${res.status}`);
  return res.json();
}

// GET /api/v1/learning/roadmaps
export async function getRoadmaps(): Promise<LearningRoadmap[]> {
  return getJson<LearningRoadmap[]>("learning-roadmap");
}

// GET /api/v1/learning/roadmaps/:id/skills
export async function getSkills(roadmapId?: string): Promise<SkillNode[]> {
  return roadmapId
    ? getJson<SkillNode[]>(`skill-node&roadmapId=${roadmapId}`)
    : getJson<SkillNode[]>("skill-node");
}

// GET /api/v1/learning/sr-cards?due=true
export async function getDueCards(): Promise<SpacedRepetitionCard[]> {
  const now = new Date();
  const cards = await getJson<SpacedRepetitionCard[]>("spaced-repetition-card");
  return cards.filter((card) => new Date(card.next_review) <= now);
}

// GET /api/v1/learning/sr-cards
export async function getAllCards(): Promise<SpacedRepetitionCard[]> {
  return getJson<SpacedRepetitionCard[]>("spaced-repetition-card");
}

// GET /api/v1/learning/reading
export async function getReadingList(): Promise<ReadingEntry[]> {
  return getJson<ReadingEntry[]>("reading-entry");
}

// TO BE CLEANED: START
/**
 * Learning Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/learning
 *
 * Spaced repetition uses SM-2 algorithm server-side.
 * Review sessions POST results back, which updates ease_factor and interval_days.
 * Reading progress syncs from Kindle highlights export or manual entry.


import type { LearningRoadmap, SkillNode, SpacedRepetitionCard, ReadingEntry } from "./types.ts";
import { mockRoadmaps, mockSkills, mockSRCards, mockReading } from "./mock/learning.mock.ts";

const delay = (): Promise<void> => new Promise(r => setTimeout(r, 170));

// GET /api/v1/learning/roadmaps
export async function getRoadmaps(): Promise<LearningRoadmap[]> {
  await delay();
  return mockRoadmaps;
}

// GET /api/v1/learning/roadmaps/:id/skills
export async function getSkills(roadmapId?: string): Promise<SkillNode[]> {
  await delay();
  return roadmapId ? mockSkills.filter(s => s.roadmap_id === roadmapId) : mockSkills;
}

// GET /api/v1/learning/sr-cards?due=true
export async function getDueCards(): Promise<SpacedRepetitionCard[]> {
  await delay();
  const now = new Date();
  return mockSRCards.filter(c => new Date(c.next_review) <= now);
}

// GET /api/v1/learning/sr-cards
export async function getAllCards(): Promise<SpacedRepetitionCard[]> {
  await delay();
  return mockSRCards;
}

// GET /api/v1/learning/reading
export async function getReadingList(): Promise<ReadingEntry[]> {
  await delay();
  return mockReading;
}
 */
// TO BE CLEANED: END

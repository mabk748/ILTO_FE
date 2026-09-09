import type {
  CareerMilestone,
  Certification,
  WorkDeadline,
  ComplianceItem,
} from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/work";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(`GET /work?resource=${resource} failed: ${res.status}`);
  return res.json();
}

// GET /webhook/work?resource=career-milestones
export function getCareerMilestones(): Promise<CareerMilestone[]> {
  return getJson<CareerMilestone[]>("career-milestones");
}

// GET /webhook/work?resource=certifications
export function getCertifications(): Promise<Certification[]> {
  return getJson<Certification[]>("certifications");
}

// GET /webhook/work?resource=deadlines
export function getDeadlines(): Promise<WorkDeadline[]> {
  return getJson<WorkDeadline[]>("deadlines");
}

// GET /webhook/work?resource=compliance
export function getComplianceItems(): Promise<ComplianceItem[]> {
  return getJson<ComplianceItem[]>("compliance");
}

// TO BE CLEANED: START
/**
 * Work Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/work
 *
 * Career milestones and certifications are manually managed.
 * Deadlines can optionally sync from Google Calendar via OAuth.
 * Compliance items support recurrence patterns (monthly, quarterly).
 *

import type { CareerMilestone, Certification, WorkDeadline, ComplianceItem } from "./types.ts";
import { mockCareerMilestones, mockCerts, mockDeadlines, mockCompliance } from "./mock/work.mock.ts";

const delay = (): Promise<void> => new Promise(r => setTimeout(r, 160));

// GET /api/v1/work/career-milestones
export async function getCareerMilestones(): Promise<CareerMilestone[]> {
  await delay();
  return mockCareerMilestones;
}

// GET /api/v1/work/certifications
export async function getCertifications(): Promise<Certification[]> {
  await delay();
  return mockCerts;
}

// GET /api/v1/work/deadlines
export async function getDeadlines(): Promise<WorkDeadline[]> {
  await delay();
  return mockDeadlines;
}

// GET /api/v1/work/compliance
export async function getComplianceItems(): Promise<ComplianceItem[]> {
  await delay();
  return mockCompliance;
}
*/
// TO BE CLEANED: END

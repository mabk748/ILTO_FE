import type {
  Trip,
  DocumentRecord,
  ChecklistTemplate,
  LogisticsEvent,
} from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/logistics";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(
      `GET /logistics?resource=${resource} failed: ${res.status}`,
    );
  return res.json();
}

// GET /api/v1/logistics/trips
export async function getTrips(): Promise<Trip[]> {
  return getJson<Trip[]>("trip");
}

// GET /api/v1/logistics/checklists
export async function getChecklists(): Promise<ChecklistTemplate[]> {
  return getJson<ChecklistTemplate[]>("check-list");
}

// GET /api/v1/logistics/documents
export async function getDocuments(): Promise<DocumentRecord[]> {
  return getJson<DocumentRecord[]>("document-record");
}

// GET /api/v1/logistics/events
export async function getLogisticsEvents(): Promise<LogisticsEvent[]> {
  return getJson<LogisticsEvent[]>("logistics-event");
}

// TO BE CLEANED: START
/**
 * Logistics Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/logistics
 *
 * To connect to FastAPI backend:
 * 1. Set VITE_API_BASE_URL in .env.local
 * 2. Replace mock return statements with: return fetch(`${BASE_URL}/...`).then(r => r.json())
 * 3. Add auth header: headers: { Authorization: `Bearer ${token}` }

import type { Trip, ChecklistTemplate, DocumentRecord, LogisticsEvent } from "./types.ts";
import { mockTrips, mockChecklists, mockDocuments, mockLogisticsEvents } from "./mock/logistics.mock.ts";

const delay = () => new Promise<void>(r => setTimeout(r, 180));

// GET /api/v1/logistics/trips
export async function getTrips(): Promise<Trip[]> {
  await delay();
  return mockTrips;
}

// GET /api/v1/logistics/checklists
export async function getChecklists(): Promise<ChecklistTemplate[]> {
  await delay();
  return mockChecklists;
}

// GET /api/v1/logistics/documents
export async function getDocuments(): Promise<DocumentRecord[]> {
  await delay();
  return mockDocuments;
}

// GET /api/v1/logistics/events
export async function getLogisticsEvents(): Promise<LogisticsEvent[]> {
  await delay();
  return mockLogisticsEvents;
}
*/
// TO BE CLEANED: END

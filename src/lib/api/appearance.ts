import type {
  WardrobeItem,
  OutfitLog,
  GroomingRoutine,
  AppearanceSpend,
} from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/appearance";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(
      `GET /appearance?resource=${resource} failed: ${res.status}`,
    );
  return res.json();
}

// GET /api/v1/appearance/wardrobe
export async function getWardrobeItems(): Promise<WardrobeItem[]> {
  return getJson<WardrobeItem[]>("wardrobe-item");
}

// GET /api/v1/appearance/outfits?limit=20
export async function getOutfitLogs(limit = 20): Promise<OutfitLog[]> {
  const outfit = await getJson<OutfitLog[]>("outfit-log");
  return outfit.slice(0, limit);
}

// GET /api/v1/appearance/grooming
export async function getGroomingRoutines(): Promise<GroomingRoutine[]> {
  return getJson<GroomingRoutine[]>("grooming-routine");
}

// GET /api/v1/appearance/spend
export async function getAppearanceSpend(): Promise<AppearanceSpend[]> {
  return getJson<AppearanceSpend[]>("appearance-spend");
}

// TO BE CLEANED: START
/**
 * Appearance Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/appearance
 *
 * To connect to FastAPI backend:
 * 1. Set VITE_API_BASE_URL in .env.local
 * 2. Replace mock return statements with: return fetch(`${BASE_URL}/...`).then(r => r.json())
 * 3. Add auth header: headers: { Authorization: `Bearer ${token}` }


import type { WardrobeItem, OutfitLog, GroomingRoutine, AppearanceSpend } from "./types.ts";
import { mockWardrobeItems, mockOutfitLogs, mockGroomingRoutines, mockAppearanceSpend } from "./mock/appearance.mock.ts";

const delay = () => new Promise<void>(r => setTimeout(r, 180));

// GET /api/v1/appearance/wardrobe
export async function getWardrobeItems(): Promise<WardrobeItem[]> {
  await delay();
  return mockWardrobeItems;
}

// GET /api/v1/appearance/outfits?limit=20
export async function getOutfitLogs(limit = 20): Promise<OutfitLog[]> {
  await delay();
  return mockOutfitLogs.slice(0, limit);
}

// GET /api/v1/appearance/grooming
export async function getGroomingRoutines(): Promise<GroomingRoutine[]> {
  await delay();
  return mockGroomingRoutines;
}

// GET /api/v1/appearance/spend
export async function getAppearanceSpend(): Promise<AppearanceSpend[]> {
  await delay();
  return mockAppearanceSpend;
}
*/
// TO BE CLEANED: END

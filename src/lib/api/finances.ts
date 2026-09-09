import type {
  BudgetCategory,
  Transaction,
  TradeEntry,
  NetWorthSnapshot,
  Bill,
} from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/finances";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(`GET /finances?resource=${resource} failed: ${res.status}`);
  return res.json();
}

// GET /api/v1/finances/budget-categories
export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  return getJson<BudgetCategory[]>("budget-category");
}

// GET /api/v1/finances/transactions?page=1&per_page=20
export async function getTransactions(): Promise<Transaction[]> {
  return getJson<Transaction[]>("transaction");
}

// GET /api/v1/finances/trades
export async function getTrades(): Promise<TradeEntry[]> {
  return getJson<TradeEntry[]>("trade-entry");
}

// GET /api/v1/finances/net-worth?months=12
export async function getNetWorthHistory(
  months = 12,
): Promise<NetWorthSnapshot[]> {
  const networth = await getJson<NetWorthSnapshot[]>("net-worth-snapshot");
  return networth.slice(-months);
}

// GET /api/v1/finances/bills
export async function getBills(): Promise<Bill[]> {
  return getJson<Bill[]>("bill");
}

// TO BE CLEANED: START
/*
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
*/
// TO BE CLEANED: END

// TO BE CLEANED: START
/**
 * Finances Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/finances
 *
 * Bank transactions sync via open banking APIs (GoCardless/Nordigen).
 * Investment data pulls from broker CSV exports or broker APIs.
 * All amounts stored in EUR with optional currency metadata.
 

import type { BudgetCategory, Transaction, TradeEntry, NetWorthSnapshot, Bill } from "./types.ts";
import { mockBudgetCategories, mockTransactions, mockTrades, mockNetWorth, mockBills } from "./mock/finances.mock.ts";

const delay = (): Promise<void> => new Promise(r => setTimeout(r, 160));

// GET /api/v1/finances/budget-categories
export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  await delay();
  return mockBudgetCategories;
}

// GET /api/v1/finances/transactions?page=1&per_page=20
export async function getTransactions(): Promise<Transaction[]> {
  await delay();
  return mockTransactions;
}

// GET /api/v1/finances/trades
export async function getTrades(): Promise<TradeEntry[]> {
  await delay();
  return mockTrades;
}

// GET /api/v1/finances/net-worth?months=12
export async function getNetWorthHistory(months = 12): Promise<NetWorthSnapshot[]> {
  await delay();
  return mockNetWorth.slice(-months);
}

// GET /api/v1/finances/bills
export async function getBills(): Promise<Bill[]> {
  await delay();
  return mockBills;
}
*/
// TO BE CLEANED: END

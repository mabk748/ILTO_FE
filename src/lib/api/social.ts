import type { Contact, NetworkingGoal, FollowUpPrompt } from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/social";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(`GET /social?resource=${resource} failed: ${res.status}`);
  return res.json();
}

// GET /api/v1/social/contacts
export async function getContacts(): Promise<Contact[]> {
  return getJson<Contact[]>("contacts");
}

// GET /api/v1/social/contacts/:id
export async function getContact(id: string): Promise<Contact | null> {
  return getJson<Contact>(`contacts&id=${encodeURIComponent(id)}`) ?? null;
}

// GET /api/v1/social/networking-goals
export async function getNetworkingGoals(): Promise<NetworkingGoal[]> {
  return getJson<NetworkingGoal[]>("networking-goal");
}

// GET /api/v1/social/follow-ups?completed=false
export async function getFollowUps(
  completed?: boolean,
): Promise<FollowUpPrompt[]> {
  if (completed === undefined)
    return getJson<FollowUpPrompt[]>("follow-up-prompt");
  return getJson<FollowUpPrompt[]>(`follow-up-prompt&completed=${completed}`);
}

// TO BE CLEANED: START
/**
 * Social Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/social
 *
 * Contacts can optionally import from LinkedIn CSV export.
 * Follow-up prompts are auto-generated server-side based on
 * last_contact date and user-defined cadence rules per relationship type.


import type { Contact, NetworkingGoal, FollowUpPrompt } from "./types.ts";
import { mockContacts, mockNetworkingGoals, mockFollowUps } from "./mock/social.mock.ts";

const delay = (): Promise<void> => new Promise(r => setTimeout(r, 150));

// GET /api/v1/social/contacts
export async function getContacts(): Promise<Contact[]> {
  await delay();
  return mockContacts;
}

// GET /api/v1/social/contacts/:id
export async function getContact(id: string): Promise<Contact | null> {
  await delay();
  return mockContacts.find(c => c.id === id) ?? null;
}

// GET /api/v1/social/networking-goals
export async function getNetworkingGoals(): Promise<NetworkingGoal[]> {
  await delay();
  return mockNetworkingGoals;
}

// GET /api/v1/social/follow-ups?completed=false
export async function getFollowUps(completed?: boolean): Promise<FollowUpPrompt[]> {
  await delay();
  if (completed === undefined) return mockFollowUps;
  return mockFollowUps.filter(f => f.completed === completed);
}
 */
// TO BE CLEANED: END

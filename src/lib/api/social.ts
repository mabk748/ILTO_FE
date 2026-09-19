import { getArray } from "./resource.ts";
/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId, getNullable } from "./resource.ts";
import type { Contact, NetworkingGoal, FollowUpPrompt } from "./types.ts";

export function getContacts(
  options: ApiRequestOptions = {},
): Promise<Contact[]> {
  return getArray<Contact>(`/social/contacts`, options);
}

export function getContact(
  id: string,
  options: ApiRequestOptions = {},
): Promise<Contact | null> {
  return getNullable<Contact>(`/social/contacts/${encodeId(id)}`, options);
}

export function getNetworkingGoals(
  options: ApiRequestOptions = {},
): Promise<NetworkingGoal[]> {
  return getArray<NetworkingGoal>(`/social/networking-goals`, options);
}

export function getFollowUps(
  completed?: boolean,
  options: ApiRequestOptions = {},
): Promise<FollowUpPrompt[]> {
  return getArray<FollowUpPrompt>(`/social/follow-ups`, {
    ...options,
    query: { ...options.query, ...{ completed } },
  });
}

export type CreateContactInput = Omit<Contact, "id">;
export type UpdateContactInput = Partial<CreateContactInput>;

export function createContact(
  input: CreateContactInput,
  options: ApiRequestOptions = {},
): Promise<Contact> {
  return apiClient.post<Contact>("/social/contacts", input, options);
}

export function updateContact(
  id: string,
  input: UpdateContactInput,
  options: ApiRequestOptions = {},
): Promise<Contact> {
  return apiClient.patch<Contact>(
    `/social/contacts/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteContact(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/social/contacts/${encodeId(id)}`, options);
}

export function updateFollowUp(
  id: string,
  input: Pick<FollowUpPrompt, "completed">,
  options: ApiRequestOptions = {},
): Promise<FollowUpPrompt> {
  return apiClient.patch<FollowUpPrompt>(
    `/social/follow-ups/${encodeId(id)}`,
    { completed: input.completed },
    options,
  );
}

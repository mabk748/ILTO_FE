import { apiClient, type ApiRequestOptions } from "./client.ts";
import { ApiError } from "./errors.ts";
import { encodeId, getArray } from "./resource.ts";
import type { HorizonEntry, HorizonItem } from "./types.ts";

export interface HorizonRange {
  from: string;
  to: string;
}

function validateRange(range: HorizonRange): void {
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    throw new ApiError(
      "Horizon requires a valid ISO range whose end is not before its start.",
      "configuration",
    );
  }
}

export function getHorizonEntries(
  range: HorizonRange,
  options: ApiRequestOptions = {},
): Promise<HorizonEntry[]> {
  validateRange(range);
  return getArray<HorizonEntry>("/horizon/entries", {
    ...options,
    query: { ...options.query, from: range.from, to: range.to },
  });
}

export type CreateHorizonItemInput = Omit<
  HorizonItem,
  "id" | "created_at" | "updated_at"
>;
export type UpdateHorizonItemInput = Partial<CreateHorizonItemInput>;

export function createHorizonItem(
  input: CreateHorizonItemInput,
  options: ApiRequestOptions = {},
): Promise<HorizonItem> {
  return apiClient.post<HorizonItem>("/horizon/items", input, options);
}

export function updateHorizonItem(
  id: string,
  input: UpdateHorizonItemInput,
  options: ApiRequestOptions = {},
): Promise<HorizonItem> {
  return apiClient.patch<HorizonItem>(
    `/horizon/items/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteHorizonItem(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/horizon/items/${encodeId(id)}`, options);
}

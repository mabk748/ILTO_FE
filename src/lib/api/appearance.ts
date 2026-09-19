import { getArray } from "./resource.ts";
/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId } from "./resource.ts";
import { ApiError } from "./errors.ts";
import type {
  WardrobeItem,
  OutfitLog,
  GroomingRoutine,
  AppearanceSpend,
} from "./types.ts";

export function getWardrobeItems(
  options: ApiRequestOptions = {},
): Promise<WardrobeItem[]> {
  return getArray<WardrobeItem>(`/appearance/wardrobe`, options);
}

export function getOutfitLogs(
  limit = 20,
  options: ApiRequestOptions = {},
): Promise<OutfitLog[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return Promise.reject(
      new ApiError(
        "Outfit log limit must be a whole number from 1 through 100.",
        "configuration",
      ),
    );
  }
  return getArray<OutfitLog>(`/appearance/outfits`, {
    ...options,
    query: { ...options.query, ...{ limit } },
  });
}

export function getGroomingRoutines(
  options: ApiRequestOptions = {},
): Promise<GroomingRoutine[]> {
  return getArray<GroomingRoutine>(`/appearance/grooming`, options);
}

export function getAppearanceSpend(
  options: ApiRequestOptions = {},
): Promise<AppearanceSpend[]> {
  return getArray<AppearanceSpend>(`/appearance/spend`, options);
}

export type CreateWardrobeItemInput = Omit<
  WardrobeItem,
  "id" | "times_worn" | "last_worn"
>;
export type UpdateWardrobeItemInput = Partial<CreateWardrobeItemInput>;

export function createWardrobeItem(
  input: CreateWardrobeItemInput,
  options: ApiRequestOptions = {},
): Promise<WardrobeItem> {
  return apiClient.post<WardrobeItem>("/appearance/wardrobe", input, options);
}

export function updateWardrobeItem(
  id: string,
  input: UpdateWardrobeItemInput,
  options: ApiRequestOptions = {},
): Promise<WardrobeItem> {
  return apiClient.patch<WardrobeItem>(
    `/appearance/wardrobe/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteWardrobeItem(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/appearance/wardrobe/${encodeId(id)}`, options);
}

export type CreateOutfitLogInput = Omit<OutfitLog, "id">;
export type UpdateOutfitLogInput = Partial<CreateOutfitLogInput>;

export function createOutfitLog(
  input: CreateOutfitLogInput,
  options: ApiRequestOptions = {},
): Promise<OutfitLog> {
  return apiClient.post<OutfitLog>("/appearance/outfits", input, options);
}

export function updateOutfitLog(
  id: string,
  input: UpdateOutfitLogInput,
  options: ApiRequestOptions = {},
): Promise<OutfitLog> {
  return apiClient.patch<OutfitLog>(
    `/appearance/outfits/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteOutfitLog(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/appearance/outfits/${encodeId(id)}`, options);
}

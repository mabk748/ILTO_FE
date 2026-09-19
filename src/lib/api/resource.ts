import { apiClient, type ApiRequestOptions } from "./client.ts";
import { ApiError } from "./errors.ts";
import type { PaginatedResponse } from "./types.ts";

export async function getArray<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T[]> {
  const data = await apiClient.get<unknown>(path, options);
  if (!Array.isArray(data))
    throw new ApiError("Expected an array from the API.", "invalid_response");
  return data as T[];
}

export async function getPage<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<PaginatedResponse<T>> {
  const data = await apiClient.get<PaginatedResponse<T>>(path, options);
  if (
    !data ||
    !Array.isArray(data.data) ||
    !Number.isInteger(data.total) ||
    data.total < 0 ||
    !Number.isInteger(data.page) ||
    data.page < 1 ||
    !Number.isInteger(data.per_page) ||
    data.per_page < 1 ||
    !Number.isInteger(data.total_pages) ||
    data.total_pages < 0
  ) {
    throw new ApiError(
      "Expected a paginated response from the API.",
      "invalid_response",
    );
  }
  return data;
}

export function encodeId(id: string): string {
  if (!id.trim() || id === "." || id === "..") {
    throw new ApiError("A nonempty resource ID is required.", "configuration");
  }
  return encodeURIComponent(id);
}

/** Only entity lookups opt into 404-as-null; list and metric failures stay errors. */
export async function getNullable<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T | null> {
  try {
    return await apiClient.get<T | null>(path, options);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "http" &&
      error.status === 404
    )
      return null;
    throw error;
  }
}

import { loadSettings } from "../settings.ts";
import { ApiError } from "./errors.ts";

/** The base includes the API prefix, for example https://example.test/api/v1. */
export function normalizeApiBaseUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error("Invalid API base URL");
    }
    return url.href.replace(/\/+$/, "");
  } catch (cause) {
    throw new ApiError(
      "Enter an HTTP(S) API base URL without credentials, a query, or a fragment.",
      "configuration",
      { cause },
    );
  }
}

/** Read per request so a newly saved Settings URL takes effect without a reload. */
export function getApiBaseUrl(): string {
  const value =
    loadSettings().apiBaseUrl.trim() ||
    import.meta.env.VITE_API_BASE_URL?.trim();

  if (!value) {
    throw new ApiError(
      "Set the API Base URL in Settings before connecting to the backend.",
      "configuration",
    );
  }
  return normalizeApiBaseUrl(value);
}

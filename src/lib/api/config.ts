import { loadSettings } from "../settings.ts";
import { ApiError } from "./errors.ts";

const RELATIVE_ORIGIN = "https://same-origin.invalid";

/** The base includes the API prefix, for example /api/v1. */
export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  try {
    const relative = trimmed.startsWith("/");
    if (relative && trimmed.startsWith("//")) {
      throw new Error("Protocol-relative URLs are not allowed");
    }
    const url = new URL(trimmed, relative ? RELATIVE_ORIGIN : undefined);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error("Invalid API base URL");
    }
    if (relative) {
      if (url.origin !== RELATIVE_ORIGIN) {
        throw new Error("The relative API base escaped the current origin");
      }
      return url.pathname.replace(/\/+$/, "") || "/";
    }
    return url.href.replace(/\/+$/, "");
  } catch (cause) {
    throw new ApiError(
      "Enter /api/v1 or an HTTP(S) API base URL without credentials, a query, or a fragment.",
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

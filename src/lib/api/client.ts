import { getApiBaseUrl } from "./config.ts";
import { ApiError } from "./errors.ts";
import {
  reportUnauthorized,
  sessionRequestSignal,
} from "./session-requests.ts";

type QueryValue = string | number | boolean;
export type ApiQuery = Record<
  string,
  QueryValue | readonly QueryValue[] | null | undefined
>;

export interface ApiRequestOptions {
  query?: ApiQuery;
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Defaults to 15 seconds; covers fetching and reading the response body. */
  timeoutMs?: number;
  /** Defaults to include for the configured backend's HTTP-only session cookie. */
  credentials?: RequestCredentials;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

function buildUrl(path: string, query?: ApiQuery): URL {
  const base = `${getApiBaseUrl()}/`;
  // Endpoint paths are relative to the API root, including a leading slash.
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new ApiError(
      "Use an endpoint path relative to the API base URL.",
      "configuration",
    );
  }
  const url = new URL(path.replace(/^\//, ""), base);
  const root = new URL(base);
  if (
    url.origin !== root.origin ||
    !url.pathname.startsWith(root.pathname) ||
    url.hash
  ) {
    throw new ApiError(
      "The endpoint must remain within the configured API base URL.",
      "configuration",
    );
  }
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue;
    url.searchParams.delete(key);
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, String(item));
    }
  }
  return url;
}

function httpMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const body = payload as Record<string, unknown>;
    for (const key of ["message", "detail"]) {
      if (typeof body[key] === "string" && body[key].trim()) return body[key];
    }
  }
  return `The API request failed (HTTP ${status}).`;
}

async function request<T>(
  method: Method,
  path: string,
  body: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.query);
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 2_147_483_647
  ) {
    throw new ApiError(
      "Request timeout must be a positive number of milliseconds within the timer limit.",
      "configuration",
    );
  }

  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  let serializedBody: string | undefined;
  if (body !== undefined) {
    try {
      serializedBody = JSON.stringify(body);
      if (serializedBody === undefined)
        throw new Error("Not JSON serializable");
    } catch (cause) {
      throw new ApiError(
        "Request body must be JSON serializable.",
        "configuration",
        { cause },
      );
    }
    if (!headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const sessionSignal = sessionRequestSignal();
  let abortCode: "timeout" | "aborted" | undefined;
  const abort = (code: "timeout" | "aborted") => {
    if (controller.signal.aborted) return;
    abortCode = code;
    controller.abort();
  };
  const onAbort = () => abort("aborted");
  options.signal?.addEventListener("abort", onAbort, { once: true });
  sessionSignal.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  const timer = setTimeout(() => abort("timeout"), timeoutMs);

  try {
    controller.signal.throwIfAborted();
    const response = await fetch(url.href, {
      method,
      headers,
      body: serializedBody,
      signal: controller.signal,
      credentials: options.credentials ?? "include",
      cache: "no-store",
    });
    const text = await response.text();
    controller.signal.throwIfAborted();
    let payload: unknown;
    let validJson = false;
    if (text.trim()) {
      try {
        payload = JSON.parse(text);
        validJson = true;
      } catch {
        // Failed HTTP responses may be HTML or plain text; preserve their status.
      }
    }
    if (!response.ok) {
      throw new ApiError(httpMessage(payload, response.status), "http", {
        status: response.status,
        details: payload,
      });
    }
    // Callers of endpoints with no response body should use the <void> type.
    if (response.status === 204 || response.status === 205 || !text.trim()) {
      return undefined as T;
    }
    const mediaType = response.headers
      .get("Content-Type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (
      !validJson ||
      !(mediaType === "application/json" || mediaType?.endsWith("+json"))
    ) {
      throw new ApiError(
        "The API returned an invalid JSON response.",
        "invalid_response",
        {
          status: response.status,
        },
      );
    }
    // T is a compile-time contract; domain schema validation belongs in adapters.
    return payload as T;
  } catch (cause) {
    if (abortCode) {
      throw new ApiError(
        abortCode === "timeout"
          ? "The API request timed out."
          : "The API request was cancelled.",
        abortCode,
        { cause },
      );
    }
    if (cause instanceof ApiError) {
      if (
        cause.status === 401 &&
        path.replace(/^\//, "").split("?")[0] !== "auth/login"
      ) {
        reportUnauthorized(sessionSignal);
      }
      throw cause;
    }
    throw new ApiError(
      "Could not reach the API. Check the server and connection.",
      "network",
      { cause },
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
    sessionSignal.removeEventListener("abort", onAbort);
  }
}

/** Thin JSON request helpers. No automatic retries or fabricated fallback data. */
export const apiClient = {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },
  post<T = void>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>("POST", path, body, options);
  },
  patch<T = void>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>("PATCH", path, body, options);
  },
  delete<T = void>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>("DELETE", path, undefined, options);
  },
};

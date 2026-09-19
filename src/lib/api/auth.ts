import { apiClient, type ApiRequestOptions } from "./client.ts";
import { ApiError } from "./errors.ts";

export interface Owner {
  username: string;
}
export interface OwnerCredentials {
  username: string;
  password: string;
}

function owner(payload: unknown): Owner {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("username" in payload) ||
    typeof payload.username !== "string" ||
    !payload.username.trim()
  ) {
    throw new ApiError(
      "The backend returned an invalid owner response.",
      "invalid_response",
    );
  }
  return { username: payload.username };
}

export async function getOwner(options?: ApiRequestOptions): Promise<Owner> {
  return owner(await apiClient.get<unknown>("/auth/me", options));
}

export async function loginOwner(
  credentials: OwnerCredentials,
): Promise<Owner> {
  // Never put credentials in a query/mutation cache or browser storage.
  return owner(
    await apiClient.post<unknown>("/auth/login", {
      username: credentials.username,
      password: credentials.password,
    }),
  );
}

export function logoutOwner(): Promise<void> {
  return apiClient.post<void>("/auth/logout");
}

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return "Unable to confirm the session. Please try again.";
  if (error.status === 401) return "Invalid username or password.";
  if (error.status === 429)
    return "Too many login attempts. Wait about one minute before trying again.";
  if (error.status === 503)
    return "The backend is unavailable or its owner authentication is not configured. Check the backend configuration and try again.";
  if (error.status === 403)
    return "The backend rejected this frontend's origin. Check the allowed origin configuration.";
  if (error.status === 422) return "Check the username and password format.";
  if (error.code === "configuration")
    return "Configure a valid API Base URL in Settings before signing in.";
  if (error.code === "network")
    return "Could not reach the backend. Check the API URL, server, connection, and CORS configuration.";
  if (error.code === "timeout")
    return "The backend timed out. Please try again.";
  if (error.code === "invalid_response")
    return "The API returned an unexpected response. Check the API Base URL and backend.";
  return "The backend request failed. Please try again.";
}

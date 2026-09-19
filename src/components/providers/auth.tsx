import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  authErrorMessage,
  getOwner,
  loginOwner,
  logoutOwner,
  type OwnerCredentials,
} from "@/lib/api/auth.ts";
import { ApiError } from "@/lib/api/errors.ts";
import {
  cancelSessionRequests,
  onUnauthorized,
} from "@/lib/api/session-requests.ts";
import { OwnerAuthContext, type OwnerAuth } from "./owner-auth-context.ts";

type SessionState = Pick<OwnerAuth, "status" | "owner" | "message">;
const initial: SessionState = {
  status: "checking",
  owner: null,
  message: null,
};

/** Mounted inside the backend-keyed QueryClientProvider: no persisted identity. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>(initial);
  const current = useRef(state);
  const generation = useRef(0);
  const checking = useRef<number | null>(null);
  const commit = useCallback((next: SessionState) => {
    current.current = next;
    setState(next);
  }, []);
  const clearPrivateData = useCallback(() => {
    generation.current += 1;
    checking.current = null;
    cancelSessionRequests();
    void queryClient.cancelQueries();
    queryClient.clear();
    return generation.current;
  }, [queryClient]);

  const checkSession = useCallback(async () => {
    if (checking.current !== null) return;
    const ticket = generation.current;
    checking.current = ticket;
    if (current.current.status !== "authenticated") commit(initial);
    try {
      const owner = await getOwner();
      if (ticket === generation.current)
        commit({ status: "authenticated", owner, message: null });
    } catch (error) {
      if (ticket !== generation.current) return;
      const hadSession = current.current.status === "authenticated";
      clearPrivateData();
      commit({
        status:
          error instanceof ApiError && error.status === 401
            ? "anonymous"
            : "unavailable",
        owner: null,
        message:
          error instanceof ApiError && error.status === 401
            ? hadSession
              ? "Your session expired. Please sign in again."
              : null
            : authErrorMessage(error),
      });
    } finally {
      if (checking.current === ticket) checking.current = null;
    }
  }, [clearPrivateData, commit]);

  const login = useCallback(
    async (credentials: OwnerCredentials) => {
      if (
        current.current.status === "signing-in" ||
        current.current.status === "signing-out"
      )
        return;
      const ticket = clearPrivateData();
      commit({ status: "signing-in", owner: null, message: null });
      let accepted = false;
      try {
        await loginOwner(credentials);
        if (ticket !== generation.current) return;
        accepted = true;
        // Confirm that the browser accepted the HTTP-only cookie.
        const owner = await getOwner();
        if (ticket === generation.current)
          commit({ status: "authenticated", owner, message: null });
      } catch (error) {
        if (ticket !== generation.current) return;
        commit({
          status: "anonymous",
          owner: null,
          message:
            accepted && error instanceof ApiError && error.status === 401
              ? "Login succeeded but the session cookie was not accepted. Use localhost for both apps and check cookie settings."
              : authErrorMessage(error),
        });
      }
    },
    [clearPrivateData, commit],
  );

  const logout = useCallback(async () => {
    if (current.current.status === "signing-out") return;
    const ticket = clearPrivateData();
    commit({ status: "signing-out", owner: null, message: null });
    try {
      await logoutOwner();
      if (ticket === generation.current)
        commit({ status: "anonymous", owner: null, message: "Signed out." });
    } catch (error) {
      if (ticket !== generation.current) return;
      commit({
        status: "logout-failed",
        owner: null,
        message: `Private data was cleared locally, but server sign-out could not be confirmed. Your server session may still be active. ${authErrorMessage(error)}`,
      });
    }
  }, [clearPrivateData, commit]);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      if (current.current.status !== "authenticated") return;
      clearPrivateData();
      commit({
        status: "anonymous",
        owner: null,
        message: "Your session expired. Please sign in again.",
      });
    });
    // Recheck on return without discarding in-progress forms on success.
    const onFocus = () => {
      if (current.current.status === "authenticated") void checkSession();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    const initialCheck = window.setTimeout(() => void checkSession(), 0);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initialCheck);
      unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      clearPrivateData();
    };
  }, [checkSession, clearPrivateData, commit]);

  return (
    <OwnerAuthContext.Provider
      value={{ ...state, login, logout, checkSession }}
    >
      {children}
    </OwnerAuthContext.Provider>
  );
}

import { createContext, useContext } from "react";
import type { Owner, OwnerCredentials } from "@/lib/api/auth.ts";

export type AuthStatus =
  | "checking"
  | "authenticated"
  | "anonymous"
  | "unavailable"
  | "signing-in"
  | "signing-out"
  | "logout-failed";
export interface OwnerAuth {
  status: AuthStatus;
  owner: Owner | null;
  message: string | null;
  login: (credentials: OwnerCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}
export const OwnerAuthContext = createContext<OwnerAuth | null>(null);
export function useOwnerAuth(): OwnerAuth {
  const value = useContext(OwnerAuthContext);
  if (!value) throw new Error("useOwnerAuth requires AuthProvider");
  return value;
}

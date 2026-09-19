import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useOwnerAuth } from "@/components/providers/owner-auth-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

export default function LoginPage() {
  const { status, message, login, logout, checkSession } = useOwnerAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const from: unknown = location.state?.from;
  const destination =
    typeof from === "string" &&
    /^\/(?!\/)/.test(from) &&
    !from.includes("\\") &&
    !from.startsWith("/login") &&
    from !== "/"
      ? from
      : "/projects";
  if (status === "authenticated") return <Navigate to={destination} replace />;
  const busy =
    status === "checking" ||
    status === "signing-in" ||
    status === "signing-out";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const credentials = { username, password };
    setPassword("");
    void login(credentials);
  };
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section
        className="w-full max-w-sm space-y-5 rounded-lg border p-6"
        aria-labelledby="login-heading"
      >
        <h1 id="login-heading" className="text-2xl font-semibold">
          ILTO owner sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          Use the owner account configured on your backend.
        </p>
        {message && (
          <p role="alert" className="text-sm">
            {message}
          </p>
        )}
        {busy && (
          <p role="status">
            {status === "checking"
              ? "Checking session…"
              : status === "signing-out"
                ? "Signing out…"
                : "Signing in…"}
          </p>
        )}
        {status === "logout-failed" ? (
          <Button onClick={() => void logout()}>Retry sign out</Button>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner-username">Username</Label>
              <Input
                id="owner-username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-password">Password</Label>
              <Input
                id="owner-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              Sign in
            </Button>
          </form>
        )}
        {status === "unavailable" && (
          <Button variant="outline" onClick={() => void checkSession()}>
            Retry session check
          </Button>
        )}
        <Link to="/settings" className="block text-sm underline">
          Connection settings
        </Link>
        <p className="text-xs text-muted-foreground">
          For local development, use localhost for both apps (not 127.0.0.1).
          Only connect to a backend you trust with your credentials.
        </p>
      </section>
    </main>
  );
}

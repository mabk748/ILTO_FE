import { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth.tsx";
import { useOwnerAuth } from "./owner-auth-context.ts";
import LoginPage from "@/pages/auth/Login.tsx";
import RequireOwner from "@/components/layout/RequireOwner.tsx";
import { apiClient } from "@/lib/api/client.ts";
import { SettingsProvider } from "./settings.tsx";
import { QueryClientProvider as BackendQueryProvider } from "./query-client.tsx";
import { useSettings } from "./settings-context.ts";

const fetchMock = vi.fn<typeof fetch>();
function PrivatePage() {
  const { logout, owner } = useOwnerAuth();
  return (
    <>
      <p>Private projects for {owner?.username}</p>
      <button onClick={() => void logout()}>Sign out</button>
    </>
  );
}
function setup(strict = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const content = (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/projects"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/settings"
              element={<p>Public connection settings</p>}
            />
            <Route element={<RequireOwner />}>
              <Route path="/projects" element={<PrivatePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
  return {
    client,
    ...render(strict ? <StrictMode>{content}</StrictMode> : content),
  };
}
beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("owner session UI (mocked fetch, not real cookies)", () => {
  it("gates private routes, allows settings, and never fabricates an owner", async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 401 }));
    setup();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    expect(screen.queryByText(/Private projects/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Connection settings" }));
    expect(screen.getByText("Public connection settings")).toBeInTheDocument();
  });
  it("confirms the cookie after login, clears the password, and stores no credentials in query caches or storage", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockImplementation(async () =>
        Response.json({ username: "real-owner" }),
      );
    const { client } = setup();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "real-owner" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByLabelText("Password")).toHaveValue("");
    await screen.findByText("Private projects for real-owner");
    expect(
      fetchMock.mock.calls.map(([url]) => String(url).split("/").pop()),
    ).toEqual(["me", "login", "me"]);
    expect(localStorage.length).toBe(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
  it("does not unlock the app when login succeeds but its cookie is missing", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ username: "owner" }))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }));
    setup();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "owner" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText(/session cookie was not accepted/);
    expect(screen.queryByText(/Private projects/)).not.toBeInTheDocument();
  });
  it.each(["logout", "expiry"])(
    "clears cache, aborts pending reads, and hides private routes on %s",
    async (action) => {
      fetchMock.mockResolvedValueOnce(Response.json({ username: "owner" }));
      const { client } = setup();
      await screen.findByText(/Private projects/);
      client.setQueryData(["private"], { secret: "private cache" });
      client.setQueryData(
        ["learning", "roadmaps"],
        [{ id: "another-user-roadmap" }],
      );
      client.setQueryData(
        ["learning", "skills"],
        [{ id: "another-user-skill" }],
      );
      let pendingSignal: AbortSignal | null | undefined;
      fetchMock.mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            pendingSignal = init?.signal;
            pendingSignal?.addEventListener("abort", () =>
              reject(pendingSignal?.reason),
            );
          }),
      );
      const pending = client
        .fetchQuery({
          queryKey: ["pending"],
          queryFn: ({ signal }) => apiClient.get("/projects", { signal }),
        })
        .catch(() => undefined);
      await waitFor(() => expect(pendingSignal).toBeDefined());
      fetchMock.mockResolvedValueOnce(
        action === "logout"
          ? new Response(null, { status: 204 })
          : Response.json({}, { status: 401 }),
      );
      if (action === "logout")
        fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
      else
        await act(async () => {
          await apiClient.get("/projects/tasks").catch(() => undefined);
        });
      await screen.findByText(
        action === "logout" ? "Signed out." : /session expired/,
      );
      expect(screen.queryByText(/Private projects/)).not.toBeInTheDocument();
      expect(client.getQueryCache().getAll()).toHaveLength(0);
      expect(client.getQueryData(["learning", "roadmaps"])).toBeUndefined();
      expect(client.getQueryData(["learning", "skills"])).toBeUndefined();
      expect(pendingSignal?.aborted).toBe(true);
      await pending;
    },
  );
  it("reports uncertain logout honestly, keeps private data hidden on focus, and allows retry", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ username: "owner" }))
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    setup();
    await screen.findByText(/Private projects/);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByText(/server session may still be active/);
    fireEvent.focus(window);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Retry sign out" }));
    await screen.findByText("Signed out.");
  });
  it("checks sessions again on focus and handles StrictMode setup/cleanup", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ username: "owner" }),
    );
    setup(true);
    await screen.findByText(/Private projects/);
    fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
    fireEvent.focus(window);
    await screen.findByText(/session expired/);
  });
  it.each([401, 429, 503, "network"] as const)(
    "shows actionable login failure for %s without retrying",
    async (failure) => {
      fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
      if (failure === "network")
        fetchMock.mockRejectedValueOnce(new TypeError("Offline"));
      else
        fetchMock.mockResolvedValueOnce(Response.json({}, { status: failure }));
      setup();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
      );
      fireEvent.change(screen.getByLabelText("Username"), {
        target: { value: "owner" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        failure === 401
          ? "Invalid username"
          : failure === 429
            ? "one minute"
            : failure === 503
              ? "not configured"
              : "CORS",
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText("Password")).toHaveValue("");
    },
  );
  it("allows fixing missing configuration without sending requests", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    setup();
    await screen.findByText(/Configure a valid API Base URL/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Connection settings" }),
    ).toHaveAttribute("href", "/settings");
  });
  it("aborts an old backend's login and ignores its late response after switching the saved URL", async () => {
    let resolveLogin!: (response: Response) => void;
    let loginSignal: AbortSignal | null | undefined;
    fetchMock
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockImplementationOnce(
        (_url, init) =>
          new Promise((resolve) => {
            resolveLogin = resolve;
            loginSignal = init?.signal;
          }),
      )
      .mockResolvedValueOnce(Response.json({}, { status: 401 }));
    function SwitchProbe() {
      const { settings, updateSettings } = useSettings();
      const { status, owner, login } = useOwnerAuth();
      return (
        <>
          <p>Session: {status}</p>
          <p>{owner?.username}</p>
          <button
            onClick={() =>
              void login({
                username: "old-owner",
                password: "test-only-password",
              })
            }
          >
            Start login
          </button>
          <button
            onClick={() =>
              updateSettings({
                ...settings,
                apiBaseUrl: "http://localhost:8002/api/v1",
              })
            }
          >
            Switch backend
          </button>
        </>
      );
    }
    render(
      <SettingsProvider>
        <BackendQueryProvider>
          <AuthProvider>
            <SwitchProbe />
          </AuthProvider>
        </BackendQueryProvider>
      </SettingsProvider>,
    );
    await screen.findByText("Session: anonymous");
    fireEvent.click(screen.getByRole("button", { name: "Start login" }));
    await screen.findByText("Session: signing-in");
    fireEvent.click(screen.getByRole("button", { name: "Switch backend" }));
    await screen.findByText("Session: anonymous");
    expect(loginSignal?.aborted).toBe(true);
    await act(async () => {
      resolveLogin(Response.json({ username: "old-owner" }));
    });
    expect(screen.queryByText("old-owner")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[2][0]).toBe(
      "http://localhost:8002/api/v1/auth/me",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(localStorage)).not.toContain("test-only-password");
  });
});

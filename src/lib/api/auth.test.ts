import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authErrorMessage, getOwner, loginOwner, logoutOwner } from "./auth.ts";
import { apiClient } from "./client.ts";
import { ApiError } from "./errors.ts";
import { cancelSessionRequests, onUnauthorized } from "./session-requests.ts";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cancelSessionRequests();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("owner auth HTTP contract (mocked fetch)", () => {
  it("sends credentials on every request, exact JSON login, no Origin or bearer token, and accepts 204 logout", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("logout")
        ? new Response(null, { status: 204 })
        : Response.json({ username: "owner" }),
    );
    await loginOwner({ username: "owner", password: "test-only-password" });
    await getOwner();
    await logoutOwner();
    expect(
      fetchMock.mock.calls.map(([url, init]) => [url, init?.method]),
    ).toEqual([
      ["http://localhost:8001/api/v1/auth/login", "POST"],
      ["http://localhost:8001/api/v1/auth/me", "GET"],
      ["http://localhost:8001/api/v1/auth/logout", "POST"],
    ]);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ username: "owner", password: "test-only-password" }),
    );
    expect(fetchMock.mock.calls[2][1]?.body).toBeUndefined();
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.credentials).toBe("include");
      expect(new Headers(init?.headers).has("Origin")).toBe(false);
      expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    }
    expect(localStorage.length).toBe(0);
  });
  it.each([null, {}, { username: "" }, { username: 123 }])(
    "rejects invalid owner payload %j",
    async (payload) => {
      fetchMock.mockResolvedValue(Response.json(payload));
      await expect(getOwner()).rejects.toMatchObject({
        code: "invalid_response",
      });
    },
  );
  it.each([
    [401, "Invalid username"],
    [429, "one minute"],
    [503, "not configured"],
    [403, "origin"],
    [422, "format"],
  ])("explains HTTP %s", (status, message) => {
    expect(
      authErrorMessage(
        new ApiError("detail", "http", { status: Number(status) }),
      ),
    ).toContain(message);
  });
  it.each([
    ["configuration", "Settings"],
    ["network", "CORS"],
    ["timeout", "timed out"],
  ] as const)("explains %s", (code, message) => {
    expect(authErrorMessage(new ApiError("detail", code))).toContain(message);
  });
  it("reports protected 401s but not invalid login credentials; keeps the original HTTP error after cancellation", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ detail: "Unauthorized" }, { status: 401 }),
    );
    const listener = vi.fn(() => cancelSessionRequests());
    const unsubscribe = onUnauthorized(listener);
    try {
      await expect(
        loginOwner({ username: "owner", password: "wrong" }),
      ).rejects.toMatchObject({ status: 401 });
      expect(listener).not.toHaveBeenCalled();
      await expect(apiClient.get("/projects")).rejects.toMatchObject({
        status: 401,
      });
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });
  it("cancels standalone pending writes and suppresses late old-session responses", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const response = apiClient.patch("/projects/tasks/task", {
      status: "done",
    });
    const assertion = expect(response).rejects.toMatchObject({
      code: "aborted",
    });
    cancelSessionRequests();
    resolve(Response.json({ status: "done" }));
    await assertion;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});

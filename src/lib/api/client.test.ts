import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeSettings, saveSettings } from "../settings.ts";
import { apiClient } from "./client.ts";
import { ApiError } from "./errors.ts";

const fetchMock = vi.fn<typeof fetch>();

function setSavedUrl(url: string) {
  saveSettings(normalizeSettings({ apiBaseUrl: url }));
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function waitForAbort(_input: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
      once: true,
    });
  });
}

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_BASE_URL", "https://env.example.test/api/v1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("API destination", () => {
  it("uses the saved Settings URL and picks up later saves without reimporting", async () => {
    fetchMock.mockImplementation(async () => jsonResponse([]));
    setSavedUrl("  https://first.example.test/api/v1///  ");
    await apiClient.get("/projects");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://first.example.test/api/v1/projects",
    );

    setSavedUrl("https://second.example.test/backend");
    await apiClient.get("projects");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://second.example.test/backend/projects",
    );

    setSavedUrl("");
    await apiClient.get("/projects");
    expect(fetchMock.mock.calls[2][0]).toBe(
      "https://env.example.test/api/v1/projects",
    );
  });

  it("fails before fetching if neither Settings nor the environment has a URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    await expect(apiClient.get("/projects")).rejects.toMatchObject({
      code: "configuration",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "not-a-url",
    "ftp://example.test",
    "https://user:password@example.test/api/v1",
    "https://example.test/api/v1?resource=project",
    "https://example.test/api/v1#fragment",
  ])(
    "rejects invalid saved base %s without falling back to another backend",
    async (url) => {
      setSavedUrl(url);
      await expect(apiClient.get("/projects")).rejects.toMatchObject({
        code: "configuration",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    "https://other.example.test/projects",
    "//other.example.test",
    "../projects",
    "/%2e%2e/projects",
    "/projects#fragment",
  ])(
    "rejects endpoint %s that escapes the API root or has a fragment",
    async (path) => {
      await expect(apiClient.get(path)).rejects.toMatchObject({
        code: "configuration",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

describe("JSON requests", () => {
  it("encodes query values and retains false and zero", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await apiClient.get("/tasks", {
      query: {
        search: "a&b / c",
        completed: false,
        offset: 0,
        tag: ["one", "two"],
        absent: undefined,
        omitted: null,
      },
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("search")).toBe("a&b / c");
    expect(url.searchParams.get("completed")).toBe("false");
    expect(url.searchParams.get("offset")).toBe("0");
    expect(url.searchParams.getAll("tag")).toEqual(["one", "two"]);
    expect(url.searchParams.has("absent")).toBe(false);
    expect(url.searchParams.has("omitted")).toBe(false);
  });

  it("sends JSON writes with caller headers and returns the backend payload", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "p1" }, 201));
    const result = await apiClient.post<{ id: string }>(
      "/projects",
      { name: "Example" },
      {
        headers: { Authorization: "Bearer test-token" },
        credentials: "include",
      },
    );
    expect(result).toEqual({ id: "p1" });
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Example" }));
    expect(init.credentials).toBe("include");
    const headers = new Headers(init.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("supports PATCH and DELETE with no response body", async () => {
    fetchMock.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );
    await expect(
      apiClient.patch("/tasks/t1", { status: "done" }),
    ).resolves.toBeUndefined();
    await expect(apiClient.delete("/tasks/t1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "PATCH",
      "DELETE",
    ]);
    expect(fetchMock.mock.calls[1][1]?.body).toBeUndefined();
  });

  it("accepts JSON suffix media types and does not unwrap envelopes", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"data":[]}', {
        headers: { "Content-Type": "application/vnd.ilto+json; charset=utf-8" },
      }),
    );
    await expect(apiClient.get("/projects")).resolves.toEqual({ data: [] });
  });

  it("rejects a nonserializable body before sending", async () => {
    await expect(
      apiClient.post("/projects", { value: 1n }),
    ).rejects.toMatchObject({ code: "configuration" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("request failures", () => {
  it("preserves backend validation details and HTTP status", async () => {
    const payload = { detail: [{ loc: ["body", "name"], msg: "Required" }] };
    fetchMock.mockResolvedValue(jsonResponse(payload, 422));
    await expect(apiClient.post("/projects", {})).rejects.toMatchObject({
      name: "ApiError",
      code: "http",
      status: 422,
      details: payload,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses a backend error message and never silently translates 404 to empty data", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: "Project not found" }, 404),
    );
    await expect(apiClient.get("/projects/missing")).rejects.toMatchObject({
      code: "http",
      status: 404,
      message: "Project not found",
    });
  });

  it("keeps HTTP errors when a gateway returns HTML", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>Bad gateway</html>", { status: 502 }),
    );
    await expect(apiClient.get("/projects")).rejects.toMatchObject({
      code: "http",
      status: 502,
    });
  });

  it.each([
    ["<html>Frontend index</html>", "text/html"],
    ["{broken", "application/json"],
  ])(
    "rejects a successful but invalid JSON response",
    async (body, contentType) => {
      fetchMock.mockResolvedValue(
        new Response(body, { headers: { "Content-Type": contentType } }),
      );
      await expect(apiClient.get("/projects")).rejects.toMatchObject({
        code: "invalid_response",
        status: 200,
      });
    },
  );

  it("normalizes network errors without retrying a write", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiClient.post("/projects", {})).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send a request with an already cancelled signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      apiClient.get("/projects", { signal: controller.signal }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards cancellation while fetching", async () => {
    fetchMock.mockImplementation(waitForAbort);
    const controller = new AbortController();
    const promise = apiClient.get("/projects", { signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({
      code: "aborted",
    });
    controller.abort();
    await assertion;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("aborts on timeout and clears its timer", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(waitForAbort);
    const promise = apiClient.get("/projects", { timeoutMs: 50 });
    const assertion = expect(promise).rejects.toMatchObject({
      code: "timeout",
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the timeout active while reading the response body", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      async (_input, init) =>
        ({
          text: () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener(
                "abort",
                () => reject(init.signal?.reason),
                { once: true },
              );
            }),
        }) as Response,
    );
    const assertion = expect(
      apiClient.get("/projects", { timeoutMs: 50 }),
    ).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timer after success", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(jsonResponse([]));
    await apiClient.get("/projects");
    expect(vi.getTimerCount()).toBe(0);
  });
});

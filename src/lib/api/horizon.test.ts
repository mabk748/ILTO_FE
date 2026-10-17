import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHorizonItem,
  deleteHorizonItem,
  getHorizonEntries,
  updateHorizonItem,
} from "./horizon.ts";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Horizon API adapter", () => {
  it("requests only the visible ISO range and forwards cancellation", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    const controller = new AbortController();
    await getHorizonEntries(
      {
        from: "2026-09-28T00:00:00.000Z",
        to: "2026-11-09T00:00:00.000Z",
      },
      { signal: controller.signal },
    );

    const [url, init] = fetchMock.mock.calls[0];
    const requestUrl = new URL(String(url));
    expect(requestUrl.pathname).toBe("/api/v1/horizon/entries");
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      from: "2026-09-28T00:00:00.000Z",
      to: "2026-11-09T00:00:00.000Z",
    });
    expect(init?.credentials).toBe("include");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses exact standalone create, partial update, and delete requests", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ id: "item-1" }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ id: "item-1" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const input = {
      title: "Focus block",
      starts_at: "2026-10-01T08:00:00.000Z",
      ends_at: null,
      all_day: false,
      description: null,
    };

    await createHorizonItem(input);
    await updateHorizonItem("item-1", { ends_at: null, all_day: true });
    await deleteHorizonItem("item-1");

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.example.test/api/v1/horizon/items",
      "https://api.example.test/api/v1/horizon/items/item-1",
      "https://api.example.test/api/v1/horizon/items/item-1",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "POST",
      "PATCH",
      "DELETE",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(input);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      ends_at: null,
      all_day: true,
    });
    expect(fetchMock.mock.calls[2][1]?.body).toBeUndefined();
  });

  it("rejects invalid ranges before making a request", async () => {
    expect(() =>
      getHorizonEntries({
        from: "2026-10-02T00:00:00.000Z",
        to: "2026-10-01T00:00:00.000Z",
      }),
    ).toThrow(/end is not before its start/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

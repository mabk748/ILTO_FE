import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNode,
  deleteNode,
  getLatestMetric,
  getNodeMetrics,
  updateNode,
} from "./infrastructure.ts";

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("infrastructure backend adapter", () => {
  it("sends the node and time window to the backend without slicing records", async () => {
    const metrics = Array.from({ length: 48 }, (_, i) => ({
      id: String(i),
      node_id: "node/a",
    }));
    const fetchMock = vi.fn().mockResolvedValue(Response.json(metrics));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getNodeMetrics("node/a", 24)).toHaveLength(48);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/infrastructure/nodes/node%2Fa/metrics?hours=24",
    );
  });
  it("preserves an explicit null latest metric but reports unavailable routes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(
        Response.json({ detail: "Not found" }, { status: 404 }),
      )
      .mockResolvedValueOnce(
        Response.json({ detail: "Not found" }, { status: 404 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(getLatestMetric("node-b")).resolves.toBeNull();
    await expect(getLatestMetric("node-b")).rejects.toMatchObject({
      status: 404,
    });
    await expect(getNodeMetrics("node-b")).rejects.toMatchObject({
      status: 404,
    });
  });
  it.each([0, 721, 1.5])(
    "rejects an invalid time window: %s",
    async (hours) => {
      await expect(getNodeMetrics("node-a", hours)).rejects.toThrow(
        "integer from 1 to 720",
      );
    },
  );
  it("uses the plain-record CRUD contract without server-owned fields", async () => {
    const node = {
      id: "node-1",
      name: "Dev",
      hostname: "dev",
      type: "server",
      status: "offline",
      ip_address: "192.0.2.10",
      os: "Linux",
      last_seen: null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(node, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ ...node, name: "Edited" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createNode({
        name: "Dev",
        hostname: "dev",
        type: "server",
        ip_address: "192.0.2.10",
        os: "Linux",
      }),
    ).resolves.toMatchObject({ id: "node-1" });
    await updateNode("node-1", { name: "Edited" });
    await deleteNode("node-1");

    expect(
      fetchMock.mock.calls.map(([url, init]) => [url, init?.method]),
    ).toEqual([
      ["https://api.example.test/api/v1/infrastructure/nodes", "POST"],
      ["https://api.example.test/api/v1/infrastructure/nodes/node-1", "PATCH"],
      ["https://api.example.test/api/v1/infrastructure/nodes/node-1", "DELETE"],
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: "Dev",
      hostname: "dev",
      type: "server",
      ip_address: "192.0.2.10",
      os: "Linux",
    });
  });
});

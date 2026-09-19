import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCertification,
  createDeadline,
  deleteDeadline,
  getComplianceItems,
  updateComplianceItem,
  updateDeadline,
} from "./work.ts";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Work backend adapter", () => {
  it("keeps plain-array compliance responses and sends deadline writes", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(
        Response.json({ id: "deadline-1" }, { status: 201 }),
      );
    await expect(getComplianceItems()).resolves.toEqual([]);
    const input = {
      title: "Disposable Work deadline",
      project_or_context: "Frontend test",
      due_date: "2026-09-16T10:00:00.000Z",
      priority: "high" as const,
      status: "pending" as const,
      notes: "",
    };
    await createDeadline(input);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(input);
    expect(fetchMock.mock.calls[1][1]?.credentials).toBe("include");
  });

  it("sends nullable certification dates and only compliance completion", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ id: "cert-1" }, { status: 201 }))
      .mockResolvedValueOnce(
        Response.json({ id: "compliance-1", completed: true }),
      );
    await createCertification({
      name: "Disposable certification",
      provider: "Test provider",
      status: "planned",
      exam_date: null,
      expiry_date: null,
      study_hours_logged: 0,
      study_hours_target: 10.5,
    });
    await updateComplianceItem("compliance/1", {
      completed: true,
      extra: "ignored",
    } as never);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      exam_date: null,
      expiry_date: null,
      study_hours_target: 10.5,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      completed: true,
    });
    expect(fetchMock.mock.calls[1][0]).toContain("compliance%2F1");
  });

  it("sends changed status and a 204 delete without fabricating success", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ id: "deadline-1" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateDeadline("deadline-1", { status: "completed" });
    await deleteDeadline("deadline/1");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      status: "completed",
    });
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
  });
});

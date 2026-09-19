import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createContact,
  deleteContact,
  getContact,
  getFollowUps,
  updateFollowUp,
} from "./social.ts";

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

describe("Social backend adapter", () => {
  it("preserves completed=false filtering and translates unknown contacts to null", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(
        Response.json({ detail: "Not found" }, { status: 404 }),
      );
    await expect(getFollowUps(false)).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/social/follow-ups?completed=false",
    );
    await expect(getContact("missing")).resolves.toBeNull();
  });

  it("sends nullable contact fields and tags as JSON values", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: "contact-1" }, { status: 201 }),
    );
    const input = {
      name: "Disposable Social contact",
      email: null,
      phone: null,
      relationship: "professional" as const,
      status: "active" as const,
      last_contact: null,
      next_followup: "2026-09-16T10:00:00.000Z",
      notes: "",
      tags: ["frontend", "test"],
    };
    await createContact(input);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(input);
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe("include");
  });

  it("sends only strict follow-up completion and a confirmed contact delete", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: "followup-1", completed: true }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateFollowUp("follow/up", {
      completed: true,
      contact_name: "ignored",
    } as never);
    await deleteContact("contact/1");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      completed: true,
    });
    expect(fetchMock.mock.calls[0][0]).toContain("follow%2Fup");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
  });
});

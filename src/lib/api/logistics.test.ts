import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDocument,
  createLogisticsEvent,
  createTrip,
  deleteDocument,
  deleteLogisticsEvent,
  deleteTrip,
  getChecklists,
  getDocuments,
  getLogisticsEvents,
  getTrips,
  resetChecklist,
  updateChecklistItem,
  updateDocument,
  updateLogisticsEvent,
  updateTrip,
} from "./logistics.ts";

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

describe("Logistics backend adapter", () => {
  it("keeps every Logistics list as a credentialed plain array", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json([])));
    await expect(
      Promise.all([
        getTrips(),
        getChecklists(),
        getDocuments(),
        getLogisticsEvents(),
      ]),
    ).resolves.toEqual([[], [], [], []]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/api/v1/logistics/trips",
      "https://api.example.test/api/v1/logistics/checklists",
      "https://api.example.test/api/v1/logistics/documents",
      "https://api.example.test/api/v1/logistics/events",
    ]);
    expect(
      fetchMock.mock.calls.every(
        ([, options]) => options?.credentials === "include",
      ),
    ).toBe(true);
  });

  it("uses trip, document, and event CRUD paths with caller-provided writable fields", async () => {
    const trip = {
      name: "Disposable trip",
      destination: "Test city",
      status: "planned" as const,
      departure_date: "2026-09-19T10:00:00.000Z",
      return_date: "2026-09-20T10:00:00.000Z",
      notes: "",
      tags: ["test"],
    };
    const document = {
      name: "Disposable document",
      type: "passport" as const,
      issuer: null,
      issue_date: null,
      expiry_date: null,
      renewal_lead_days: 0,
      notes: "",
    };
    const event = {
      title: "Disposable event",
      type: "appointment" as const,
      date: "2026-09-19T10:00:00.000Z",
      end_date: null,
      linked_trip_id: null,
      notes: "",
      completed: false,
    };
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: "trip-1", ...trip }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "document-1", ...document }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "event-1", ...event }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "trip-1", status: "confirmed" }),
      )
      .mockResolvedValueOnce(Response.json({ id: "document-1", issuer: null }))
      .mockResolvedValueOnce(Response.json({ id: "event-1", completed: false }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await createTrip(trip);
    await createDocument(document);
    await createLogisticsEvent(event);
    await updateTrip("trip/1", { status: "confirmed" });
    await updateDocument("document/1", { issuer: null });
    await updateLogisticsEvent("event/1", { completed: false });
    await deleteTrip("trip/1");
    await deleteDocument("document/1");
    await deleteLogisticsEvent("event/1");

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(trip);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(
      document,
    );
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual(event);
    expect(fetchMock.mock.calls[3][0]).toContain("trips/trip%2F1");
    expect(JSON.parse(String(fetchMock.mock.calls[4][1]?.body))).toEqual({
      issuer: null,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[5][1]?.body))).toEqual({
      completed: false,
    });
    expect(
      fetchMock.mock.calls.slice(6).map(([, options]) => options?.method),
    ).toEqual(["DELETE", "DELETE", "DELETE"]);
  });

  it("sends only a checklist completion boolean and an empty reset body", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ id: "item-1", completed: false }))
      .mockResolvedValueOnce(Response.json({ id: "list-1", items: [] }));
    await updateChecklistItem("list/1", "item/1", {
      completed: false,
      label: "ignored",
    } as never);
    await resetChecklist("list/1");
    expect(fetchMock.mock.calls[0][0]).toContain(
      "checklists/list%2F1/items/item%2F1",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      completed: false,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({});
  });
});

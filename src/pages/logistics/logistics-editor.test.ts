import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors.ts";
import type { DocumentRecord, LogisticsEvent, Trip } from "@/lib/api/types.ts";
import {
  buildLogisticsInput,
  changedFields,
  logisticsWriteError,
  toLocalDateTimeValue,
} from "./logistics-editor.ts";

const trip: Trip = {
  id: "trip-1",
  name: "Existing trip",
  destination: "Existing city",
  status: "planned",
  departure_date: "2026-09-20T10:00:00.000Z",
  return_date: "2026-09-22T10:00:00.000Z",
  notes: "",
  tags: ["existing"],
};

const document: DocumentRecord = {
  id: "document-1",
  name: "Existing passport",
  type: "passport",
  issuer: "Authority",
  issue_date: "2026-01-01T10:00:00.000Z",
  expiry_date: "2036-01-01T10:00:00.000Z",
  renewal_lead_days: 0,
  days_until_expiry: 3000,
  status: "valid",
  notes: "Existing note",
};

const event: LogisticsEvent = {
  id: "event-1",
  title: "Existing event",
  type: "appointment",
  date: "2026-09-20T10:00:00.000Z",
  end_date: "2026-09-20T11:00:00.000Z",
  linked_trip_id: "trip-1",
  notes: "Existing note",
  completed: true,
};

describe("Logistics editor contract", () => {
  it("sends only writable trip fields and converts local date-times to UTC instants", () => {
    const input = buildLogisticsInput(
      { kind: "trip", record: trip },
      {
        name: "Disposable trip",
        destination: "Test city",
        status: "confirmed",
        departure_date: "2026-09-21T10:30",
        return_date: "2026-09-22T10:30",
        notes: "  Note  ",
        tags: "test, test, frontend",
      },
    );
    expect(input).toEqual({
      name: "Disposable trip",
      destination: "Test city",
      status: "confirmed",
      departure_date: new Date("2026-09-21T10:30").toISOString(),
      return_date: new Date("2026-09-22T10:30").toISOString(),
      notes: "Note",
      tags: ["test", "frontend"],
    });
    expect(input).not.toHaveProperty("id");
    expect(toLocalDateTimeValue(trip.departure_date)).toMatch(/^2026-09-20T/);
  });

  it("clears only document nullables, preserves zero renewal lead, and excludes server-derived fields", () => {
    const input = buildLogisticsInput(
      { kind: "document", record: document },
      {
        name: "Disposable passport",
        type: "passport",
        issuer: "",
        issue_date: "",
        expiry_date: "",
        renewal_lead_days: "0",
        notes: "",
      },
    );
    expect(input).toEqual({
      name: "Disposable passport",
      type: "passport",
      issuer: null,
      issue_date: null,
      expiry_date: null,
      renewal_lead_days: 0,
      notes: "",
    });
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("days_until_expiry");
    expect(input).not.toHaveProperty("status");
  });

  it("preserves false completion and nullable event links while rejecting date-order errors", () => {
    const input = buildLogisticsInput(
      { kind: "event", record: event },
      {
        title: "Disposable event",
        type: "appointment",
        date: "2026-09-21T10:00",
        end_date: "",
        linked_trip_id: "",
        notes: "",
        completed: false,
      },
    );
    expect(input).toMatchObject({
      end_date: null,
      linked_trip_id: null,
      completed: false,
      date: new Date("2026-09-21T10:00").toISOString(),
    });
    expect(() =>
      buildLogisticsInput(
        { kind: "trip" },
        {
          name: "Trip",
          destination: "City",
          status: "planned",
          departure_date: "2026-09-22T10:00",
          return_date: "2026-09-21T10:00",
          notes: "",
          tags: "",
        },
      ),
    ).toThrow("Departure cannot be after return");
    expect(() =>
      buildLogisticsInput(
        { kind: "document" },
        {
          name: "Document",
          type: "passport",
          issuer: "",
          issue_date: "2026-09-22T10:00",
          expiry_date: "2026-09-21T10:00",
          renewal_lead_days: "0",
          notes: "",
        },
      ),
    ).toThrow("Issue date cannot be after expiry date");
    expect(() =>
      buildLogisticsInput(
        { kind: "event" },
        {
          title: "Event",
          type: "appointment",
          date: "2026-09-22T10:00",
          end_date: "2026-09-21T10:00",
          linked_trip_id: "",
          notes: "",
          completed: false,
        },
      ),
    ).toThrow("Event date cannot be after end date");
  });

  it("omits no-op PATCH fields but retains explicit nullable clears and explains API failures", () => {
    const unchanged = {
      name: document.name,
      type: document.type,
      issuer: document.issuer,
      issue_date: document.issue_date,
      expiry_date: document.expiry_date,
      renewal_lead_days: document.renewal_lead_days,
      notes: document.notes,
    };
    expect(changedFields(unchanged, document)).toEqual({});
    expect(changedFields({ ...unchanged, issuer: null }, document)).toEqual({
      issuer: null,
    });
    expect(
      logisticsWriteError(new ApiError("Unavailable", "http", { status: 503 })),
    ).toContain("could not confirm");
  });
});

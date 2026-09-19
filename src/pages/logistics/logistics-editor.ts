import * as api from "@/lib/api/logistics.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  DocumentRecord,
  DocumentType,
  LogisticsEvent,
  Trip,
  TripStatus,
} from "@/lib/api/types.ts";

export const tripStatuses = [
  "planned",
  "confirmed",
  "active",
  "completed",
  "cancelled",
] as const satisfies readonly TripStatus[];

export const documentTypes = [
  "passport",
  "id_card",
  "drivers_license",
  "visa",
  "insurance",
  "subscription",
  "certification",
  "other",
] as const satisfies readonly DocumentType[];

export const eventTypes = [
  "trip",
  "appointment",
  "renewal",
  "admin",
  "reminder",
] as const satisfies readonly LogisticsEvent["type"][];

export type LogisticsTarget =
  | { kind: "trip"; record?: Trip }
  | { kind: "document"; record?: DocumentRecord }
  | { kind: "event"; record?: LogisticsEvent };

export type LogisticsDraft = Record<string, string | boolean>;

export function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toUtcIso(value: string, label: string): string {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) {
    throw new Error(`${label} must be a valid date and time.`);
  }
  return date.toISOString();
}

function nullableUtcIso(value: string, label: string): string | null {
  return value.trim() === "" ? null : toUtcIso(value, label);
}

function requiredText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

function optionalText(value: string): string {
  return value.trim();
}

function choice<T extends string>(
  value: string,
  options: readonly T[],
  label: string,
): T {
  if (!options.includes(value as T))
    throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

function nonnegativeInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a nonnegative whole number.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} must be a nonnegative whole number.`);
  }
  return parsed;
}

function tags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

function assertDateOrder(
  first: string | null,
  second: string | null,
  firstLabel: string,
  secondLabel: string,
): void {
  if (
    first !== null &&
    second !== null &&
    Date.parse(first) > Date.parse(second)
  ) {
    throw new Error(`${firstLabel} cannot be after ${secondLabel}.`);
  }
}

export function initialDraft(target: LogisticsTarget): LogisticsDraft {
  const now = toLocalDateTimeValue(new Date().toISOString());
  if (target.kind === "trip") {
    return {
      name: target.record?.name ?? "",
      destination: target.record?.destination ?? "",
      status: target.record?.status ?? "planned",
      departure_date: target.record
        ? toLocalDateTimeValue(target.record.departure_date)
        : now,
      return_date: target.record
        ? toLocalDateTimeValue(target.record.return_date)
        : now,
      notes: target.record?.notes ?? "",
      tags: target.record?.tags.join(", ") ?? "",
    };
  }
  if (target.kind === "document") {
    return {
      name: target.record?.name ?? "",
      type: target.record?.type ?? "passport",
      issuer: target.record?.issuer ?? "",
      issue_date: target.record?.issue_date
        ? toLocalDateTimeValue(target.record.issue_date)
        : "",
      expiry_date: target.record?.expiry_date
        ? toLocalDateTimeValue(target.record.expiry_date)
        : "",
      renewal_lead_days: target.record?.renewal_lead_days.toString() ?? "0",
      notes: target.record?.notes ?? "",
    };
  }
  return {
    title: target.record?.title ?? "",
    type: target.record?.type ?? "appointment",
    date: target.record ? toLocalDateTimeValue(target.record.date) : now,
    end_date: target.record?.end_date
      ? toLocalDateTimeValue(target.record.end_date)
      : "",
    linked_trip_id: target.record?.linked_trip_id ?? "",
    notes: target.record?.notes ?? "",
    completed: target.record?.completed ?? false,
  };
}

export function buildLogisticsInput(
  target: LogisticsTarget,
  values: LogisticsDraft,
):
  | api.CreateTripInput
  | api.CreateDocumentInput
  | api.CreateLogisticsEventInput {
  if (target.kind === "trip") {
    const departure_date = toUtcIso(String(values.departure_date), "Departure");
    const return_date = toUtcIso(String(values.return_date), "Return");
    assertDateOrder(departure_date, return_date, "Departure", "return");
    return {
      name: requiredText(String(values.name), "Name"),
      destination: requiredText(String(values.destination), "Destination"),
      status: choice(String(values.status), tripStatuses, "trip status"),
      departure_date,
      return_date,
      notes: optionalText(String(values.notes)),
      tags: tags(String(values.tags)),
    };
  }
  if (target.kind === "document") {
    const issue_date = nullableUtcIso(String(values.issue_date), "Issue date");
    const expiry_date = nullableUtcIso(
      String(values.expiry_date),
      "Expiry date",
    );
    assertDateOrder(issue_date, expiry_date, "Issue date", "expiry date");
    return {
      name: requiredText(String(values.name), "Name"),
      type: choice(String(values.type), documentTypes, "document type"),
      issuer:
        String(values.issuer).trim() === ""
          ? null
          : optionalText(String(values.issuer)),
      issue_date,
      expiry_date,
      renewal_lead_days: nonnegativeInteger(
        String(values.renewal_lead_days),
        "Renewal lead days",
      ),
      notes: optionalText(String(values.notes)),
    };
  }
  const date = toUtcIso(String(values.date), "Event date");
  const end_date = nullableUtcIso(String(values.end_date), "End date");
  assertDateOrder(date, end_date, "Event date", "end date");
  return {
    title: requiredText(String(values.title), "Title"),
    type: choice(String(values.type), eventTypes, "event type"),
    date,
    end_date,
    linked_trip_id: String(values.linked_trip_id).trim() || null,
    notes: optionalText(String(values.notes)),
    completed: values.completed === true,
  };
}

function same(key: string, left: unknown, right: unknown): boolean {
  if (
    key === "departure_date" ||
    key === "return_date" ||
    key === "issue_date" ||
    key === "expiry_date" ||
    key === "date" ||
    key === "end_date"
  ) {
    const leftTime = typeof left === "string" ? Date.parse(left) : NaN;
    const rightTime = typeof right === "string" ? Date.parse(right) : NaN;
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return leftTime === rightTime;
    }
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => item === right[index])
    );
  }
  return left === right;
}

export function changedFields<T extends object>(
  input: T,
  original: object,
): Partial<T> {
  const record = original as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => !same(key, value, record[key]),
    ),
  ) as Partial<T>;
}

export async function saveLogisticsResource(
  target: LogisticsTarget,
  values: LogisticsDraft,
) {
  const input = buildLogisticsInput(target, values);
  if (target.kind === "trip") {
    return target.record
      ? api.updateTrip(
          target.record.id,
          changedFields(input as api.CreateTripInput, target.record),
        )
      : api.createTrip(input as api.CreateTripInput);
  }
  if (target.kind === "document") {
    return target.record
      ? api.updateDocument(
          target.record.id,
          changedFields(input as api.CreateDocumentInput, target.record),
        )
      : api.createDocument(input as api.CreateDocumentInput);
  }
  return target.record
    ? api.updateLogisticsEvent(
        target.record.id,
        changedFields(input as api.CreateLogisticsEventInput, target.record),
      )
    : api.createLogisticsEvent(input as api.CreateLogisticsEventInput);
}

export function removeLogisticsResource(
  target: LogisticsTarget,
): Promise<void> {
  if (!target.record) throw new Error("Select a saved record first.");
  if (target.kind === "trip") return api.deleteTrip(target.record.id);
  if (target.kind === "document") return api.deleteDocument(target.record.id);
  return api.deleteLogisticsEvent(target.record.id);
}

export function logisticsWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "This Logistics record no longer exists. Refresh and try again.";
    }
    if (error.status === 409) {
      return "The backend rejected this change because it conflicts with related Logistics data.";
    }
    if (error.status === 422) {
      return "The backend rejected these values. Check the required fields and timestamps.";
    }
    if (
      error.status === 503 ||
      error.code === "network" ||
      error.code === "timeout"
    ) {
      return "The backend could not confirm this change. Refresh and check whether it was saved before retrying.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Could not save the Logistics change.";
}

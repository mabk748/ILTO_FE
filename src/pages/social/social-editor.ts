import * as api from "@/lib/api/social.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  Contact,
  ContactStatus,
  RelationshipType,
} from "@/lib/api/types.ts";
import {
  detectedTimeZone,
  toZonedDateTimeInput,
  zonedDateTimeToUtc,
} from "@/lib/time-zone.ts";

export const relationshipTypes = [
  "professional",
  "personal",
  "mentor",
  "mentee",
  "client",
] as const satisfies readonly RelationshipType[];
export const contactStatuses = [
  "active",
  "dormant",
  "lost",
] as const satisfies readonly ContactStatus[];

export type ContactDraft = Record<string, string>;

export function toLocalDateTimeValue(
  value: string,
  timeZone = detectedTimeZone(),
): string {
  return toZonedDateTimeInput(value, timeZone);
}

function text(value: string, label: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed || value.length > maxLength) {
    throw new Error(
      `${label} is required and must be at most ${maxLength} characters.`,
    );
  }
  return trimmed;
}

function optionalText(value: string, label: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new Error(`${label} must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function nullableText(
  value: string,
  label: string,
  maxLength: number,
): string | null {
  const trimmed = optionalText(value, label, maxLength);
  return trimmed || null;
}

function nullableUtcIso(
  value: string,
  label: string,
  timeZone: string,
): string | null {
  return value.trim() === ""
    ? null
    : zonedDateTimeToUtc(value, timeZone, label);
}

function choice<T extends string>(
  value: string,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(value as T)) throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

export function tags(value: string): string[] {
  if (!value.trim()) return [];
  const result = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (result.length > 20)
    throw new Error("A contact may have at most 20 tags.");
  if (result.some((tag) => tag.length > 50)) {
    throw new Error("Each tag must be at most 50 characters.");
  }
  return result;
}

export function initialDraft(
  contact?: Contact,
  timeZone = detectedTimeZone(),
): ContactDraft {
  return {
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    relationship: contact?.relationship ?? "professional",
    status: contact?.status ?? "active",
    last_contact: contact?.last_contact
      ? toLocalDateTimeValue(contact.last_contact, timeZone)
      : "",
    next_followup: contact?.next_followup
      ? toLocalDateTimeValue(contact.next_followup, timeZone)
      : "",
    notes: contact?.notes ?? "",
    tags: contact?.tags.join(", ") ?? "",
  };
}

export function buildContactInput(
  values: ContactDraft,
  timeZone = detectedTimeZone(),
): api.CreateContactInput {
  return {
    name: text(values.name, "Name", 200),
    email: nullableText(values.email, "Email", 320),
    phone: nullableText(values.phone, "Phone", 100),
    relationship: choice(
      values.relationship,
      relationshipTypes,
      "relationship",
    ),
    status: choice(values.status, contactStatuses, "contact status"),
    last_contact: nullableUtcIso(values.last_contact, "Last contact", timeZone),
    next_followup: nullableUtcIso(
      values.next_followup,
      "Next follow-up",
      timeZone,
    ),
    notes: optionalText(values.notes, "Notes", 4000),
    tags: tags(values.tags),
  };
}

function same(left: unknown, right: unknown, key: string): boolean {
  if (key === "last_contact" || key === "next_followup") {
    const leftTime = typeof left === "string" ? Date.parse(left) : NaN;
    const rightTime = typeof right === "string" ? Date.parse(right) : NaN;
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return leftTime === rightTime;
    }
  }
  return Array.isArray(left) && Array.isArray(right)
    ? JSON.stringify(left) === JSON.stringify(right)
    : left === right;
}

export function changedFields<T extends object>(
  input: T,
  original: object,
): Partial<T> {
  const record = original as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => !same(value, record[key], key),
    ),
  ) as Partial<T>;
}

export async function saveContact(
  contact: Contact | undefined,
  values: ContactDraft,
  timeZone = detectedTimeZone(),
) {
  const input = buildContactInput(values, timeZone);
  return contact
    ? api.updateContact(contact.id, changedFields(input, contact))
    : api.createContact(input);
}

export function socialWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This Social record no longer exists. Refresh and try again.";
    if (error.status === 409)
      return "The backend rejected this change because it conflicts with related Social data.";
    if (error.status === 422)
      return "The backend rejected these values. Check the required fields, tags, and timestamps.";
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
    : "Could not save the Social change.";
}

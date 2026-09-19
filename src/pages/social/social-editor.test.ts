import { describe, expect, it } from "vitest";
import type { Contact } from "@/lib/api/types.ts";
import { ApiError } from "@/lib/api/errors.ts";
import {
  buildContactInput,
  changedFields,
  socialWriteError,
  tags,
  toLocalDateTimeValue,
} from "./social-editor.ts";

const contact: Contact = {
  id: "contact-1",
  name: "Existing contact",
  email: "existing@example.test",
  phone: null,
  relationship: "mentor",
  status: "active",
  last_contact: "2026-09-15T10:00:00.000Z",
  next_followup: null,
  notes: "Notes",
  tags: ["frontend", "test"],
};

describe("Social contact editor", () => {
  it("converts date inputs to UTC, clears blank nullable fields, and excludes IDs", () => {
    const input = buildContactInput({
      name: "Disposable contact",
      email: "",
      phone: "",
      relationship: "professional",
      status: "dormant",
      last_contact: "2026-09-16T12:00",
      next_followup: "",
      notes: "",
      tags: "frontend, test",
    });
    expect(input).toMatchObject({
      email: null,
      phone: null,
      next_followup: null,
      last_contact: expect.stringMatching(/Z$/),
      tags: ["frontend", "test"],
    });
    expect(input).not.toHaveProperty("id");
    expect(toLocalDateTimeValue("2026-09-16T10:00:00.000Z")).toMatch(
      /^2026-09-16T/,
    );
  });

  it("validates tags and optional field limits", () => {
    expect(tags("")).toEqual([]);
    expect(() =>
      tags(Array.from({ length: 21 }, (_, index) => `tag-${index}`).join(",")),
    ).toThrow("at most 20");
    expect(() => tags("x".repeat(51))).toThrow("at most 50");
    expect(() =>
      buildContactInput({
        name: "Contact",
        email: "x".repeat(321),
        phone: "",
        relationship: "professional",
        status: "active",
        last_contact: "",
        next_followup: "",
        notes: "",
        tags: "",
      }),
    ).toThrow("Email");
  });

  it("omits unchanged fields but sends explicit null clears in PATCH", () => {
    const sameInput = {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      relationship: contact.relationship,
      status: contact.status,
      last_contact: contact.last_contact,
      next_followup: contact.next_followup,
      notes: contact.notes,
      tags: contact.tags,
    };
    expect(changedFields(sameInput, contact)).toEqual({});
    expect(
      changedFields({ email: null, tags: ["frontend", "test"] }, contact),
    ).toEqual({ email: null });
    expect(
      changedFields(
        { last_contact: "2026-09-15T10:00:00.000Z" },
        { last_contact: "2026-09-15T11:00:00+01:00" },
      ),
    ).toEqual({});
  });

  it.each([404, 409, 422, 503])(
    "maps HTTP %s without claiming success",
    (status) => {
      expect(
        socialWriteError(new ApiError("backend", "http", { status })),
      ).toMatch(/record|conflict|rejected|confirm/);
    },
  );
});

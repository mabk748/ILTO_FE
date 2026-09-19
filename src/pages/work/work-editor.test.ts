import { describe, expect, it } from "vitest";
import type { Certification, WorkDeadline } from "@/lib/api/types.ts";
import { ApiError } from "@/lib/api/errors.ts";
import {
  buildWorkInput,
  changedFields,
  toLocalDateTimeValue,
  workWriteError,
} from "./work-editor.ts";

const overdueDeadline: WorkDeadline = {
  id: "deadline-1",
  title: "Existing deadline",
  project_or_context: "Frontend",
  due_date: "2026-09-15T10:00:00.000Z",
  priority: "high",
  status: "overdue",
  notes: "",
};

const certification: Certification = {
  id: "cert-1",
  name: "Existing certification",
  provider: "Provider",
  status: "in_progress",
  exam_date: null,
  expiry_date: null,
  study_hours_logged: 12.5,
  study_hours_target: 10,
};

describe("Work editor contract", () => {
  it("converts deadline inputs to UTC and excludes server-owned IDs", () => {
    const input = buildWorkInput(
      { kind: "deadline" },
      {
        title: "Disposable deadline",
        project_or_context: "Frontend",
        due_date: "2026-09-16T12:00",
        priority: "critical",
        status: "pending",
        notes: "",
      },
    );
    expect(input).toMatchObject({
      title: "Disposable deadline",
      priority: "critical",
      status: "pending",
      due_date: expect.stringMatching(/Z$/),
    });
    expect(input).not.toHaveProperty("id");
    expect(toLocalDateTimeValue("2026-09-16T10:00:00.000Z")).toMatch(
      /^2026-09-16T/,
    );
  });

  it("supports nullable certification dates and strict decimal study hours", () => {
    expect(
      buildWorkInput(
        { kind: "certification" },
        {
          name: "Certification",
          provider: "Provider",
          status: "planned",
          exam_date: "",
          expiry_date: "",
          study_hours_logged: "100000",
          study_hours_target: "0",
        },
      ),
    ).toMatchObject({
      exam_date: null,
      expiry_date: null,
      study_hours_logged: 100000,
    });
    expect(() =>
      buildWorkInput(
        { kind: "certification" },
        {
          name: "Certification",
          provider: "Provider",
          status: "planned",
          exam_date: "",
          expiry_date: "",
          study_hours_logged: "1.234",
          study_hours_target: "0",
        },
      ),
    ).toThrow("at most two decimals");
    expect(() =>
      buildWorkInput(
        { kind: "certification" },
        {
          name: "Certification",
          provider: "Provider",
          status: "planned",
          exam_date: "",
          expiry_date: "",
          study_hours_logged: "-1",
          study_hours_target: "0",
        },
      ),
    ).toThrow("nonnegative");
  });

  it("treats an unchanged derived overdue status as a no-op PATCH", () => {
    const input = buildWorkInput(
      { kind: "deadline", record: overdueDeadline },
      {
        title: "Existing deadline",
        project_or_context: "Frontend",
        due_date: toLocalDateTimeValue(overdueDeadline.due_date),
        priority: "high",
        status: "pending",
        notes: "",
      },
    );
    expect(changedFields(input, overdueDeadline)).toEqual({});
    expect(changedFields({ status: "completed" }, overdueDeadline)).toEqual({
      status: "completed",
    });
    expect(
      changedFields(
        { due_date: "2026-09-15T10:00:00.000Z" },
        { due_date: "2026-09-15T11:00:00+01:00" },
      ),
    ).toEqual({});
  });

  it.each([404, 409, 422, 503])(
    "maps HTTP %s without claiming success",
    (status) => {
      expect(
        workWriteError(new ApiError("backend", "http", { status })),
      ).toMatch(/record|conflict|rejected|confirm/);
    },
  );

  it("permits logged hours above the target without changing the target", () => {
    const input = buildWorkInput(
      { kind: "certification", record: certification },
      {
        name: certification.name,
        provider: certification.provider,
        status: certification.status,
        exam_date: "",
        expiry_date: "",
        study_hours_logged: "12.5",
        study_hours_target: "10",
      },
    );
    expect(input).toMatchObject({
      study_hours_logged: 12.5,
      study_hours_target: 10,
    });
  });
});

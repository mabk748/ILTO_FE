import { describe, expect, it } from "vitest";
import type { BudgetCategory, Transaction } from "@/lib/api/types.ts";
import {
  buildFinanceInput,
  changedFields,
  financeWriteError,
  toLocalDateTimeValue,
} from "./finance-editor.ts";
import { ApiError } from "@/lib/api/errors.ts";

const category: BudgetCategory = {
  id: "category-1",
  name: "Housing",
  monthly_limit: 1000,
  spent_this_month: 40,
  color: "#123456",
};

describe("Finance editor contract", () => {
  it("converts local date input to UTC and excludes server-owned category data", () => {
    expect(
      buildFinanceInput(
        { kind: "transaction" },
        {
          category_id: "category-1",
          type: "expense",
          amount: "12.50",
          currency: "EUR",
          description: "Lunch",
          date: "2026-09-15T12:00",
          tags: "food, work",
        },
        [category],
      ),
    ).toMatchObject({
      amount: 12.5,
      currency: "EUR",
      tags: ["food", "work"],
    });
    expect(
      buildFinanceInput(
        { kind: "category" },
        { name: "Housing", monthly_limit: "1000", color: "#123456" },
        [],
      ),
    ).toEqual({ name: "Housing", monthly_limit: 1000, color: "#123456" });
    expect(toLocalDateTimeValue("2026-09-15T10:00:00.000Z")).toMatch(
      /^2026-09-15T/,
    );
  });

  it("rejects non-EUR, invalid decimals, unknown categories, and bad colors", () => {
    const transaction = {
      category_id: "category-1",
      type: "expense",
      amount: "1.234",
      currency: "EUR",
      description: "",
      date: "2026-09-15T12:00",
      tags: "",
    };
    expect(() =>
      buildFinanceInput({ kind: "transaction" }, transaction, [category]),
    ).toThrow("at most two decimals");
    expect(() =>
      buildFinanceInput(
        { kind: "transaction" },
        { ...transaction, amount: "1", currency: "USD" },
        [category],
      ),
    ).toThrow("must be EUR");
    expect(() =>
      buildFinanceInput(
        { kind: "transaction" },
        { ...transaction, amount: "1", category_id: "missing" },
        [category],
      ),
    ).toThrow("existing budget category");
    expect(() =>
      buildFinanceInput(
        { kind: "category" },
        { name: "Housing", monthly_limit: "0", color: "red" },
        [],
      ),
    ).toThrow("six-digit");
    expect(() =>
      buildFinanceInput(
        { kind: "transaction" },
        {
          ...transaction,
          amount: "1",
          tags: Array.from({ length: 21 }, (_, index) => `tag-${index}`).join(
            ",",
          ),
        },
        [category],
      ),
    ).toThrow("at most 20 tags");
  });

  it("supports PATCH no-op comparison including tag arrays", () => {
    const original: Pick<Transaction, "amount" | "tags"> = {
      amount: 10,
      tags: ["one", "two"],
    };
    expect(
      changedFields({ amount: 10, tags: ["one", "two"] }, original),
    ).toEqual({});
    expect(
      changedFields({ amount: 11, tags: ["one", "two"] }, original),
    ).toEqual({
      amount: 11,
    });
    expect(
      changedFields(
        { due_date: "2026-09-15T10:00:00.000Z" },
        { due_date: "2026-09-15T11:00:00+01:00" },
      ),
    ).toEqual({});
  });

  it.each([404, 409, 422, 503])("maps HTTP %s honestly", (status) => {
    expect(
      financeWriteError(new ApiError("backend", "http", { status })),
    ).toMatch(/record|conflict|rejected|confirm/);
  });
});

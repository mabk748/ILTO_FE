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
  currency: "EUR",
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
          payment_type: "card",
          description: "Lunch",
          date: "2026-09-15T12:00",
          tags: "food, work",
        },
        [category],
      ),
    ).toMatchObject({
      amount: 12.5,
      currency: "EUR",
      payment_type: "card",
      tags: ["food", "work"],
    });
    expect(
      buildFinanceInput(
        { kind: "category" },
        {
          name: "Housing",
          monthly_limit: "1000",
          currency: "MAD",
          color: "#123456",
        },
        [],
      ),
    ).toEqual({
      name: "Housing",
      monthly_limit: 1000,
      currency: "MAD",
      color: "#123456",
    });
    expect(toLocalDateTimeValue("2026-09-15T10:00:00.000Z")).toMatch(
      /^2026-09-15T/,
    );
    expect(
      buildFinanceInput(
        { kind: "bill" },
        {
          name: "Hosting",
          amount: "15.00",
          currency: "USD",
          due_date: "2026-09-15T12:00",
          recurrence: "monthly",
          paid: "false",
          category: "Software",
        },
        [],
      ),
    ).toMatchObject({ amount: 15, currency: "USD", paid: false });
  });

  it("uses the configured time zone for transaction wall time", () => {
    const input = buildFinanceInput(
      { kind: "transaction" },
      {
        category_id: "category-1",
        type: "expense",
        amount: "12.50",
        currency: "EUR",
        payment_type: "bank_transfer",
        description: "Lunch",
        date: "2026-01-15T07:30",
        tags: "food",
      },
      [category],
      "America/New_York",
    );
    expect(input).toMatchObject({
      payment_type: "bank_transfer",
      date: "2026-01-15T12:30:00.000Z",
    });
  });

  it("accepts EUR/MAD/USD and rejects unsupported or mismatched currencies", () => {
    const transaction = {
      category_id: "category-1",
      type: "expense",
      amount: "1.234",
      currency: "EUR",
      payment_type: "cash",
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
        { ...transaction, amount: "1", currency: "GBP" },
        [category],
      ),
    ).toThrow("valid currency");
    expect(() =>
      buildFinanceInput(
        { kind: "transaction" },
        { ...transaction, amount: "1", currency: "USD" },
        [category],
      ),
    ).toThrow("match its budget category currency");
    expect(
      buildFinanceInput(
        { kind: "transaction" },
        { ...transaction, amount: "1", currency: "MAD" },
        [{ ...category, currency: "MAD" }],
      ),
    ).toMatchObject({ amount: 1, currency: "MAD" });
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
        {
          name: "Housing",
          monthly_limit: "0",
          currency: "USD",
          color: "red",
        },
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
        { amount: 10, currency: "MAD" as const },
        { amount: 10, currency: "EUR" as const },
      ),
    ).toEqual({ currency: "MAD" });
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

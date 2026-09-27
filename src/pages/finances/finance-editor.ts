import * as api from "@/lib/api/finances.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  Bill,
  BudgetCategory,
  FinanceCurrency,
  PaymentType,
  Transaction,
  TransactionType,
} from "@/lib/api/types.ts";
import { FINANCE_CURRENCIES, financeCurrency } from "@/lib/finance.ts";
import {
  detectedTimeZone,
  toZonedDateTimeInput,
  zonedDateTimeToUtc,
} from "@/lib/time-zone.ts";

export type FinanceTarget =
  | { kind: "category"; record?: BudgetCategory }
  | { kind: "transaction"; record?: Transaction }
  | { kind: "bill"; record?: Bill };

export type FinanceDraft = Record<string, string>;

export const transactionTypes: TransactionType[] = [
  "income",
  "expense",
  "transfer",
  "investment",
];
export const paymentTypes: PaymentType[] = [
  "cash",
  "bank_transfer",
  "card",
  "mobile_payment",
  "direct_debit",
  "other",
];
export const recurrences: Bill["recurrence"][] = [
  "monthly",
  "quarterly",
  "annual",
  "one_time",
];

/** datetime-local is display-only; writes are always converted back to UTC. */
export function toLocalDateTimeValue(
  iso: string,
  timeZone = detectedTimeZone(),
): string {
  return toZonedDateTimeInput(iso, timeZone);
}

function text(value: string, label: string, maxLength: number): string {
  if (!value.trim() || value.length > maxLength) {
    throw new Error(
      `${label} is required and must be at most ${maxLength} characters.`,
    );
  }
  return value.trim();
}

function optionalText(value: string, label: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new Error(`${label} must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function decimal(value: string, label: string, allowZero: boolean): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(
      `${label} must be a positive amount with at most two decimals.`,
    );
  }
  if (value.replace(".", "").length > 15) {
    throw new Error(`${label} must contain at most 15 total digits.`);
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || (allowZero ? amount < 0 : amount <= 0)) {
    throw new Error(
      `${label} must be ${allowZero ? "zero or positive" : "positive"}.`,
    );
  }
  return amount;
}

function choice<T extends string>(
  value: string,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(value as T)) throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

function tags(value: string): string[] {
  if (!value.trim()) return [];
  const result = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (result.some((tag) => tag.length > 50))
    throw new Error("Each tag must be at most 50 characters.");
  if (result.length > 20)
    throw new Error("A transaction may have at most 20 tags.");
  return result;
}

export function initialDraft(
  target: FinanceTarget,
  defaultCurrency: FinanceCurrency = "EUR",
  timeZone = detectedTimeZone(),
): FinanceDraft {
  if (target.kind === "category") {
    return {
      name: target.record?.name ?? "",
      monthly_limit: target.record?.monthly_limit.toString() ?? "0",
      currency: financeCurrency(target.record?.currency ?? defaultCurrency),
      color: target.record?.color ?? "#6366f1",
    };
  }
  if (target.kind === "transaction") {
    return {
      category_id: target.record?.category_id ?? "",
      type: target.record?.type ?? "expense",
      amount: target.record?.amount.toString() ?? "",
      currency: financeCurrency(target.record?.currency ?? defaultCurrency),
      payment_type: target.record
        ? (target.record.payment_type ?? "other")
        : "card",
      description: target.record?.description ?? "",
      date: target.record
        ? toLocalDateTimeValue(target.record.date, timeZone)
        : toLocalDateTimeValue(new Date().toISOString(), timeZone),
      tags: target.record?.tags.join(", ") ?? "",
    };
  }
  return {
    name: target.record?.name ?? "",
    amount: target.record?.amount.toString() ?? "",
    currency: financeCurrency(target.record?.currency ?? defaultCurrency),
    due_date: target.record
      ? toLocalDateTimeValue(target.record.due_date, timeZone)
      : toLocalDateTimeValue(new Date().toISOString(), timeZone),
    recurrence: target.record?.recurrence ?? "one_time",
    paid: String(target.record?.paid ?? false),
    category: target.record?.category ?? "",
  };
}

export function buildFinanceInput(
  target: FinanceTarget,
  values: FinanceDraft,
  categories: BudgetCategory[],
  timeZone = detectedTimeZone(),
):
  | api.CreateBudgetCategoryInput
  | api.CreateTransactionInput
  | api.CreateBillInput {
  if (target.kind === "category") {
    if (!/^#[0-9a-f]{6}$/i.test(values.color))
      throw new Error(
        "Color must be a six-digit hexadecimal value such as #6366f1.",
      );
    return {
      name: text(values.name, "Name", 200),
      monthly_limit: decimal(values.monthly_limit, "Monthly limit", true),
      currency: choice(values.currency, FINANCE_CURRENCIES, "currency"),
      color: values.color,
    };
  }
  if (target.kind === "transaction") {
    const category = categories.find(
      (candidate) => candidate.id === values.category_id,
    );
    if (!category) throw new Error("Choose an existing budget category.");
    const currency = choice(values.currency, FINANCE_CURRENCIES, "currency");
    if (currency !== financeCurrency(category.currency)) {
      throw new Error(
        "Transaction currency must match its budget category currency.",
      );
    }
    return {
      category_id: values.category_id,
      type: choice(values.type, transactionTypes, "transaction type"),
      amount: decimal(values.amount, "Amount", false),
      currency,
      payment_type: choice(values.payment_type, paymentTypes, "payment type"),
      description: optionalText(values.description, "Description", 4000),
      date: zonedDateTimeToUtc(values.date, timeZone, "Transaction date"),
      tags: tags(values.tags),
    };
  }
  return {
    name: text(values.name, "Name", 200),
    amount: decimal(values.amount, "Amount", false),
    currency: choice(values.currency, FINANCE_CURRENCIES, "currency"),
    due_date: zonedDateTimeToUtc(values.due_date, timeZone, "Due date"),
    recurrence: choice(values.recurrence, recurrences, "recurrence"),
    paid: values.paid === "true",
    category: text(values.category, "Category", 200),
  };
}

function same(left: unknown, right: unknown, key: string): boolean {
  if (
    (key === "date" || key === "due_date") &&
    typeof left === "string" &&
    typeof right === "string"
  ) {
    const leftInstant = Date.parse(left);
    const rightInstant = Date.parse(right);
    if (Number.isFinite(leftInstant) && Number.isFinite(rightInstant)) {
      return leftInstant === rightInstant;
    }
  }
  return Array.isArray(left) && Array.isArray(right)
    ? JSON.stringify(left) === JSON.stringify(right)
    : left === right;
}

export function changedFields<T extends object>(
  input: T,
  original: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => !same(value, original[key as keyof T], key),
    ),
  ) as Partial<T>;
}

export async function saveFinanceResource(
  target: FinanceTarget,
  values: FinanceDraft,
  categories: BudgetCategory[],
  timeZone = detectedTimeZone(),
) {
  if (target.kind === "category") {
    const input = buildFinanceInput(
      target,
      values,
      categories,
      timeZone,
    ) as api.CreateBudgetCategoryInput;
    return target.record
      ? api.updateBudgetCategory(
          target.record.id,
          changedFields(input, target.record),
        )
      : api.createBudgetCategory(input);
  }
  if (target.kind === "transaction") {
    const input = buildFinanceInput(
      target,
      values,
      categories,
      timeZone,
    ) as api.CreateTransactionInput;
    return target.record
      ? api.updateTransaction(
          target.record.id,
          changedFields(input, target.record),
        )
      : api.createTransaction(input);
  }
  const input = buildFinanceInput(
    target,
    values,
    categories,
    timeZone,
  ) as api.CreateBillInput;
  return target.record
    ? api.updateBill(target.record.id, changedFields(input, target.record))
    : api.createBill(input);
}

export function removeFinanceResource(target: FinanceTarget): Promise<void> {
  if (!target.record) throw new Error("Select a saved record first.");
  if (target.kind === "category")
    return api.deleteBudgetCategory(target.record.id);
  if (target.kind === "transaction")
    return api.deleteTransaction(target.record.id);
  return api.deleteBill(target.record.id);
}

export function financeWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This financial record or category no longer exists. Refresh before trying again.";
    if (error.status === 409)
      return "This change conflicts with related financial records. Nothing was cascade-deleted.";
    if (error.status === 422)
      return "The backend rejected these financial values. Check the currency, amount, date, category, and required fields.";
    if (
      error.status === 503 ||
      error.code === "network" ||
      error.code === "timeout"
    )
      return "The backend could not confirm this financial change. Refresh and check whether it was saved before retrying.";
  }
  return error instanceof Error
    ? error.message
    : "Could not save the financial change.";
}

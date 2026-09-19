import * as api from "@/lib/api/finances.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  Bill,
  BudgetCategory,
  Transaction,
  TransactionType,
} from "@/lib/api/types.ts";

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
export const recurrences: Bill["recurrence"][] = [
  "monthly",
  "quarterly",
  "annual",
  "one_time",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** datetime-local is display-only; writes are always converted back to UTC. */
export function toLocalDateTimeValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toUtcIso(value: string, label: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid timezone-aware date and time.`);
  }
  return date.toISOString();
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

export function initialDraft(target: FinanceTarget): FinanceDraft {
  if (target.kind === "category") {
    return {
      name: target.record?.name ?? "",
      monthly_limit: target.record?.monthly_limit.toString() ?? "0",
      color: target.record?.color ?? "#6366f1",
    };
  }
  if (target.kind === "transaction") {
    return {
      category_id: target.record?.category_id ?? "",
      type: target.record?.type ?? "expense",
      amount: target.record?.amount.toString() ?? "",
      currency: "EUR",
      description: target.record?.description ?? "",
      date: target.record
        ? toLocalDateTimeValue(target.record.date)
        : toLocalDateTimeValue(new Date().toISOString()),
      tags: target.record?.tags.join(", ") ?? "",
    };
  }
  return {
    name: target.record?.name ?? "",
    amount: target.record?.amount.toString() ?? "",
    due_date: target.record
      ? toLocalDateTimeValue(target.record.due_date)
      : toLocalDateTimeValue(new Date().toISOString()),
    recurrence: target.record?.recurrence ?? "one_time",
    paid: String(target.record?.paid ?? false),
    category: target.record?.category ?? "",
  };
}

export function buildFinanceInput(
  target: FinanceTarget,
  values: FinanceDraft,
  categories: BudgetCategory[],
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
      color: values.color,
    };
  }
  if (target.kind === "transaction") {
    if (!categories.some((category) => category.id === values.category_id))
      throw new Error("Choose an existing budget category.");
    if (values.currency !== "EUR")
      throw new Error("Transaction currency must be EUR.");
    return {
      category_id: values.category_id,
      type: choice(values.type, transactionTypes, "transaction type"),
      amount: decimal(values.amount, "Amount", false),
      currency: "EUR",
      description: optionalText(values.description, "Description", 4000),
      date: toUtcIso(values.date, "Transaction date"),
      tags: tags(values.tags),
    };
  }
  return {
    name: text(values.name, "Name", 200),
    amount: decimal(values.amount, "Amount", false),
    due_date: toUtcIso(values.due_date, "Due date"),
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
) {
  if (target.kind === "category") {
    const input = buildFinanceInput(
      target,
      values,
      categories,
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

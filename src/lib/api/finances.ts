import { getArray } from "./resource.ts";
/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId } from "./resource.ts";
import { ApiError } from "./errors.ts";
import type {
  BudgetCategory,
  Transaction,
  TradeEntry,
  NetWorthSnapshot,
  Bill,
} from "./types.ts";

export function getBudgetCategories(
  options: ApiRequestOptions = {},
): Promise<BudgetCategory[]> {
  return getArray<BudgetCategory>(`/finances/budget-categories`, options);
}

export function getTransactions(
  options: ApiRequestOptions = {},
): Promise<Transaction[]> {
  return getArray<Transaction>(`/finances/transactions`, options);
}

export function getTrades(
  options: ApiRequestOptions = {},
): Promise<TradeEntry[]> {
  return getArray<TradeEntry>(`/finances/trades`, options);
}

export function getNetWorthHistory(
  months = 12,
  options: ApiRequestOptions = {},
): Promise<NetWorthSnapshot[]> {
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    return Promise.reject(
      new ApiError(
        "Net-worth history months must be an integer from 1 to 120.",
        "configuration",
      ),
    );
  }
  return getArray<NetWorthSnapshot>(`/finances/net-worth`, {
    ...options,
    query: { ...options.query, ...{ months } },
  });
}

export function getBills(options: ApiRequestOptions = {}): Promise<Bill[]> {
  return getArray<Bill>(`/finances/bills`, options);
}

export type CreateTransactionInput = Omit<Transaction, "id">;
export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export function createTransaction(
  input: CreateTransactionInput,
  options: ApiRequestOptions = {},
): Promise<Transaction> {
  return apiClient.post<Transaction>("/finances/transactions", input, options);
}

export function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
  options: ApiRequestOptions = {},
): Promise<Transaction> {
  return apiClient.patch<Transaction>(
    `/finances/transactions/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteTransaction(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/finances/transactions/${encodeId(id)}`, options);
}

export type CreateBudgetCategoryInput = Omit<
  BudgetCategory,
  "id" | "spent_this_month"
>;
export type UpdateBudgetCategoryInput = Partial<CreateBudgetCategoryInput>;

export function createBudgetCategory(
  input: CreateBudgetCategoryInput,
  options: ApiRequestOptions = {},
): Promise<BudgetCategory> {
  return apiClient.post<BudgetCategory>(
    "/finances/budget-categories",
    input,
    options,
  );
}

export function updateBudgetCategory(
  id: string,
  input: UpdateBudgetCategoryInput,
  options: ApiRequestOptions = {},
): Promise<BudgetCategory> {
  return apiClient.patch<BudgetCategory>(
    `/finances/budget-categories/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteBudgetCategory(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(
    `/finances/budget-categories/${encodeId(id)}`,
    options,
  );
}

export type CreateBillInput = Omit<Bill, "id">;
export type UpdateBillInput = Partial<CreateBillInput>;

export function createBill(
  input: CreateBillInput,
  options: ApiRequestOptions = {},
): Promise<Bill> {
  return apiClient.post<Bill>("/finances/bills", input, options);
}

export function updateBill(
  id: string,
  input: UpdateBillInput,
  options: ApiRequestOptions = {},
): Promise<Bill> {
  return apiClient.patch<Bill>(
    `/finances/bills/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteBill(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/finances/bills/${encodeId(id)}`, options);
}

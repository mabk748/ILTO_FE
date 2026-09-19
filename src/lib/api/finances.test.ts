import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBudgetCategory,
  createTransaction,
  deleteBill,
  getNetWorthHistory,
  updateTransaction,
} from "./finances.ts";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Finance backend adapter", () => {
  it("requests a UTC calendar-month window and rejects invalid windows locally", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    await expect(getNetWorthHistory(6)).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/finances/net-worth?months=6",
    );
    await expect(getNetWorthHistory(0)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends only writable Finance fields and preserves failed writes", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: "category-1" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({ detail: "Invalid amount" }, { status: 422 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await createBudgetCategory({
      name: "Housing",
      monthly_limit: 1000,
      color: "#123456",
    });
    await expect(
      createTransaction({
        category_id: "category-1",
        type: "expense",
        amount: 12.5,
        currency: "EUR",
        description: "Rent",
        date: "2026-09-15T10:00:00.000Z",
        tags: ["home"],
      }),
    ).rejects.toMatchObject({ status: 422 });
    await deleteBill("bill/1");

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: "Housing",
      monthly_limit: 1000,
      color: "#123456",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      category_id: "category-1",
      type: "expense",
      amount: 12.5,
      currency: "EUR",
      description: "Rent",
      date: "2026-09-15T10:00:00.000Z",
      tags: ["home"],
    });
    expect(fetchMock.mock.calls[2][0]).toBe(
      "https://api.example.test/api/v1/finances/bills/bill%2F1",
    );
  });

  it("uses PATCH for changed transaction fields and sends no body for DELETE", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ id: "tx-1" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateTransaction("tx-1", { amount: 20 });
    await deleteBill("tx-1");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      amount: 20,
    });
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[1][1]?.body).toBeUndefined();
  });
});

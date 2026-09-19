import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOutfitLog,
  createWardrobeItem,
  deleteOutfitLog,
  deleteWardrobeItem,
  getOutfitLogs,
  updateOutfitLog,
  updateWardrobeItem,
} from "./appearance.ts";

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

describe("Appearance backend adapter", () => {
  it("preserves outfit limits and uses credentialed plain-array requests", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    await expect(getOutfitLogs(10)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/appearance/outfits?limit=10",
      expect.objectContaining({ credentials: "include" }),
    );
    await expect(getOutfitLogs(0)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses wardrobe CRUD paths with writable caller payloads", async () => {
    const item = { id: "item-1", name: "Jacket" };
    const input = {
      name: "Jacket",
      brand: null,
      category: "outerwear" as const,
      color: "#123456",
      season: "winter" as const,
      condition: "good" as const,
      purchase_date: null,
      purchase_price: 0,
      tags: ["work"],
      image_placeholder: "#123456",
    };
    fetchMock
      .mockResolvedValueOnce(Response.json(item, { status: 201 }))
      .mockResolvedValueOnce(Response.json(item))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await createWardrobeItem(input);
    await updateWardrobeItem("item/1", { brand: null });
    await deleteWardrobeItem("item/1");

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(input);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.example.test/api/v1/appearance/wardrobe/item%2F1",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      brand: null,
    });
    expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
  });

  it("uses outfit CRUD paths and preserves unique item IDs and ratings in JSON", async () => {
    const outfit = { id: "outfit-1", rating: 5 };
    const input = {
      item_ids: ["item-1", "item-2"],
      date: "2026-09-17T10:00:00.000Z",
      occasion: "Work",
      rating: 5,
      notes: "Comfortable",
    };
    fetchMock
      .mockResolvedValueOnce(Response.json(outfit, { status: 201 }))
      .mockResolvedValueOnce(Response.json(outfit))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await createOutfitLog(input);
    await updateOutfitLog("outfit/1", { rating: 4 });
    await deleteOutfitLog("outfit/1");

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(input);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.example.test/api/v1/appearance/outfits/outfit%2F1",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      rating: 4,
    });
    expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
  });
});

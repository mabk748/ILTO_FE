import { describe, expect, it } from "vitest";
import type { OutfitLog, WardrobeItem } from "@/lib/api/types.ts";
import { ApiError } from "@/lib/api/errors.ts";
import {
  appearanceWriteError,
  buildAppearanceInput,
  changedFields,
  toLocalDateTimeValue,
} from "./appearance-editor.ts";

const wardrobeItem: WardrobeItem = {
  id: "item-1",
  name: "Existing jacket",
  brand: "Brand",
  category: "outerwear",
  color: "#123456",
  season: "winter",
  condition: "good",
  times_worn: 4,
  last_worn: "2026-09-10T10:00:00.000Z",
  purchase_date: "2026-09-01T10:00:00.000Z",
  purchase_price: 40,
  tags: ["work"],
  image_placeholder: "#123456",
};

const outfit: OutfitLog = {
  id: "outfit-1",
  item_ids: ["item-1", "item-2"],
  date: "2026-09-15T10:00:00.000Z",
  occasion: "Work",
  rating: 4,
  notes: "Existing notes",
};

const secondItem: WardrobeItem = {
  ...wardrobeItem,
  id: "item-2",
  name: "Existing trousers",
};

describe("Appearance editor contract", () => {
  it("separates wardrobe writable fields, clears nullables, preserves zero prices, and converts timestamps", () => {
    const input = buildAppearanceInput(
      { kind: "wardrobe", record: wardrobeItem },
      {
        name: "Disposable jacket",
        brand: "",
        category: "outerwear",
        color: "navy",
        season: "winter",
        condition: "good",
        purchase_date: "",
        purchase_price: "0",
        tags: "work, frontend",
        image_placeholder: "#123456",
        item_ids: [],
      },
      [],
    );
    expect(input).toEqual({
      name: "Disposable jacket",
      brand: null,
      category: "outerwear",
      color: "navy",
      season: "winter",
      condition: "good",
      purchase_date: null,
      purchase_price: 0,
      tags: ["work", "frontend"],
      image_placeholder: "#123456",
    });
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("times_worn");
    expect(input).not.toHaveProperty("last_worn");
    expect(toLocalDateTimeValue(wardrobeItem.purchase_date!)).toMatch(
      /^2026-09-01T/,
    );
  });

  it("validates image placeholders and an outfit's current unique items and rating bounds", () => {
    const input = buildAppearanceInput(
      { kind: "outfit", record: outfit },
      {
        item_ids: ["item-1", "item-1", "item-2"],
        date: "2026-09-17T12:00",
        occasion: "Work",
        rating: "5",
        notes: "",
      },
      [wardrobeItem, secondItem],
    );
    expect(input).toMatchObject({
      item_ids: ["item-1", "item-2"],
      rating: 5,
      date: expect.stringMatching(/Z$/),
    });
    expect(() =>
      buildAppearanceInput(
        { kind: "wardrobe" },
        {
          name: "Jacket",
          brand: "",
          category: "outerwear",
          color: "blue",
          season: "winter",
          condition: "good",
          purchase_date: "",
          purchase_price: "",
          tags: "",
          image_placeholder: "blue",
          item_ids: [],
        },
        [],
      ),
    ).toThrow("six-digit");
    expect(() =>
      buildAppearanceInput(
        { kind: "wardrobe" },
        {
          name: "Jacket",
          brand: "",
          category: "outerwear",
          color: "blue",
          season: "winter",
          condition: "good",
          purchase_date: "",
          purchase_price: "10000000.01",
          tags: "",
          image_placeholder: "#123456",
          item_ids: [],
        },
        [],
      ),
    ).toThrow("10000000");
    expect(() =>
      buildAppearanceInput(
        { kind: "outfit" },
        {
          item_ids: ["missing"],
          date: "2026-09-17T12:00",
          occasion: "Work",
          rating: "0",
          notes: "",
        },
        [wardrobeItem],
      ),
    ).toThrow(/no longer exists|between 1 and 5/);
    expect(() =>
      buildAppearanceInput(
        { kind: "outfit" },
        {
          item_ids: ["item-1"],
          date: "2026-09-17T12:00",
          occasion: "Work",
          rating: "6",
          notes: "",
        },
        [wardrobeItem],
      ),
    ).toThrow("between 1 and 5");
    expect(() =>
      buildAppearanceInput(
        { kind: "outfit" },
        {
          item_ids: Array.from({ length: 21 }, (_, index) => `item-${index}`),
          date: "2026-09-17T12:00",
          occasion: "Work",
          rating: "5",
          notes: "",
        },
        [wardrobeItem],
      ),
    ).toThrow("at most 20");
  });

  it("omits no-op PATCH fields while keeping explicit nullable clears", () => {
    const unchanged = {
      name: wardrobeItem.name,
      brand: wardrobeItem.brand,
      category: wardrobeItem.category,
      color: wardrobeItem.color,
      season: wardrobeItem.season,
      condition: wardrobeItem.condition,
      purchase_date: wardrobeItem.purchase_date,
      purchase_price: wardrobeItem.purchase_price,
      tags: wardrobeItem.tags,
      image_placeholder: wardrobeItem.image_placeholder,
    };
    expect(changedFields(unchanged, wardrobeItem)).toEqual({});
    expect(
      changedFields({ brand: null, purchase_price: 0 }, wardrobeItem),
    ).toEqual({ brand: null, purchase_price: 0 });
    expect(
      changedFields(
        { date: "2026-09-15T10:00:00.000Z" },
        { date: "2026-09-15T11:00:00+01:00" },
      ),
    ).toEqual({});
  });

  it.each([404, 409, 422, 503])(
    "maps HTTP %s without claiming an Appearance write succeeded",
    (status) => {
      expect(
        appearanceWriteError(new ApiError("backend", "http", { status })),
      ).toMatch(/record|conflict|rejected|confirm/);
    },
  );
});

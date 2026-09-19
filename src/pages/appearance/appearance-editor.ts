import * as api from "@/lib/api/appearance.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  ClothingCategory,
  OutfitLog,
  Season,
  WardrobeCondition,
  WardrobeItem,
} from "@/lib/api/types.ts";

export const clothingCategories = [
  "tops",
  "bottoms",
  "outerwear",
  "footwear",
  "accessories",
  "formal",
  "activewear",
] as const satisfies readonly ClothingCategory[];

export const seasons = [
  "spring",
  "summer",
  "autumn",
  "winter",
  "all_season",
] as const satisfies readonly Season[];

export const wardrobeConditions = [
  "excellent",
  "good",
  "worn",
  "needs_repair",
  "retired",
] as const satisfies readonly WardrobeCondition[];

export type AppearanceTarget =
  | { kind: "wardrobe"; record?: WardrobeItem }
  | { kind: "outfit"; record?: OutfitLog };

export type AppearanceDraft = Record<string, string | string[]>;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** datetime-local is display-only; writes use UTC ISO instants. */
export function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function stringValue(values: AppearanceDraft, key: string): string {
  const value = values[key];
  return typeof value === "string" ? value : "";
}

function itemIds(values: AppearanceDraft): string[] {
  const value = values.item_ids;
  return Array.isArray(value) ? value : [];
}

function toUtcIso(value: string, label: string): string {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) {
    throw new Error(`${label} must be a valid date and time.`);
  }
  return date.toISOString();
}

function nullableUtcIso(value: string, label: string): string | null {
  return value.trim() === "" ? null : toUtcIso(value, label);
}

function text(value: string, label: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed || value.length > maxLength) {
    throw new Error(
      `${label} is required and must be at most ${maxLength} characters.`,
    );
  }
  return trimmed;
}

function nullableText(value: string, label: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new Error(`${label} must be at most ${maxLength} characters.`);
  }
  return value.trim() || null;
}

function optionalText(value: string, label: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new Error(`${label} must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function price(value: string): number | null {
  if (value.trim() === "") return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(
      "Purchase price must be a nonnegative amount with at most two decimals.",
    );
  }
  if (value.replace(".", "").length > 15) {
    throw new Error("Purchase price must contain at most 15 total digits.");
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) {
    throw new Error("Purchase price must be between 0 and 10000000.");
  }
  return parsed;
}

function rating(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error("Rating must be a whole number.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }
  return parsed;
}

function choice<T extends string>(
  value: string,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(value as T)) throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

function hexColor(value: string, label: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(
      `${label} must be a six-digit hexadecimal color such as #123456.`,
    );
  }
  return value;
}

export function tags(value: string): string[] {
  if (!value.trim()) return [];
  const result = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (result.length > 20) {
    throw new Error("A wardrobe item may have at most 20 tags.");
  }
  if (result.some((tag) => tag.length > 50)) {
    throw new Error("Each tag must be at most 50 characters.");
  }
  return result;
}

function selectedExistingItemIds(
  selected: string[],
  wardrobeItems: WardrobeItem[],
): string[] {
  const unique = Array.from(new Set(selected));
  if (unique.length === 0) {
    throw new Error("Select at least one existing wardrobe item.");
  }
  if (unique.length > 20) {
    throw new Error("An outfit may contain at most 20 wardrobe items.");
  }
  const existing = new Set(wardrobeItems.map((item) => item.id));
  if (unique.some((id) => !existing.has(id))) {
    throw new Error(
      "This outfit includes a wardrobe item that no longer exists. Remove it before saving.",
    );
  }
  return unique;
}

export function initialDraft(target: AppearanceTarget): AppearanceDraft {
  if (target.kind === "wardrobe") {
    const item = target.record;
    return {
      name: item?.name ?? "",
      brand: item?.brand ?? "",
      category: item?.category ?? "tops",
      color: item?.color ?? "#6366f1",
      season: item?.season ?? "all_season",
      condition: item?.condition ?? "good",
      purchase_date: item?.purchase_date
        ? toLocalDateTimeValue(item.purchase_date)
        : "",
      purchase_price: item?.purchase_price?.toString() ?? "",
      tags: item?.tags.join(", ") ?? "",
      image_placeholder: item?.image_placeholder ?? "#6366f1",
      item_ids: [],
    };
  }

  const outfit = target.record;
  return {
    date: outfit
      ? toLocalDateTimeValue(outfit.date)
      : toLocalDateTimeValue(new Date().toISOString()),
    item_ids: outfit?.item_ids ?? [],
    occasion: outfit?.occasion ?? "",
    rating: outfit?.rating.toString() ?? "3",
    notes: outfit?.notes ?? "",
  };
}

export function buildAppearanceInput(
  target: AppearanceTarget,
  values: AppearanceDraft,
  wardrobeItems: WardrobeItem[],
): api.CreateWardrobeItemInput | api.CreateOutfitLogInput {
  if (target.kind === "wardrobe") {
    return {
      name: text(stringValue(values, "name"), "Name", 200),
      brand: nullableText(stringValue(values, "brand"), "Brand", 200),
      category: choice(
        stringValue(values, "category"),
        clothingCategories,
        "clothing category",
      ),
      color: text(stringValue(values, "color"), "Color", 100),
      season: choice(stringValue(values, "season"), seasons, "season"),
      condition: choice(
        stringValue(values, "condition"),
        wardrobeConditions,
        "condition",
      ),
      purchase_date: nullableUtcIso(
        stringValue(values, "purchase_date"),
        "Purchase date",
      ),
      purchase_price: price(stringValue(values, "purchase_price")),
      tags: tags(stringValue(values, "tags")),
      image_placeholder: hexColor(
        stringValue(values, "image_placeholder"),
        "Image placeholder",
      ),
    };
  }

  return {
    item_ids: selectedExistingItemIds(itemIds(values), wardrobeItems),
    date: toUtcIso(stringValue(values, "date"), "Outfit date"),
    occasion: text(stringValue(values, "occasion"), "Occasion", 200),
    rating: rating(stringValue(values, "rating")),
    notes: optionalText(stringValue(values, "notes"), "Notes", 4000),
  };
}

function same(left: unknown, right: unknown, key: string): boolean {
  if (
    (key === "purchase_date" || key === "date") &&
    typeof left === "string" &&
    typeof right === "string"
  ) {
    const leftTime = Date.parse(left);
    const rightTime = Date.parse(right);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return leftTime === rightTime;
    }
  }
  return Array.isArray(left) && Array.isArray(right)
    ? JSON.stringify(left) === JSON.stringify(right)
    : left === right;
}

export function changedFields<T extends object>(
  input: T,
  original: object,
): Partial<T> {
  const record = original as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => !same(value, record[key], key),
    ),
  ) as Partial<T>;
}

export async function saveAppearanceResource(
  target: AppearanceTarget,
  values: AppearanceDraft,
  wardrobeItems: WardrobeItem[],
) {
  const input = buildAppearanceInput(target, values, wardrobeItems);
  if (target.kind === "wardrobe") {
    const item = input as api.CreateWardrobeItemInput;
    return target.record
      ? api.updateWardrobeItem(
          target.record.id,
          changedFields(item, target.record),
        )
      : api.createWardrobeItem(item);
  }
  const outfit = input as api.CreateOutfitLogInput;
  return target.record
    ? api.updateOutfitLog(
        target.record.id,
        changedFields(outfit, target.record),
      )
    : api.createOutfitLog(outfit);
}

export function removeAppearanceResource(
  target: AppearanceTarget,
): Promise<void> {
  if (!target.record) throw new Error("Select a saved record first.");
  return target.kind === "wardrobe"
    ? api.deleteWardrobeItem(target.record.id)
    : api.deleteOutfitLog(target.record.id);
}

export function appearanceWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This Appearance record or selected wardrobe item no longer exists. Refresh and try again.";
    if (error.status === 409)
      return "The backend rejected this change because it conflicts with related Appearance data.";
    if (error.status === 422)
      return "The backend rejected these values. Check required fields, colors, selected wardrobe items, rating, and timestamps.";
    if (
      error.status === 503 ||
      error.code === "network" ||
      error.code === "timeout"
    ) {
      return "The backend could not confirm this change. Refresh and check whether it was saved before retrying.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Could not save the Appearance change.";
}

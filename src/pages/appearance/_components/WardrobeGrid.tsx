import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type {
  WardrobeItem,
  ClothingCategory,
  Season,
} from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";

const CATEGORIES: { id: ClothingCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "outerwear", label: "Outerwear" },
  { id: "footwear", label: "Footwear" },
  { id: "accessories", label: "Accessories" },
  { id: "formal", label: "Formal" },
  { id: "activewear", label: "Activewear" },
];

const SEASONS: { id: Season | "all"; label: string }[] = [
  { id: "all", label: "All Seasons" },
  { id: "spring", label: "Spring" },
  { id: "summer", label: "Summer" },
  { id: "autumn", label: "Autumn" },
  { id: "winter", label: "Winter" },
  { id: "all_season", label: "All-Season" },
];

const conditionConfig: Record<string, { label: string; cls: string }> = {
  excellent: {
    label: "Excellent",
    cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  good: {
    label: "Good",
    cls: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  worn: {
    label: "Worn",
    cls: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  needs_repair: {
    label: "Needs Repair",
    cls: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  retired: {
    label: "Retired",
    cls: "bg-muted text-muted-foreground border-border",
  },
};

interface Props {
  items: WardrobeItem[];
}

export default function WardrobeGrid({ items }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<
    ClothingCategory | "all"
  >("all");
  const [seasonFilter, setSeasonFilter] = useState<Season | "all">("all");

  const totalValue = items.reduce((s, i) => s + (i.purchase_price ?? 0), 0);
  const avgWear =
    items.length > 0
      ? (items.reduce((s, i) => s + i.times_worn, 0) / items.length).toFixed(1)
      : "0";
  const mostWorn = items.reduce(
    (best, i) => (i.times_worn > (best?.times_worn ?? 0) ? i : best),
    items[0],
  );

  const filtered = items.filter((i) => {
    const catMatch = categoryFilter === "all" || i.category === categoryFilter;
    const seasonMatch = seasonFilter === "all" || i.season === seasonFilter;
    return catMatch && seasonMatch;
  });

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: items.length },
          { label: "Wardrobe Value", value: `€${totalValue.toFixed(0)}` },
          { label: "Avg Wears", value: avgWear },
          { label: "Most Worn", value: mostWorn?.name ?? "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-lg p-3"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer",
              categoryFilter === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Season filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Season:</span>
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value as Season | "all")}
          className="bg-card border border-border text-sm text-foreground rounded px-2 py-1 cursor-pointer"
        >
          {SEASONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} items
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((item) => {
          const cond = conditionConfig[item.condition];
          return (
            <div
              key={item.id}
              className="bg-card border border-border rounded-lg overflow-hidden flex flex-col"
            >
              {/* Color swatch */}
              <div
                className="h-20 w-full shrink-0"
                style={{ backgroundColor: item.image_placeholder }}
              />
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {item.name}
                  </p>
                  {item.brand && (
                    <p className="text-xs text-muted-foreground">
                      {item.brand}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                    {item.category}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border",
                      cond.cls,
                    )}
                  >
                    {cond.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.times_worn}× worn</span>
                  <span>
                    {item.last_worn
                      ? formatDistanceToNow(new Date(item.last_worn), {
                          addSuffix: true,
                        })
                      : "never"}
                  </span>
                </div>

                {item.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

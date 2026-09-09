import { useState } from "react";
import type { ComplianceItem } from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";

interface Props {
  items: ComplianceItem[];
}

export default function ComplianceChecklist({ items }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.completed])),
  );

  const grouped = items.reduce<Record<string, ComplianceItem[]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, catItems]) => {
        const total = catItems.length;
        const done = catItems.filter((i) => checked[i.id]).length;
        const pct = Math.round((done / total) * 100);

        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{category}</CardTitle>
                <span
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border font-medium",
                    pct === 100
                      ? "bg-green-500/15 text-green-400 border-green-500/30"
                      : "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {done}/{total} — {pct}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {catItems.map((item) => {
                const isDone = checked[item.id];
                return (
                  <div key={item.id} className="flex gap-3">
                    <button
                      onClick={() =>
                        setChecked((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className={cn(
                        "mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center cursor-pointer transition-colors",
                        isDone
                          ? "bg-primary border-primary"
                          : "border-border hover:border-primary",
                      )}
                    >
                      {isDone && (
                        <div className="w-2 h-2 rounded-sm bg-primary-foreground" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isDone && "line-through text-muted-foreground",
                        )}
                      >
                        {item.title}
                      </p>
                      <p
                        className={cn(
                          "text-xs text-muted-foreground",
                          isDone && "line-through",
                        )}
                      >
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.due_date && (
                          <span className="text-xs text-muted-foreground">
                            Due {format(new Date(item.due_date), "MMM d")}
                          </span>
                        )}
                        {item.recurrence && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {item.recurrence}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

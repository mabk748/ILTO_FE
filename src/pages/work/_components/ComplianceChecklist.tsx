import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateComplianceItem } from "@/lib/api/work.ts";
import type { ComplianceItem } from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { workWriteError } from "../work-editor.ts";

interface Props {
  items: ComplianceItem[];
}

function compareItems(left: ComplianceItem, right: ComplianceItem): number {
  const leftTime = left.due_date
    ? Date.parse(left.due_date)
    : Number.POSITIVE_INFINITY;
  const rightTime = right.due_date
    ? Date.parse(right.due_date)
    : Number.POSITIVE_INFINITY;
  if (leftTime !== rightTime) return leftTime - rightTime;
  return left.title.localeCompare(right.title);
}

export default function ComplianceChecklist({ items }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      updateComplianceItem(id, { completed }),
    retry: false,
  });
  const toggle = async (item: ComplianceItem) => {
    setError(null);
    try {
      await mutation.mutateAsync({ id: item.id, completed: !item.completed });
      await Promise.all(
        ["work", "dashboard"].map((domain) =>
          queryClient.invalidateQueries({ queryKey: [domain] }),
        ),
      );
    } catch (reason) {
      setError(workWriteError(reason));
    }
  };
  const grouped = items.reduce<Record<string, ComplianceItem[]>>(
    (accumulator, item) => {
      if (!accumulator[item.category]) accumulator[item.category] = [];
      accumulator[item.category].push(item);
      return accumulator;
    },
    {},
  );
  const categories = Object.entries(grouped).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No compliance items yet.
          </CardContent>
        </Card>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {categories.map(([category, categoryItems]) => {
        const sortedItems = [...categoryItems].sort(compareItems);
        const total = sortedItems.length;
        const done = sortedItems.filter((item) => item.completed).length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{category}</CardTitle>
                <span
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border font-medium",
                    percent === 100
                      ? "bg-green-500/15 text-green-400 border-green-500/30"
                      : "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {done}/{total} — {percent}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    aria-label={
                      item.completed ? "Mark incomplete" : "Mark complete"
                    }
                    onClick={() => void toggle(item)}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center cursor-pointer transition-colors",
                      item.completed
                        ? "bg-primary border-primary"
                        : "border-border hover:border-primary",
                    )}
                  >
                    {item.completed && (
                      <div className="w-2 h-2 rounded-sm bg-primary-foreground" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        item.completed && "line-through text-muted-foreground",
                      )}
                    >
                      {item.title}
                    </p>
                    <p
                      className={cn(
                        "text-xs text-muted-foreground",
                        item.completed && "line-through",
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
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

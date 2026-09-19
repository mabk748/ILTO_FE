import {
  updateChecklistItem,
  resetChecklist as resetBackendChecklist,
} from "@/lib/api/logistics.ts";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChecklistTemplate, ChecklistItem } from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { logisticsWriteError } from "../logistics-editor.ts";

const priorityBadge: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const typeBadge: Record<string, string> = {
  travel: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  admin: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  renewal: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  custom: "bg-muted text-muted-foreground border-border",
};

interface Props {
  checklists: ChecklistTemplate[];
}

export default function ChecklistsView({ checklists }: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set([checklists[0]?.id ?? ""]),
  );
  const [resetTarget, setResetTarget] = useState<ChecklistTemplate | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: {
      checklistId: string;
      itemId: string;
      completed: boolean;
    }) =>
      updateChecklistItem(input.checklistId, input.itemId, {
        completed: input.completed,
      }),
    retry: false,
  });
  const resetMutation = useMutation({
    mutationFn: (checklistId: string) => resetBackendChecklist(checklistId),
    retry: false,
  });

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const getCompleted = (items: ChecklistItem[]) =>
    items.filter((item) => item.completed).length;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["logistics"] });
  const toggle = async (checklistId: string, item: ChecklistItem) => {
    setError(null);
    try {
      await mutation.mutateAsync({
        checklistId,
        itemId: item.id,
        completed: !item.completed,
      });
      await invalidate();
    } catch (reason) {
      setError(logisticsWriteError(reason));
    }
  };
  const reset = async () => {
    if (!resetTarget) return;
    setError(null);
    try {
      await resetMutation.mutateAsync(resetTarget.id);
      await invalidate();
      setResetTarget(null);
    } catch (reason) {
      setError(logisticsWriteError(reason));
    }
  };

  return (
    <div className="space-y-3">
      {checklists.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No imported checklists yet.
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {checklists.map((cl) => {
        const isExp = expanded.has(cl.id);
        const completedCount = getCompleted(cl.items);
        const total = cl.items.length;
        const pct = total > 0 ? (completedCount / total) * 100 : 0;

        // Group items by category
        const byCategory: Record<string, ChecklistItem[]> = {};
        for (const item of cl.items) {
          if (!byCategory[item.category]) byCategory[item.category] = [];
          byCategory[item.category].push(item);
        }

        return (
          <div
            key={cl.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4">
              <button
                type="button"
                onClick={() => toggleExpand(cl.id)}
                aria-expanded={isExp}
                className="flex min-w-0 flex-1 items-center gap-3 text-left hover:text-foreground"
              >
                {isExp ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">
                      {cl.name}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border capitalize",
                        typeBadge[cl.type],
                      )}
                    >
                      {cl.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-32">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{total}
                    </span>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setResetTarget(cl)}
                className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                disabled={mutation.isPending || resetMutation.isPending}
                aria-label={`Reset checklist: ${cl.name}`}
                title="Reset checklist"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {isExp && (
              <div className="border-t border-border divide-y divide-border/50">
                {Object.entries(byCategory).map(([cat, items]) => (
                  <div key={cat} className="px-4 py-3 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat}
                    </p>
                    {items.map((item) => {
                      const isChecked = item.completed;
                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={
                              mutation.isPending || resetMutation.isPending
                            }
                            onChange={() => void toggle(cl.id, item)}
                            className="h-3.5 w-3.5 accent-primary cursor-pointer"
                          />
                          <span
                            className={cn(
                              "text-sm flex-1",
                              isChecked
                                ? "line-through text-muted-foreground"
                                : "text-foreground",
                            )}
                          >
                            {item.label}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border capitalize shrink-0",
                              priorityBadge[item.priority],
                            )}
                          >
                            {item.priority}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
      >
        {resetTarget && (
          <DialogContent
            showCloseButton={!resetMutation.isPending}
            onEscapeKeyDown={(event) =>
              resetMutation.isPending && event.preventDefault()
            }
            onInteractOutside={(event) =>
              resetMutation.isPending && event.preventDefault()
            }
          >
            <DialogHeader>
              <DialogTitle>Reset checklist</DialogTitle>
              <DialogDescription>
                Mark every item in “{resetTarget.name}” incomplete after the
                backend confirms the reset.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetTarget(null)}
                disabled={resetMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void reset()}
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? "Resetting…" : "Confirm reset"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

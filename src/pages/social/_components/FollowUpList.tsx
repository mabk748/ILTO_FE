import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFollowUp } from "@/lib/api/social.ts";
import type { FollowUpPrompt, Priority } from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { socialWriteError } from "../social-editor.ts";

interface Props {
  followUps: FollowUpPrompt[];
}

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function FollowUpList({ followUps }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      updateFollowUp(id, { completed }),
    retry: false,
  });
  const toggle = async (followUp: FollowUpPrompt) => {
    setError(null);
    try {
      await mutation.mutateAsync({
        id: followUp.id,
        completed: !followUp.completed,
      });
      await Promise.all(
        ["social", "dashboard"].map((domain) =>
          queryClient.invalidateQueries({ queryKey: [domain] }),
        ),
      );
    } catch (reason) {
      setError(socialWriteError(reason));
    }
  };
  const sorted = [...followUps].sort(
    (left, right) =>
      new Date(left.due_date).getTime() - new Date(right.due_date).getTime(),
  );

  return (
    <div className="space-y-3">
      {sorted.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No follow-up prompts yet.
          </CardContent>
        </Card>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {sorted.map((followUp) => {
        const isDone = followUp.completed;
        const isOverdue = new Date(followUp.due_date) < new Date() && !isDone;
        return (
          <Card
            key={followUp.id}
            className={cn(
              isOverdue && "border-destructive/50",
              isDone && "opacity-50",
            )}
          >
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isDone && "line-through text-muted-foreground",
                      )}
                    >
                      {followUp.contact_name}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        PRIORITY_STYLES[followUp.priority],
                      )}
                    >
                      {followUp.priority}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                        overdue
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground mt-0.5",
                      isDone && "line-through",
                    )}
                  >
                    {followUp.prompt}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(followUp.due_date), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                  onClick={() => void toggle(followUp)}
                  className={cn(
                    "cursor-pointer transition-colors shrink-0",
                    isDone
                      ? "text-green-400"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

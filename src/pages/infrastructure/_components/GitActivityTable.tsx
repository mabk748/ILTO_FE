import type { GitActivity } from "@/lib/api/types.ts";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { GitBranch, GitCommit } from "lucide-react";

interface Props {
  activities: GitActivity[];
}

function VelocityBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-500"
      : score >= 40
        ? "bg-yellow-500"
        : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-7 text-right">
        {score}
      </span>
    </div>
  );
}

export default function GitActivityTable({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No git activity
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium">
              Repository
            </th>
            <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">
              Branch
            </th>
            <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium">
              Today
            </th>
            <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium hidden md:table-cell">
              This Week
            </th>
            <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">
              Last Commit
            </th>
            <th className="pb-2 text-xs text-muted-foreground font-medium w-32">
              Velocity
            </th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr
              key={a.id}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="py-3 pr-4">
                <span className="font-mono text-xs font-semibold">
                  {a.repo}
                </span>
              </td>
              <td className="py-3 pr-4 hidden sm:table-cell">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <GitBranch className="h-3 w-3 shrink-0" />
                  {a.branch}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className="flex items-center gap-1 text-xs">
                  <GitCommit className="h-3 w-3 text-muted-foreground shrink-0" />
                  {a.commits_today}
                </span>
              </td>
              <td className="py-3 pr-4 hidden md:table-cell">
                <span className="text-xs">{a.commits_week}</span>
              </td>
              <td className="py-3 pr-4 hidden sm:table-cell">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(a.last_commit_at), {
                    addSuffix: true,
                  })}
                </span>
              </td>
              <td className="py-3">
                <VelocityBar score={a.velocity_score} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

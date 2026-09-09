import type { ReadingEntry } from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { BookOpen, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils.ts";

interface Props {
  entries: ReadingEntry[];
}

const AVG_WORDS_PER_PAGE = 300;

function estimateDaysLeft(entry: ReadingEntry): number {
  const pagesLeft = entry.pages_total - entry.pages_read;
  const wordsLeft = pagesLeft * AVG_WORDS_PER_PAGE;
  const minutesLeft = wordsLeft / entry.words_per_minute;
  // Assume 30 min/day reading
  return Math.ceil(minutesLeft / 30);
}

function BookCard({ entry }: { entry: ReadingEntry }) {
  const pct = Math.round((entry.pages_read / entry.pages_total) * 100);
  const isComplete = entry.completed_at != null;
  const daysLeft = !isComplete ? estimateDaysLeft(entry) : 0;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{entry.title}</p>
            <p className="text-xs text-muted-foreground">{entry.author}</p>
          </div>
          {isComplete ? (
            <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {entry.pages_read} / {entry.pages_total} pages
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                isComplete ? "bg-green-500" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {!isComplete && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              ~{daysLeft}d left
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReadingList({ entries }: Props) {
  const inProgress = entries.filter((e) => !e.completed_at);
  const completed = entries.filter((e) => e.completed_at != null);

  return (
    <div className="space-y-5">
      {inProgress.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Currently Reading
          </h2>
          <div className="space-y-3">
            {inProgress.map((e) => (
              <BookCard key={e.id} entry={e} />
            ))}
          </div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Completed
          </h2>
          <div className="space-y-3">
            {completed.map((e) => (
              <BookCard key={e.id} entry={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

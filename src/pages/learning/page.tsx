import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getRoadmaps,
  getSkills,
  getDueCards,
  getReadingList,
} from "@/lib/api/learning.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { BookOpen } from "lucide-react";
import RoadmapList from "./_components/RoadmapList.tsx";
import ReviewQueue from "./_components/ReviewQueue.tsx";
import ReadingList from "./_components/ReadingList.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";

type Tab = "roadmaps" | "review" | "reading";

export default function LearningPage() {
  const [tab, setTab] = useState<Tab>("roadmaps");
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["learning"],
    queryFn: async ({ signal }) => {
      const [roadmaps, skills, dueCards, reading] = await Promise.all([
        getRoadmaps({ signal }),
        getSkills(undefined, { signal }),
        getDueCards({ signal }),
        getReadingList({ signal }),
      ]);
      return { roadmaps, skills, dueCards, reading };
    },
  });

  const dueCount = data?.dueCards.length ?? 0;

  const TABS = [
    { id: "roadmaps" as Tab, label: "Roadmaps" },
    {
      id: "review" as Tab,
      label: dueCount > 0 ? `Review Queue (${dueCount})` : "Review Queue",
    },
    { id: "reading" as Tab, label: "Reading" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary shrink-0" />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Learning
        </h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <>
          {tab === "roadmaps" && (
            <RoadmapList
              roadmaps={data?.roadmaps ?? []}
              skills={data?.skills ?? []}
            />
          )}
          {tab === "review" && <ReviewQueue cards={data?.dueCards ?? []} />}
          {tab === "reading" && <ReadingList entries={data?.reading ?? []} />}
        </>
      )}
    </div>
  );
}

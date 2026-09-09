import { useState } from "react";
import type {
  LearningRoadmap,
  SkillNode,
  SkillLevel,
} from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils.ts";

interface Props {
  roadmaps: LearningRoadmap[];
  skills: SkillNode[];
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

const LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "expert"];

function gapColor(score: number): string {
  if (score < 30) return "bg-green-500";
  if (score <= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export default function RoadmapList({ roadmaps, skills }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {roadmaps.map((r) => {
        const pct = Math.round((r.skills_completed / r.skills_total) * 100);
        const isOpen = expanded === r.id;
        const roadmapSkills = skills.filter((s) => s.roadmap_id === r.id);

        return (
          <Card key={r.id}>
            <CardContent className="pt-4 space-y-3">
              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="w-full text-left cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.goal}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0",
                      STATUS_STYLES[r.status],
                    )}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {r.skills_completed} / {r.skills_total} skills
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>

              {isOpen && roadmapSkills.length > 0 && (
                <div className="pt-2 border-t border-border space-y-2">
                  {roadmapSkills.map((sk) => {
                    const fromIdx = LEVELS.indexOf(sk.current_level);
                    const toIdx = LEVELS.indexOf(sk.target_level);
                    return (
                      <div key={sk.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{sk.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{LEVELS[fromIdx]}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{LEVELS[toIdx]}</span>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            gap {sk.gap_score}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              gapColor(sk.gap_score),
                            )}
                            style={{ width: `${sk.gap_score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

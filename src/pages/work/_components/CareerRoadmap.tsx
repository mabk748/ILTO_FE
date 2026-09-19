import type {
  CareerMilestone,
  Certification,
  CertStatus,
} from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { format, differenceInDays } from "date-fns";
import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import WorkResourceControls from "./WorkResourceControls.tsx";

interface Props {
  milestones: CareerMilestone[];
  certs: Certification[];
}

const CATEGORY_STYLES: Record<CareerMilestone["category"], string> = {
  role: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  skill: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  certification: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  project: "bg-green-500/15 text-green-400 border-green-500/30",
  network: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const CERT_STATUS_STYLES: Record<CertStatus, string> = {
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  planned: "bg-muted text-muted-foreground border-border",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function CareerRoadmap({ milestones, certs }: Props) {
  const now = new Date();

  return (
    <div className="space-y-5">
      {/* Milestones timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Career Milestones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones.length === 0 && (
            <p className="py-5 text-center text-sm text-muted-foreground">
              No career milestones yet.
            </p>
          )}
          {milestones.map((m, i) => {
            const done = m.completed_at != null;
            const daysLeft = differenceInDays(new Date(m.target_date), now);
            return (
              <div key={m.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {done ? (
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  {i < milestones.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="pb-4 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        done && "text-muted-foreground line-through",
                      )}
                    >
                      {m.title}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        CATEGORY_STYLES[m.category],
                      )}
                    >
                      {m.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.description}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      done
                        ? "text-green-400"
                        : daysLeft < 0
                          ? "text-red-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {done
                      ? `Completed ${format(new Date(m.completed_at!), "MMM d, yyyy")}`
                      : `Target: ${format(new Date(m.target_date), "MMM d, yyyy")} · ${daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}`}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Certifications</CardTitle>
            <WorkResourceControls target={{ kind: "certification" }} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {certs.length === 0 && (
            <p className="py-5 text-center text-sm text-muted-foreground">
              No certifications yet.
            </p>
          )}
          {certs.map((c) => {
            const pct =
              c.study_hours_target > 0
                ? Math.round(
                    (c.study_hours_logged / c.study_hours_target) * 100,
                  )
                : 0;
            const clampedPct = Math.min(100, Math.max(0, pct));
            return (
              <div key={c.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.provider}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0",
                        CERT_STATUS_STYLES[c.status],
                      )}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                    <WorkResourceControls
                      target={{ kind: "certification", record: c }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exam:{" "}
                  {c.exam_date
                    ? format(new Date(c.exam_date), "MMM d, yyyy")
                    : "Not scheduled"}
                  {" · "}
                  Expiry:{" "}
                  {c.expiry_date
                    ? format(new Date(c.expiry_date), "MMM d, yyyy")
                    : "Not scheduled"}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Study hours: {c.study_hours_logged}h /{" "}
                      {c.study_hours_target}h
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${clampedPct}%` }}
                      role="progressbar"
                      aria-label={`${c.name} study progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={clampedPct}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

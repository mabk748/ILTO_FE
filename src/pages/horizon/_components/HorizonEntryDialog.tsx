import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import type { HorizonEntry } from "@/lib/api/types.ts";
import { formatInstant } from "@/lib/time-zone.ts";
import type { HorizonItemDialogMode } from "./HorizonItemDialog.tsx";

const MODULE_ROUTES: Partial<Record<HorizonEntry["source_domain"], string>> = {
  projects: "/projects",
  work: "/work?tab=deadlines",
  logistics: "/logistics?tab=calendar",
};

function sourceLabel(source: HorizonEntry["source_domain"]): string {
  return source === "horizon"
    ? "Horizon"
    : source.charAt(0).toUpperCase() + source.slice(1);
}

export default function HorizonEntryDialog({
  entry,
  onClose,
  onManage,
}: {
  entry: HorizonEntry;
  onClose: () => void;
  onManage: (mode: Exclude<HorizonItemDialogMode, "create">) => void;
}) {
  const timeZone = useTimeZone();
  const navigate = useNavigate();
  const moduleRoute = MODULE_ROUTES[entry.source_domain];
  const displayTimeZone =
    entry.all_day &&
    entry.source_domain === "projects" &&
    entry.source_type === "milestone"
      ? "UTC"
      : timeZone;
  const dateOptions: Intl.DateTimeFormatOptions = entry.all_day
    ? { weekday: "short", year: "numeric", month: "short", day: "numeric" }
    : {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry.title}</DialogTitle>
          <DialogDescription>
            Source: {sourceLabel(entry.source_domain)}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Start
            </dt>
            <dd>
              {formatInstant(entry.starts_at, displayTimeZone, dateOptions)}
            </dd>
          </div>
          {entry.ends_at && (
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                End
              </dt>
              <dd>
                {formatInstant(entry.ends_at, displayTimeZone, dateOptions)}
              </dd>
            </div>
          )}
          {entry.status && (
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Status
              </dt>
              <dd>{entry.status}</dd>
            </div>
          )}
          {entry.detail && (
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Details
              </dt>
              <dd className="whitespace-pre-wrap">{entry.detail}</dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap justify-end gap-2">
          {entry.horizon_owned ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onManage("edit")}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onManage("delete")}
              >
                Delete
              </Button>
            </>
          ) : (
            moduleRoute && (
              <Button type="button" onClick={() => navigate(moduleRoute)}>
                Open in {sourceLabel(entry.source_domain)}
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

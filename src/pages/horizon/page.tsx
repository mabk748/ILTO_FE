import { useMemo, useState } from "react";
import { addMonths, addWeeks } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import LoadError from "@/components/LoadError.tsx";
import { getHorizonEntries } from "@/lib/api/horizon.ts";
import type { HorizonEntry } from "@/lib/api/types.ts";
import HorizonAddMenu from "./_components/HorizonAddMenu.tsx";
import HorizonCalendar from "./_components/HorizonCalendar.tsx";
import HorizonEntryDialog from "./_components/HorizonEntryDialog.tsx";
import HorizonItemDialog, {
  type HorizonItemDialogMode,
} from "./_components/HorizonItemDialog.tsx";
import { horizonCalendarRange, type HorizonView } from "./horizon-calendar.ts";

export default function HorizonPage() {
  const timeZone = useTimeZone();
  const [view, setView] = useState<HorizonView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<HorizonEntry | null>(null);
  const [itemMode, setItemMode] = useState<HorizonItemDialogMode | null>(null);
  const range = useMemo(
    () => horizonCalendarRange(anchor, view, timeZone),
    [anchor, timeZone, view],
  );
  const entries = useQuery({
    queryKey: ["horizon", "entries", range.from, range.to],
    queryFn: ({ signal }) => getHorizonEntries(range, { signal }),
    staleTime: 0,
  });
  const moveAnchor = (direction: -1 | 0 | 1) => {
    if (direction === 0) setAnchor(new Date());
    else
      setAnchor((current) =>
        view === "month"
          ? addMonths(current, direction)
          : addWeeks(current, direction),
      );
  };
  const closeItemDialog = () => {
    setItemMode(null);
    setSelected(null);
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Horizon
            </h1>
            <p className="text-sm text-muted-foreground">
              What is happening across your life and ILTO.
            </p>
          </div>
        </div>
        <HorizonAddMenu onCalendarBlock={() => setItemMode("create")} />
      </div>

      {entries.error ? (
        <LoadError
          error={entries.error}
          onRetry={() => void entries.refetch()}
        />
      ) : entries.isPending || !entries.data ? (
        <div className="space-y-3" aria-label="Loading Horizon calendar">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[34rem] w-full" />
        </div>
      ) : (
        <>
          {entries.data.length === 0 && (
            <div
              role="status"
              className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
            >
              Nothing is scheduled in this period. Add a calendar block or
              create a dated item in its module.
            </div>
          )}
          <HorizonCalendar
            anchor={anchor}
            days={range.days}
            entries={entries.data}
            timeZone={timeZone}
            view={view}
            onAnchorChange={moveAnchor}
            onViewChange={setView}
            onSelect={setSelected}
          />
        </>
      )}

      {selected && !itemMode && (
        <HorizonEntryDialog
          entry={selected}
          onClose={() => setSelected(null)}
          onManage={setItemMode}
        />
      )}
      {itemMode && (
        <HorizonItemDialog
          key={`${itemMode}-${selected?.id ?? "new"}`}
          mode={itemMode}
          entry={selected ?? undefined}
          onClose={closeItemDialog}
        />
      )}
    </div>
  );
}

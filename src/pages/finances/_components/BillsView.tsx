import { useState } from "react";
import type { Bill } from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils.ts";

interface Props {
  bills: Bill[];
}

const RECURRENCE_STYLES: Record<Bill["recurrence"], string> = {
  monthly: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  quarterly: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  annual: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  one_time: "bg-muted text-muted-foreground border-border",
};

export default function BillsView({ bills }: Props) {
  const [paidState, setPaidState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(bills.map((b) => [b.id, b.paid])),
  );

  const now = new Date();
  const upcoming = bills.filter(
    (b) =>
      !paidState[b.id] &&
      differenceInDays(new Date(b.due_date), now) <= 7 &&
      differenceInDays(new Date(b.due_date), now) >= 0,
  );
  const dueSoon = bills.filter(
    (b) =>
      !paidState[b.id] &&
      differenceInDays(new Date(b.due_date), now) > 7 &&
      differenceInDays(new Date(b.due_date), now) <= 30,
  );
  const paid = bills.filter((b) => paidState[b.id]);

  const monthlyTotal = bills.reduce((a, b) => a + b.amount, 0);

  const BillRow = ({ bill }: { bill: Bill }) => {
    const isPaid = paidState[bill.id];
    const daysLeft = differenceInDays(new Date(bill.due_date), now);
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0",
          isPaid && "opacity-50",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <p className={cn("text-sm font-medium", isPaid && "line-through")}>
              {bill.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full border",
                  RECURRENCE_STYLES[bill.recurrence],
                )}
              >
                {bill.recurrence}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(bill.due_date), "MMM d")}
              </span>
              {!isPaid && daysLeft >= 0 && (
                <span
                  className={cn(
                    "text-xs",
                    daysLeft <= 3 ? "text-red-400" : "text-muted-foreground",
                  )}
                >
                  ({daysLeft}d)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold">€{bill.amount}</span>
          <button
            onClick={() =>
              setPaidState((prev) => ({ ...prev, [bill.id]: !prev[bill.id] }))
            }
            className={cn(
              "text-xs px-2 py-1 rounded border transition-colors cursor-pointer",
              isPaid
                ? "bg-green-500/15 text-green-400 border-green-500/30"
                : "bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary",
            )}
          >
            {isPaid ? "Paid" : "Mark paid"}
          </button>
        </div>
      </div>
    );
  };

  const Section = ({
    title,
    items,
    accent,
  }: {
    title: string;
    items: Bill[];
    accent?: string;
  }) =>
    items.length > 0 ? (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className={cn("text-sm", accent)}>
            {title}{" "}
            <span className="text-muted-foreground font-normal">
              ({items.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.map((b) => (
            <BillRow key={b.id} bill={b} />
          ))}
        </CardContent>
      </Card>
    ) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Monthly bills total</p>
          <p className="text-2xl font-bold">€{monthlyTotal.toFixed(0)}</p>
        </CardContent>
      </Card>

      <Section title="Upcoming" items={upcoming} accent="text-red-400" />
      <Section title="Due Soon" items={dueSoon} accent="text-yellow-400" />
      <Section title="Paid" items={paid} />
    </div>
  );
}

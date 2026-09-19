import { useApiMutation } from "@/hooks/use-api-mutation.ts";
import { updateBill } from "@/lib/api/finances.ts";
import type { Bill } from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils.ts";
import FinanceResourceControls from "./FinanceResourceControls.tsx";
import { financeWriteError } from "../finance-editor.ts";

interface Props {
  bills: Bill[];
}

const RECURRENCE_STYLES: Record<Bill["recurrence"], string> = {
  monthly: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  quarterly: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  annual: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  one_time: "bg-muted text-muted-foreground border-border",
};

interface BillRowProps {
  bill: Bill;
  now: Date;
  pending: boolean;
  onToggle: (bill: Bill) => void;
}

function BillRow({ bill, now, pending, onToggle }: BillRowProps) {
  const daysLeft = differenceInDays(new Date(bill.due_date), now);
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0",
        bill.paid && "opacity-50",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <p
              className={cn("text-sm font-medium", bill.paid && "line-through")}
            >
              {bill.name}
            </p>
            <FinanceResourceControls
              target={{ kind: "bill", record: bill }}
              categories={[]}
            />
          </div>
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
            {!bill.paid && daysLeft >= 0 && (
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
          disabled={pending}
          aria-label={bill.paid ? "Mark incomplete" : "Mark complete"}
          onClick={() => onToggle(bill)}
          className={cn(
            "text-xs px-2 py-1 rounded border transition-colors cursor-pointer",
            bill.paid
              ? "bg-green-500/15 text-green-400 border-green-500/30"
              : "bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary",
          )}
        >
          {bill.paid ? "Paid" : "Mark paid"}
        </button>
      </div>
    </div>
  );
}

interface BillsSectionProps extends Omit<BillRowProps, "bill"> {
  title: string;
  items: Bill[];
  accent?: string;
}

function BillsSection({
  title,
  items,
  accent,
  ...rowProps
}: BillsSectionProps) {
  if (items.length === 0) return null;
  return (
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
        {items.map((bill) => (
          <BillRow key={bill.id} bill={bill} {...rowProps} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function BillsView({ bills }: Props) {
  const mutation = useApiMutation(
    (input: { id: string; value: boolean }) =>
      updateBill(input.id, { paid: input.value }),
    ["finances"],
  );

  const now = new Date();
  const upcoming = bills.filter(
    (b) =>
      !b.paid &&
      differenceInDays(new Date(b.due_date), now) <= 7 &&
      differenceInDays(new Date(b.due_date), now) >= 0,
  );
  const dueSoon = bills.filter(
    (b) =>
      !b.paid &&
      differenceInDays(new Date(b.due_date), now) > 7 &&
      differenceInDays(new Date(b.due_date), now) <= 30,
  );
  const paid = bills.filter((b) => b.paid);

  const overdue = bills.filter(
    (b) => !b.paid && differenceInDays(new Date(b.due_date), now) < 0,
  );
  const later = bills.filter(
    (b) => !b.paid && differenceInDays(new Date(b.due_date), now) > 30,
  );
  const monthlyTotal = bills.reduce((a, b) => a + b.amount, 0);
  const toggleBill = (bill: Bill) =>
    mutation.mutate({ id: bill.id, value: !bill.paid });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total listed bills</p>
          <p className="text-2xl font-bold">€{monthlyTotal.toFixed(0)}</p>
        </CardContent>
      </Card>

      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {financeWriteError(mutation.error)}
        </p>
      )}

      <div className="flex justify-end">
        <FinanceResourceControls target={{ kind: "bill" }} categories={[]} />
      </div>

      {bills.length === 0 && (
        <p className="text-sm text-muted-foreground">No bills listed yet.</p>
      )}

      <BillsSection
        title="Overdue"
        items={overdue}
        accent="text-red-400"
        now={now}
        pending={mutation.isPending}
        onToggle={toggleBill}
      />
      <BillsSection
        title="Later"
        items={later}
        now={now}
        pending={mutation.isPending}
        onToggle={toggleBill}
      />
      <BillsSection
        title="Upcoming"
        items={upcoming}
        accent="text-red-400"
        now={now}
        pending={mutation.isPending}
        onToggle={toggleBill}
      />
      <BillsSection
        title="Due Soon"
        items={dueSoon}
        accent="text-yellow-400"
        now={now}
        pending={mutation.isPending}
        onToggle={toggleBill}
      />
      <BillsSection
        title="Paid"
        items={paid}
        now={now}
        pending={mutation.isPending}
        onToggle={toggleBill}
      />
    </div>
  );
}

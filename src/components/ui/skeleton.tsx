import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md border border-border/40 bg-surface-elevated/80",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

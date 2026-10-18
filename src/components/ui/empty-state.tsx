import * as React from "react";
import { cn } from "@/lib/utils.ts";

function EmptyState({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/45 p-6 text-center md:p-10",
        className,
      )}
      {...props}
    />
  );
}

function EmptyStateMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-media"
      className={cn(
        "grid size-10 place-items-center rounded-lg border border-border bg-muted/60 text-muted-foreground [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  );
}

function EmptyStateTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-title"
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function EmptyStateDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn("max-w-md text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function EmptyStateActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-actions"
      className={cn("mt-1 flex flex-wrap justify-center gap-2", className)}
      {...props}
    />
  );
}

export {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
};

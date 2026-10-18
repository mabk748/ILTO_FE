import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const normalized =
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : null;
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={normalized}
      max={100}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full border border-primary/10 bg-primary/12",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-transform duration-300"
        style={{ transform: `translateX(-${100 - (normalized ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

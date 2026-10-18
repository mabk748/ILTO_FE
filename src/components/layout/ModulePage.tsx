import {
  useLayoutEffect,
  useRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils.ts";

export function ModulePage({
  children,
  className,
  readingWidth = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { readingWidth?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-6 p-4 pb-24 md:p-6 md:pb-8",
        readingWidth ? "max-w-5xl" : "max-w-[100rem]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModuleHeader({
  title,
  description,
  eyebrow = "Personal operating system",
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  icon: ElementType;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-surface/80 p-4 shadow-[0_24px_70px_-52px_color-mix(in_srgb,var(--primary)_45%,transparent)] sm:p-5 lg:p-6",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
                {eyebrow}
              </p>
              <h1 className="truncate font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
              </h1>
            </div>
          </div>
          <div className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export function ModuleTabs<T extends string>({
  label,
  items,
  value,
  onValueChange,
}: {
  label: string;
  items: readonly { id: T; label: string; detail?: string }[];
  value: T;
  onValueChange: (value: T) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const active = activeRef.current;
    const list = active?.parentElement;
    if (!active || !list) return;

    const viewportStart = list.scrollLeft;
    const viewportEnd = viewportStart + list.clientWidth;
    const activeStart = active.offsetLeft;
    const activeEnd = activeStart + active.offsetWidth;
    if (activeStart < viewportStart) list.scrollLeft = activeStart;
    else if (activeEnd > viewportEnd) {
      list.scrollLeft = activeEnd - list.clientWidth;
    }
  }, [value]);

  return (
    <nav
      aria-label={label}
      className="scrollbar-none overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-xl border border-border/70 bg-card/55 p-1"
    >
      <div className="flex min-w-max gap-1">
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              ref={active ? activeRef : undefined}
              type="button"
              aria-pressed={active}
              onClick={() => onValueChange(item.id)}
              className={cn(
                "min-h-10 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4",
                active
                  ? "border-primary/30 bg-primary/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span className="block whitespace-nowrap">{item.label}</span>
              {item.detail && (
                <span className="mt-0.5 hidden whitespace-nowrap text-[0.68rem] font-normal text-muted-foreground lg:block">
                  {item.detail}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function ModuleSectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-mono text-lg font-bold tracking-tight">{title}</h2>
        {description && (
          <div className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

import { useState, type ComponentProps, type ReactNode } from "react";
import { useProjectScope } from "../project-scope.ts";
import { Button } from "@/components/ui/button.tsx";

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  options: readonly FilterOption[];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="min-w-36 space-y-1 text-xs">
      <span className="block text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterMultiSelect({
  label,
  allLabel,
  values,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  values: readonly string[];
  options: readonly FilterOption[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Set(values);
  const summary =
    values.length === 0
      ? allLabel
      : values.length === 1
        ? (options.find((option) => option.value === values[0])?.label ?? label)
        : `${values.length} selected`;
  const toggle = (value: string, checked: boolean) => {
    const next = new Set(values);
    if (checked) next.add(value);
    else next.delete(value);
    onChange(Array.from(next));
  };

  return (
    <div className="relative min-w-40 space-y-1 text-xs">
      <span className="block text-muted-foreground">{label}</span>
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-2 text-left text-sm"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="max-w-48 truncate">{summary}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <fieldset className="absolute left-0 z-40 mt-1 max-h-64 w-max min-w-full max-w-[calc(100vw-2rem)] space-y-1 overflow-auto rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <legend className="sr-only">{label}</legend>
          <label className="flex min-h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded px-2 hover:bg-muted">
            <input
              type="checkbox"
              checked={values.length === 0}
              onChange={() => onChange([])}
            />
            {allLabel}
          </label>
          {options.map((option) => (
            <label
              key={option.value}
              className="flex min-h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded px-2 hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={(event) => toggle(option.value, event.target.checked)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

/** Workspace ownership is fixed by the route; other filters stay available. */
export function ProjectScopeFilter(
  props: ComponentProps<typeof FilterMultiSelect>,
) {
  const projectId = useProjectScope();
  return projectId === undefined ? <FilterMultiSelect {...props} /> : null;
}

export function ProjectFilterBar({
  children,
  total,
  shown,
  noun,
  activeLabels,
  onClear,
}: {
  children: ReactNode;
  total: number;
  shown: number;
  noun: string;
  activeLabels: readonly string[];
  onClear: () => void;
}) {
  const filtered = activeLabels.length > 0;
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="font-medium">
            {filtered ? `${shown} of ${total}` : total} {noun}
            {total === 1 ? "" : "s"}
            {filtered ? " shown" : ""}
          </span>
          {activeLabels.map((item) => (
            <span
              key={item}
              className="rounded-full border bg-muted px-2 py-0.5 text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
        {filtered && (
          <Button type="button" size="sm" variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

export function FilteredEmptyState({
  noun,
  onClear,
}: {
  noun: string;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      <p>No {noun} match the current filters.</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={onClear}
      >
        Clear filters
      </Button>
    </div>
  );
}

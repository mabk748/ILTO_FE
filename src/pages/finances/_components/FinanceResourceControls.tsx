import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import type { BudgetCategory } from "@/lib/api/types.ts";
import {
  financeWriteError,
  initialDraft,
  recurrences,
  removeFinanceResource,
  saveFinanceResource,
  transactionTypes,
  type FinanceTarget,
} from "../finance-editor.ts";

function targetLabel(target: FinanceTarget): string {
  if (!target.record) return target.kind;
  return "name" in target.record
    ? target.record.name
    : target.record.description;
}

export default function FinanceResourceControls({
  target,
  categories,
}: {
  target: FinanceTarget;
  categories: BudgetCategory[];
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const disabled =
    !target.record && target.kind === "transaction" && categories.length === 0;
  const label = targetLabel(target);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={target.record ? "outline" : "default"}
          disabled={disabled}
          aria-label={
            target.record
              ? `Edit ${target.kind}: ${label}`
              : `Create ${target.kind}`
          }
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setMode("edit");
          }}
        >
          {target.record ? "Edit" : `Create ${target.kind}`}
        </Button>
        {target.record && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Delete ${target.kind}: ${label}`}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setMode("delete");
            }}
          >
            Delete
          </Button>
        )}
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => !open && setMode(null)}
      >
        {mode && (
          <Editor
            key={mode}
            target={target}
            categories={categories}
            mode={mode}
            onClose={() => setMode(null)}
            restoreFocus={() => trigger.current?.focus()}
          />
        )}
      </Dialog>
    </>
  );
}

function Editor({
  target,
  categories,
  mode,
  onClose,
  restoreFocus,
}: {
  target: FinanceTarget;
  categories: BudgetCategory[];
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => initialDraft(target));
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "delete"
        ? removeFinanceResource(target)
        : saveFinanceResource(target, values, categories),
    retry: false,
  });
  const change = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await Promise.all(
        ["finances", "dashboard", "intelligence"].map((domain) =>
          queryClient.invalidateQueries({ queryKey: [domain] }),
        ),
      );
      onClose();
    } catch {
      // Keep the form open and display the confirmed server/client failure.
    }
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
    maxLength?: number,
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type={type}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        maxLength={maxLength}
        value={values[key] ?? ""}
        onChange={(event) => change(key, event.target.value)}
      />
    </div>
  );
  const select = (key: string, label: string, options: string[]) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <select
        id={`${id}-${key}`}
        className="bg-background h-9 w-full rounded-md border px-3 text-sm"
        value={values[key] ?? ""}
        required
        onChange={(event) => change(key, event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <DialogContent
      className="max-h-[90vh] overflow-y-auto"
      showCloseButton={!mutation.isPending}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        restoreFocus();
      }}
      onEscapeKeyDown={(event) => mutation.isPending && event.preventDefault()}
      onInteractOutside={(event) =>
        mutation.isPending && event.preventDefault()
      }
    >
      <DialogHeader>
        <DialogTitle>
          {mode === "delete" ? "Delete" : target.record ? "Edit" : "Create"}{" "}
          {target.kind}
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? "The backend confirms deletion and preserves related records on conflict."
            : "Changes are saved only after the backend confirms them. Monetary values use EUR."}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && target.kind === "category" && (
            <>
              {field("name", "Name", "text", true, 200)}
              {field("monthly_limit", "Monthly limit", "number", true)}
              {field("color", "Color", "text", true, 7)}
            </>
          )}
          {mode === "edit" && target.kind === "transaction" && (
            <>
              <div className="space-y-1">
                <Label htmlFor={`${id}-category_id`}>Budget category</Label>
                <select
                  id={`${id}-category_id`}
                  className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={values.category_id}
                  required
                  onChange={(event) =>
                    change("category_id", event.target.value)
                  }
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              {select("type", "Type", transactionTypes)}
              {field("amount", "Amount (EUR)", "number", true)}
              {select("currency", "Currency", ["EUR"])}
              {field("description", "Description", "text", false, 4000)}
              {field("date", "Date and time", "datetime-local", true)}
              {field("tags", "Tags (comma-separated)", "text", false, 500)}
              <p className="text-xs text-muted-foreground">
                Date and time are converted to UTC when saved.
              </p>
            </>
          )}
          {mode === "edit" && target.kind === "bill" && (
            <>
              {field("name", "Name", "text", true, 200)}
              {field("amount", "Amount (EUR)", "number", true)}
              {field("due_date", "Due date and time", "datetime-local", true)}
              {select("recurrence", "Recurrence", recurrences)}
              {field("category", "Category", "text", true, 200)}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.paid === "true"}
                  onChange={(event) =>
                    change("paid", String(event.target.checked))
                  }
                />
                Paid
              </label>
              <p className="text-xs text-muted-foreground">
                Recurring bills are metadata; saving Paid does not create
                another bill.
              </p>
            </>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {financeWriteError(mutation.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={mode === "delete" ? "destructive" : "default"}
            >
              {mutation.isPending
                ? "Saving…"
                : mode === "delete"
                  ? "Confirm delete"
                  : "Save"}
            </Button>
          </div>
        </fieldset>
      </form>
    </DialogContent>
  );
}

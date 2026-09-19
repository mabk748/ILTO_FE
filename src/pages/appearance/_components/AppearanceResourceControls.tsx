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
import type { WardrobeItem } from "@/lib/api/types.ts";
import {
  appearanceWriteError,
  clothingCategories,
  initialDraft,
  removeAppearanceResource,
  saveAppearanceResource,
  seasons,
  wardrobeConditions,
  type AppearanceDraft,
  type AppearanceTarget,
} from "../appearance-editor.ts";

function targetLabel(target: AppearanceTarget): string {
  if (!target.record) return target.kind;
  return target.kind === "wardrobe"
    ? target.record.name
    : target.record.occasion;
}

function kindLabel(kind: AppearanceTarget["kind"]): string {
  return kind === "wardrobe" ? "wardrobe item" : "outfit log";
}

export default function AppearanceResourceControls({
  target,
  wardrobeItems,
}: {
  target: AppearanceTarget;
  wardrobeItems: WardrobeItem[];
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const label = targetLabel(target);
  const disabled =
    !target.record && target.kind === "outfit" && wardrobeItems.length === 0;
  const kind = kindLabel(target.kind);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={target.record ? "outline" : "default"}
          disabled={disabled}
          aria-label={
            target.record ? `Edit ${kind}: ${label}` : `Create ${kind}`
          }
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setMode("edit");
          }}
        >
          {target.record ? "Edit" : `Create ${kind}`}
        </Button>
        {target.record && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Delete ${kind}: ${label}`}
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
            wardrobeItems={wardrobeItems}
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
  wardrobeItems,
  mode,
  onClose,
  restoreFocus,
}: {
  target: AppearanceTarget;
  wardrobeItems: WardrobeItem[];
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AppearanceDraft>(() =>
    initialDraft(target),
  );
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "delete"
        ? removeAppearanceResource(target)
        : saveAppearanceResource(target, values, wardrobeItems),
    retry: false,
  });
  const change = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const selectedItemIds = Array.isArray(values.item_ids) ? values.item_ids : [];
  const toggleItem = (itemId: string) =>
    setValues((previous) => {
      const selected = Array.isArray(previous.item_ids)
        ? previous.item_ids
        : [];
      return {
        ...previous,
        item_ids: selected.includes(itemId)
          ? selected.filter((id) => id !== itemId)
          : [...selected, itemId],
      };
    });
  const removeMissingItem = (itemId: string) =>
    setValues((previous) => ({
      ...previous,
      item_ids: (Array.isArray(previous.item_ids)
        ? previous.item_ids
        : []
      ).filter((id) => id !== itemId),
    }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["appearance"] });
      onClose();
    } catch {
      // The dialog intentionally stays open to show validation or API failures.
    }
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
    extra?: { maxLength?: number; min?: string; max?: string; step?: string },
  ) => {
    const value = values[key];
    return (
      <div className="space-y-1" key={key}>
        <Label htmlFor={`${id}-${key}`}>{label}</Label>
        <Input
          id={`${id}-${key}`}
          type={type}
          required={required}
          min={extra?.min}
          max={extra?.max}
          step={extra?.step}
          maxLength={extra?.maxLength}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => change(key, event.target.value)}
        />
      </div>
    );
  };
  const select = (key: string, label: string, options: readonly string[]) => {
    const value = values[key];
    return (
      <div className="space-y-1" key={key}>
        <Label htmlFor={`${id}-${key}`}>{label}</Label>
        <select
          id={`${id}-${key}`}
          className="bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={typeof value === "string" ? value : ""}
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
  };
  const missingItemIds =
    target.kind === "outfit"
      ? selectedItemIds.filter(
          (itemId) => !wardrobeItems.some((item) => item.id === itemId),
        )
      : [];
  const kind = kindLabel(target.kind);

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
          {kind}
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? "The view refreshes only after the backend confirms this deletion."
            : target.kind === "wardrobe"
              ? "Wear counts and last worn are server-owned. Blank nullable fields are saved as null."
              : "Select current wardrobe items. Date and time are converted to UTC when saved."}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && target.kind === "wardrobe" && (
            <>
              {field("name", "Name", "text", true, { maxLength: 200 })}
              {field("brand", "Brand", "text", false, { maxLength: 200 })}
              {select("category", "Category", clothingCategories)}
              {field("color", "Color", "text", true, { maxLength: 100 })}
              {select("season", "Season", seasons)}
              {select("condition", "Condition", wardrobeConditions)}
              {field("purchase_date", "Purchase date", "datetime-local")}
              {field("purchase_price", "Purchase price", "number", false, {
                min: "0",
                step: "0.01",
              })}
              {field("tags", "Tags (comma-separated)", "text", false, {
                maxLength: 1019,
              })}
              {field("image_placeholder", "Image placeholder", "text", true, {
                maxLength: 7,
              })}
              <p className="text-xs text-muted-foreground">
                Image placeholder must be a six-digit hexadecimal color such as
                #123456. Tags are saved as an array of short strings.
              </p>
            </>
          )}
          {mode === "edit" && target.kind === "outfit" && (
            <>
              <div
                className="space-y-2"
                role="group"
                aria-labelledby={`${id}-items`}
              >
                <p id={`${id}-items`} className="text-sm font-medium">
                  Wardrobe items
                </p>
                {wardrobeItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                    {item.name}
                  </label>
                ))}
              </div>
              {missingItemIds.length > 0 && (
                <div className="space-y-2 text-sm text-destructive">
                  <p>
                    This historical outfit references {missingItemIds.length}{" "}
                    deleted wardrobe item
                    {missingItemIds.length === 1 ? "" : "s"}. Remove
                    {missingItemIds.length === 1 ? " it" : " them"} before
                    saving.
                  </p>
                  {missingItemIds.map((itemId) => (
                    <Button
                      key={itemId}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeMissingItem(itemId)}
                    >
                      Remove unavailable item
                    </Button>
                  ))}
                </div>
              )}
              {field("date", "Outfit date", "datetime-local", true)}
              {field("occasion", "Occasion", "text", true, { maxLength: 200 })}
              {field("rating", "Rating (1–5)", "number", true, {
                min: "1",
                max: "5",
                step: "1",
              })}
              {field("notes", "Notes", "text", false, { maxLength: 4000 })}
            </>
          )}
          {mode === "delete" && (
            <p className="text-sm text-muted-foreground">
              The backend may reject this delete when related data conflicts.
            </p>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {appearanceWriteError(mutation.error)}
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

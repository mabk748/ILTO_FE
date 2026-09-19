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
import { deleteContact } from "@/lib/api/social.ts";
import type { Contact } from "@/lib/api/types.ts";
import {
  contactStatuses,
  initialDraft,
  relationshipTypes,
  saveContact,
  socialWriteError,
  type ContactDraft,
} from "../social-editor.ts";

export default function ContactControls({ contact }: { contact?: Contact }) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const label = contact?.name ?? "contact";
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={contact ? "outline" : "default"}
          aria-label={contact ? `Edit contact: ${label}` : "Create contact"}
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setMode("edit");
          }}
        >
          {contact ? "Edit" : "Create contact"}
        </Button>
        {contact && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Delete contact: ${label}`}
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
            contact={contact}
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
  contact,
  mode,
  onClose,
  restoreFocus,
}: {
  contact?: Contact;
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ContactDraft>(() =>
    initialDraft(contact),
  );
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "delete"
        ? contact
          ? deleteContact(contact.id)
          : Promise.reject(new Error("Select a saved contact first."))
        : saveContact(contact, values),
    retry: false,
  });
  const change = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await Promise.all(
        ["social", "dashboard"].map((domain) =>
          queryClient.invalidateQueries({ queryKey: [domain] }),
        ),
      );
      onClose();
    } catch {
      // Keep the form open to show the confirmed local or server failure.
    }
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
    extra?: { maxLength?: number },
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type={type}
        required={required}
        maxLength={extra?.maxLength}
        value={values[key] ?? ""}
        onChange={(event) => change(key, event.target.value)}
      />
    </div>
  );
  const select = (key: string, label: string, options: readonly string[]) => (
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
          {mode === "delete" ? "Delete" : contact ? "Edit" : "Create"} contact
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? "Confirm deletion. The backend also deletes this contact's dependent follow-up prompts."
            : "Optional contact dates are converted to UTC; leave optional fields blank to save null."}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && (
            <>
              {field("name", "Name", "text", true, { maxLength: 200 })}
              {field("email", "Email", "email", false, { maxLength: 320 })}
              {field("phone", "Phone", "tel", false, { maxLength: 100 })}
              {select("relationship", "Relationship", relationshipTypes)}
              {select("status", "Status", contactStatuses)}
              {field("last_contact", "Last contact", "datetime-local")}
              {field("next_followup", "Next follow-up", "datetime-local")}
              {field("notes", "Notes", "text", false, { maxLength: 4000 })}
              {field("tags", "Tags (comma-separated)", "text", false, {
                maxLength: 1019,
              })}
              <p className="text-xs text-muted-foreground">
                Tags are saved as an array of up to 20 short strings, not as one
                comma-separated value.
              </p>
            </>
          )}
          {mode === "delete" && (
            <p className="text-sm text-muted-foreground">
              The view will refresh only after the backend confirms this delete.
            </p>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {socialWriteError(mutation.error)}
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

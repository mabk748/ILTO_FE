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
import {
  createNode,
  deleteNode,
  updateNode,
  type CreateNodeInput,
} from "@/lib/api/infrastructure.ts";
import type { InfraNode } from "@/lib/api/types.ts";
import { ApiError } from "@/lib/api/errors.ts";

const nodeTypes = ["laptop", "server", "raspberry_pi", "mobile"] as const;
type NodeType = (typeof nodeTypes)[number];
type Draft = Record<keyof CreateNodeInput, string>;

function initialDraft(node?: InfraNode): Draft {
  return {
    name: node?.name ?? "",
    hostname: node?.hostname ?? "",
    type: node?.type ?? "server",
    ip_address: node?.ip_address ?? "",
    os: node?.os ?? "",
  };
}

function changedFields(input: CreateNodeInput, original: InfraNode) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => value !== original[key as keyof CreateNodeInput],
    ),
  );
}

function required(value: string, label: string, maxLength: number): string {
  if (!value.trim() || value.length > maxLength) {
    throw new Error(
      `${label} is required and must be at most ${maxLength} characters.`,
    );
  }
  return value;
}

function nodeInput(values: Draft): CreateNodeInput {
  if (!nodeTypes.includes(values.type as NodeType))
    throw new Error("Choose a valid node type.");
  if (/\s/.test(values.hostname))
    throw new Error("Hostname must not contain spaces.");
  return {
    name: required(values.name, "Name", 200),
    hostname: required(values.hostname, "Hostname", 253),
    type: values.type as NodeType,
    ip_address: required(values.ip_address, "IP address", 45),
    os: required(values.os, "Operating system", 200),
  };
}

function nodeWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409)
      return "This node has stored measurements and cannot be deleted. Its history was preserved.";
    if (error.status === 422)
      return "The backend rejected these node values. Check the hostname, IP address, type, and required fields.";
    if (error.status === 404)
      return "This node no longer exists. Refresh the Infrastructure view and try again.";
    if (
      error.code === "network" ||
      error.code === "timeout" ||
      error.status === 503
    )
      return "The backend could not confirm this change. Refresh and check whether it was saved before retrying.";
  }
  return error instanceof Error
    ? error.message
    : "Could not save the node change.";
}

export default function NodeControls({ node }: { node?: InfraNode }) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const label = node?.name ?? "node";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={node ? "outline" : "default"}
          aria-label={node ? `Edit node: ${label}` : "Create node"}
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setMode("edit");
          }}
        >
          {node ? "Edit" : "Create node"}
        </Button>
        {node && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Delete node: ${label}`}
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
        onOpenChange={(open) => {
          if (!open) setMode(null);
        }}
      >
        {mode && (
          <Editor
            key={mode}
            node={node}
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
  node,
  mode,
  onClose,
  restoreFocus,
}: {
  node?: InfraNode;
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => initialDraft(node));
  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "delete") {
        if (!node) throw new Error("Select a saved node first.");
        return deleteNode(node.id);
      }
      const input = nodeInput(values);
      return node
        ? updateNode(node.id, changedFields(input, node))
        : createNode(input);
    },
    retry: false,
  });

  const change = (key: keyof Draft, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["infrastructure"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      onClose();
    } catch {
      // The error is rendered below; the dialog remains open and no optimistic
      // change is made to the node inventory.
    }
  };

  const field = (key: keyof Draft, label: string, maxLength: number) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        value={values[key]}
        required
        maxLength={maxLength}
        onChange={(event) => change(key, event.target.value)}
      />
    </div>
  );

  return (
    <DialogContent
      showCloseButton={!mutation.isPending}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        restoreFocus();
      }}
      onEscapeKeyDown={(event) => {
        if (mutation.isPending) event.preventDefault();
      }}
      onInteractOutside={(event) => {
        if (mutation.isPending) event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {mode === "delete"
            ? `Delete ${node?.name ?? "node"}?`
            : node
              ? "Edit node"
              : "Create node"}
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? "The backend will reject deletion when stored measurements depend on this node."
            : "Only node metadata is writable. Status and last seen come from the backend."}
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
              {field("name", "Name", 200)}
              {field("hostname", "Hostname", 253)}
              <div className="space-y-1">
                <Label htmlFor={`${id}-type`}>Type</Label>
                <select
                  id={`${id}-type`}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={values.type}
                  required
                  onChange={(event) => change("type", event.target.value)}
                >
                  {nodeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              {field("ip_address", "IP address", 45)}
              {field("os", "Operating system", 200)}
            </>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {nodeWriteError(mutation.error)}
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

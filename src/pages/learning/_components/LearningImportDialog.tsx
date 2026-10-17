import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ApiError } from "@/lib/api/errors.ts";
import {
  importLearningPlan,
  type LearningImportResource,
  type LearningImportResult,
} from "@/lib/api/learning.ts";
import type {
  LearningGoal,
  LearningMilestone,
  Project,
  StudySchedule,
} from "@/lib/api/types.ts";
import {
  LEARNING_IMPORT_RESOURCES,
  LEARNING_IMPORT_RESOURCE_LABELS,
  learningImportProblem,
  learningJsonTemplate,
  parseLearningImportSource,
  prepareLearningImport,
  type LearningImportProblem,
  type LearningImportSource,
  type PreparedLearningImport,
} from "../learning-import.ts";
import { learningQueryKeys } from "../learning-query-keys.ts";

const PREVIEW_ROW_LIMIT = 100;

interface LearningImportDialogProps {
  goals: LearningGoal[];
  schedules: StudySchedule[];
  milestones: LearningMilestone[];
  projects: Project[];
  disabled?: boolean;
}

type TemplateResource = LearningImportResource | "package";

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}

function downloadTemplate(resource: TemplateResource): void {
  const blob = new Blob([learningJsonTemplate(resource)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ilto-learning-${resource}-template.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return error instanceof Error ? error.message : "The import failed.";
  const problem = learningImportProblem(error);
  if (problem)
    return `${LEARNING_IMPORT_RESOURCE_LABELS[problem.resource]} row ${problem.row}${problem.field ? `, ${problem.field}` : ""}: ${problem.message}`;
  if (error.status === 404)
    return "The Learning import endpoint is not available in the deployed backend.";
  if (error.status === 409)
    return "The backend rejected a duplicate or conflicting record. Nothing was imported.";
  if (error.status === 413)
    return "The backend rejected this import because it exceeds the 2 MB or 2,000-row limit.";
  if (error.status === 422)
    return "The backend found invalid fields or relationships. Nothing was imported; review the preview and validation response.";
  if (error.status === 503)
    return "The import service is temporarily unavailable. Your selected file remains open so you can retry.";
  if (error.code === "timeout")
    return "The import timed out. The backend did not confirm success; verify server state before retrying.";
  if (error.code === "network")
    return "Could not reach the API. The import was not confirmed.";
  if (error.code === "aborted") return "The import request was cancelled.";
  return error.message;
}

export default function LearningImportDialog({
  goals,
  schedules,
  milestones,
  projects,
  disabled = false,
}: LearningImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState<LearningImportSource | null>(null);
  const [resource, setResource] = useState<LearningImportResource | "">("");
  const [prepared, setPrepared] = useState<PreparedLearningImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [serverProblem, setServerProblem] =
    useState<LearningImportProblem | null>(null);
  const [result, setResult] = useState<LearningImportResult | null>(null);
  const [templateResource, setTemplateResource] =
    useState<TemplateResource>("package");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const queryClient = useQueryClient();
  const context = useMemo(
    () => ({ goals, schedules, milestones, projects }),
    [goals, milestones, projects, schedules],
  );
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof importLearningPlan>[0]) =>
      importLearningPlan(input),
    retry: false,
    onSuccess: async (saved) => {
      setServerProblem(null);
      setResult(saved);
      await queryClient.invalidateQueries({
        queryKey: learningQueryKeys.all,
      });
    },
    onError: (error) => setServerProblem(learningImportProblem(error)),
  });

  function resetImport(): void {
    setFileInputKey((value) => value + 1);
    setFileName("");
    setSource(null);
    setResource("");
    setPrepared(null);
    setParseError(null);
    setServerProblem(null);
    setResult(null);
    mutation.reset();
  }

  function close(): void {
    if (mutation.isPending) return;
    setOpen(false);
    resetImport();
  }

  async function selectFile(file: File | undefined): Promise<void> {
    resetImport();
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = parseLearningImportSource(
        file.name,
        await readFileText(file),
      );
      setSource(parsed);
      if (parsed.kind === "single") {
        const stem = file.name.replace(/\.[^.]+$/, "").toLocaleLowerCase();
        const inferred = LEARNING_IMPORT_RESOURCES.find(
          (candidate) =>
            stem === candidate ||
            stem === candidate.slice(0, -1) ||
            (candidate === "schedules" && stem.includes("schedule")),
        );
        if (inferred) setResource(inferred);
      }
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "The file could not be read.",
      );
    }
  }

  function buildPreview(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!source) return;
    setParseError(null);
    setServerProblem(null);
    mutation.reset();
    try {
      setPrepared(
        prepareLearningImport(source, context, resource || undefined),
      );
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : "The preview could not be built.",
      );
    }
  }

  function confirmImport(): void {
    if (
      !prepared ||
      prepared.invalid > 0 ||
      serverProblem ||
      mutation.isPending
    )
      return;
    mutation.mutate(prepared.request);
  }

  const shownRows = prepared?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [];
  const importCount = prepared ? prepared.valid + prepared.warnings : 0;
  const template = learningJsonTemplate(templateResource);

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <FileUp aria-hidden="true" /> Import plan
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) close();
        }}
      >
        <DialogContent
          className="max-h-[92vh] overflow-y-auto sm:max-w-5xl"
          showCloseButton={!mutation.isPending}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Import a Learning plan</DialogTitle>
            <DialogDescription>
              Import planning structure—Goals, weekly schedules, and
              milestones—from one JSON file. The file is parsed locally and sent
              only after you confirm the preview.
            </DialogDescription>
          </DialogHeader>

          {!result && (
            <form onSubmit={buildPreview} className="space-y-5">
              <fieldset disabled={mutation.isPending} className="space-y-5">
                <section
                  className="space-y-2"
                  aria-labelledby="learning-source"
                >
                  <h2 id="learning-source" className="font-semibold">
                    1. Source
                  </h2>
                  <Label htmlFor="learning-import-file">JSON file</Label>
                  <input
                    key={fileInputKey}
                    id="learning-import-file"
                    type="file"
                    accept=".json,application/json"
                    aria-describedby="learning-import-help"
                    className="block w-full rounded-md border bg-background p-2 text-sm"
                    onChange={(event) =>
                      void selectFile(event.target.files?.[0])
                    }
                  />
                  <p
                    id="learning-import-help"
                    className="text-xs text-muted-foreground"
                  >
                    Supports an ILTO package or a single-resource JSON array.
                    Frontend and backend limits are 2 MB and 2,000 total
                    records. File contents are not persisted in the browser.
                  </p>
                  {fileName && <p className="text-sm">File: {fileName}</p>}
                </section>

                <details className="rounded-md border p-3">
                  <summary className="cursor-pointer font-medium">
                    Instructions and JSON template
                  </summary>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      This importer creates planning records only. Log study
                      sessions, assessments, bottlenecks, and weekly reviews
                      through normal Learning actions after the work happens.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <label className="space-y-1 text-sm">
                        <span className="block">Template</span>
                        <select
                          aria-label="Learning template resource"
                          className="w-full rounded-md border bg-background p-2"
                          value={templateResource}
                          onChange={(event) =>
                            setTemplateResource(
                              event.target.value as TemplateResource,
                            )
                          }
                        >
                          <option value="package">Full planning package</option>
                          {LEARNING_IMPORT_RESOURCES.map((value) => (
                            <option key={value} value={value}>
                              {LEARNING_IMPORT_RESOURCE_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="self-end"
                        onClick={() => downloadTemplate(templateResource)}
                      >
                        <Download aria-hidden="true" /> Download JSON template
                      </Button>
                    </div>
                    <pre className="max-h-52 overflow-auto rounded bg-muted p-3 text-xs">
                      {template}
                    </pre>
                  </div>
                </details>

                {source?.kind === "single" && (
                  <section
                    className="space-y-2"
                    aria-labelledby="learning-kind"
                  >
                    <h2 id="learning-kind" className="font-semibold">
                      2. Resource
                    </h2>
                    <label className="block max-w-sm space-y-1 text-sm">
                      <span className="block">
                        What does this JSON array contain?
                      </span>
                      <select
                        aria-label="Learning import resource"
                        required
                        className="w-full rounded-md border bg-background p-2"
                        value={resource}
                        onChange={(event) => {
                          setResource(
                            event.target.value as LearningImportResource,
                          );
                          setPrepared(null);
                          setServerProblem(null);
                        }}
                      >
                        <option value="">Choose a resource</option>
                        {LEARNING_IMPORT_RESOURCES.map((value) => (
                          <option key={value} value={value}>
                            {LEARNING_IMPORT_RESOURCE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Canonical snake_case Learning fields are mapped
                      automatically.
                    </p>
                  </section>
                )}

                {source?.kind === "package" && (
                  <section
                    className="space-y-1"
                    aria-labelledby="learning-package"
                  >
                    <h2 id="learning-package" className="font-semibold">
                      2. JSON package recognized
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {LEARNING_IMPORT_RESOURCES.map(
                        (value) =>
                          `${LEARNING_IMPORT_RESOURCE_LABELS[value]}: ${source.resources[value].length}`,
                      ).join(" · ")}
                    </p>
                  </section>
                )}

                {parseError && (
                  <p role="alert" className="text-sm text-destructive">
                    {parseError}
                  </p>
                )}

                {source && (
                  <Button
                    type="submit"
                    disabled={source.kind === "single" && !resource}
                  >
                    Build preview
                  </Button>
                )}

                {prepared && (
                  <section
                    className="space-y-3"
                    aria-labelledby="learning-preview"
                  >
                    <div>
                      <h2 id="learning-preview" className="font-semibold">
                        3. Preview
                      </h2>
                      <p className="text-sm">
                        {fileName} ·{" "}
                        {LEARNING_IMPORT_RESOURCES.map(
                          (value) =>
                            `${prepared.counts[value]} ${LEARNING_IMPORT_RESOURCE_LABELS[value]}`,
                        ).join(" · ")}
                      </p>
                      <p className="text-sm">
                        Validation: {prepared.valid} valid · {prepared.warnings}{" "}
                        warnings · {prepared.invalid} invalid · Duplicate
                        policy: Reject
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Frontend checks improve the preview; the backend remains
                        authoritative for ownership, duplicates, constraints,
                        and transactionality.
                      </p>
                    </div>

                    <div className="max-h-80 overflow-auto rounded-md border">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <caption className="sr-only">
                          Learning plan import preview
                        </caption>
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="p-2">Resource</th>
                            <th className="p-2">Row</th>
                            <th className="p-2">Name/title</th>
                            <th className="p-2">Parent Goal</th>
                            <th className="p-2">Planning values</th>
                            <th className="p-2">Validation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shownRows.map((row) => {
                            const rowProblem =
                              serverProblem?.resource === row.resource &&
                              serverProblem.row === row.row
                                ? serverProblem
                                : null;
                            return (
                              <tr
                                key={`${row.resource}-${row.row}`}
                                className="border-t align-top"
                              >
                                <td className="p-2">
                                  {
                                    LEARNING_IMPORT_RESOURCE_LABELS[
                                      row.resource
                                    ]
                                  }
                                </td>
                                <td className="p-2">{row.row}</td>
                                <td className="p-2">{row.label}</td>
                                <td className="p-2">{row.relationship}</td>
                                <td className="p-2">{row.planning}</td>
                                <td className="p-2">
                                  <span className="font-semibold uppercase">
                                    {rowProblem ? "server error" : row.status}
                                  </span>
                                  {row.issues.map((issue, index) => (
                                    <span
                                      key={`${issue.code}-${issue.field}-${index}`}
                                      className="mt-1 block"
                                    >
                                      {issue.field ? `${issue.field}: ` : ""}
                                      {issue.message}
                                    </span>
                                  ))}
                                  {rowProblem && (
                                    <span className="mt-1 block">
                                      {rowProblem.field
                                        ? `${rowProblem.field}: `
                                        : ""}
                                      {rowProblem.message} ({rowProblem.code})
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {prepared.rows.length > PREVIEW_ROW_LIMIT && (
                      <p className="text-xs text-muted-foreground">
                        Showing the first {PREVIEW_ROW_LIMIT} rows; all{" "}
                        {prepared.rows.length} rows were validated and included
                        in the summary.
                      </p>
                    )}
                    {prepared.invalid > 0 && (
                      <p role="alert" className="text-sm text-destructive">
                        Resolve every invalid row before importing. Invalid rows
                        are never silently discarded.
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      The import is atomic: if any record fails validation on
                      the server, nothing from this import will be saved.
                    </p>
                    {mutation.error && (
                      <p role="alert" className="text-sm text-destructive">
                        {importErrorMessage(mutation.error)}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" onClick={close}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={
                          prepared.invalid > 0 ||
                          Boolean(serverProblem) ||
                          mutation.isPending
                        }
                        onClick={confirmImport}
                      >
                        {mutation.isPending
                          ? "Importing…"
                          : `Import ${importCount} records`}
                      </Button>
                    </div>
                  </section>
                )}
              </fieldset>
            </form>
          )}

          {result && (
            <section className="space-y-4" aria-live="polite">
              <div>
                <h2 className="font-semibold">Import completed</h2>
                <p className="text-sm text-muted-foreground">
                  The backend confirmed the complete atomic batch and Learning
                  data was refreshed.
                </p>
              </div>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {LEARNING_IMPORT_RESOURCES.map((value) => (
                  <div key={value} className="rounded-md border p-3">
                    <dt className="text-xs text-muted-foreground">
                      {LEARNING_IMPORT_RESOURCE_LABELS[value]}
                    </dt>
                    <dd className="font-mono text-xl">
                      {result.created[value]}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm">
                Skipped: {result.skipped} · Failed: {result.failed} · Warnings:{" "}
                {result.warnings.length}
              </p>
              {result.warnings.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {result.warnings.map((item, index) => (
                    <li
                      key={`${item.resource}-${item.row}-${item.code}-${index}`}
                    >
                      {LEARNING_IMPORT_RESOURCE_LABELS[item.resource]} row{" "}
                      {item.row}: {item.message}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end">
                <Button type="button" onClick={close}>
                  View Learning
                </Button>
              </div>
            </section>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

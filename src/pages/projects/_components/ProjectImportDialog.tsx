import { useMemo, useRef, useState, type FormEvent } from "react";
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
  importProjects,
  type ProjectImportResource,
  type ProjectImportResult,
} from "@/lib/api/projects.ts";
import { useProjectsMutation } from "../use-projects-mutation.ts";
import { useProjectsData } from "../projects-data.ts";
import {
  PROJECT_IMPORT_RESOURCES,
  autoMapImportFields,
  importFields,
  mappingProblem,
  parseProjectImportSource,
  prepareProjectImport,
  projectCsvTemplate,
  projectJsonTemplate,
  type PreparedProjectImport,
  type ProjectImportMapping,
  type ProjectImportSource,
} from "../project-import.ts";

const PREVIEW_ROW_LIMIT = 100;

const RESOURCE_LABELS: Record<ProjectImportResource, string> = {
  projects: "Projects",
  sprints: "Sprints",
  tasks: "Tasks",
  milestones: "Milestones",
};

type TemplateResource = ProjectImportResource | "package";

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}

function importError(error: unknown): string {
  if (!(error instanceof ApiError))
    return error instanceof Error ? error.message : "The import failed.";
  if (error.status === 404)
    return "The Projects import endpoint is not available in the deployed backend yet.";
  if (error.status === 409)
    return "The backend rejected a duplicate or conflicting record. Nothing was imported.";
  if (error.status === 413)
    return "The backend rejected this import because it exceeds its size or row limit.";
  if (error.status === 422)
    return "The backend found invalid fields or relationships. Nothing was imported; review its validation details and the preview.";
  if (error.status === 503)
    return "The import service is temporarily unavailable. Your selected file remains open so you can retry.";
  if (error.code === "timeout")
    return "The import timed out. The backend did not confirm success; verify server state before retrying.";
  if (error.code === "network")
    return "Could not reach the API. The import was not confirmed.";
  if (error.code === "aborted") return "The import request was cancelled.";
  return error.message;
}

function templateContents(resource: TemplateResource, format: "csv" | "json") {
  if (resource === "package") return projectJsonTemplate("package");
  return format === "csv"
    ? projectCsvTemplate(resource)
    : projectJsonTemplate(resource);
}

function downloadTemplate(resource: TemplateResource, format: "csv" | "json") {
  const effectiveFormat = resource === "package" ? "json" : format;
  const blob = new Blob([templateContents(resource, effectiveFormat)], {
    type: effectiveFormat === "csv" ? "text/csv" : "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ilto-projects-${resource}-template.${effectiveFormat}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ProjectImportDialog() {
  const [open, setOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState<ProjectImportSource | null>(null);
  const [resource, setResource] = useState<ProjectImportResource | "">("");
  const [mapping, setMapping] = useState<ProjectImportMapping>({});
  const [prepared, setPrepared] = useState<PreparedProjectImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ProjectImportResult | null>(null);
  const [templateResource, setTemplateResource] =
    useState<TemplateResource>("tasks");
  const [templateFormat, setTemplateFormat] = useState<"csv" | "json">("csv");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const { data, isPending, isError } = useProjectsData();
  // Packages and single-resource imports can both contain Milestones.
  const mutation = useProjectsMutation(importProjects, {
    invalidateHorizon: true,
  });

  const mappingMessage = useMemo(
    () =>
      source?.kind === "single" && resource
        ? mappingProblem(mapping, resource)
        : null,
    [mapping, resource, source],
  );

  function resetImport() {
    setFileInputKey((value) => value + 1);
    setFileName("");
    setSource(null);
    setResource("");
    setMapping({});
    setPrepared(null);
    setParseError(null);
    setResult(null);
    mutation.reset();
  }

  function close() {
    if (mutation.isPending) return;
    setOpen(false);
    resetImport();
  }

  async function selectFile(file: File | undefined) {
    resetImport();
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = parseProjectImportSource(
        file.name,
        await readFileText(file),
      );
      setSource(parsed);
      if (parsed.kind === "package") return;
      const stem = file.name.replace(/\.[^.]+$/, "").toLocaleLowerCase();
      const inferred = PROJECT_IMPORT_RESOURCES.find(
        (candidate) => stem === candidate || stem === candidate.slice(0, -1),
      );
      if (inferred) {
        setResource(inferred);
        setMapping(autoMapImportFields(parsed.fields, inferred));
      }
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "The file could not be read.",
      );
    }
  }

  function chooseResource(next: ProjectImportResource) {
    setResource(next);
    setPrepared(null);
    if (source?.kind === "single")
      setMapping(autoMapImportFields(source.fields, next));
  }

  function preview(event: FormEvent) {
    event.preventDefault();
    if (!source || !data) return;
    setParseError(null);
    try {
      setPrepared(
        prepareProjectImport(
          source,
          data,
          resource || undefined,
          source.kind === "single" ? mapping : undefined,
        ),
      );
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : "The preview could not be built.",
      );
    }
  }

  function confirmImport() {
    if (!prepared || prepared.invalid > 0 || mutation.isPending) return;
    mutation.mutate(prepared.request, {
      onSuccess: (saved) => setResult(saved as ProjectImportResult),
    });
  }

  const shownRows = prepared?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [];
  const template = templateContents(
    templateResource,
    templateResource === "package" ? "json" : templateFormat,
  );

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending || isError || !data}
        onClick={() => setOpen(true)}
      >
        <FileUp aria-hidden="true" /> Import
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
            <DialogTitle>Import Projects data</DialogTitle>
            <DialogDescription>
              Select a CSV single-resource file or a JSON array/package. ILTO
              parses it locally for preview, then sends one authenticated batch
              request only after confirmation.
            </DialogDescription>
          </DialogHeader>

          {!result && (
            <form onSubmit={preview} className="space-y-5">
              <fieldset disabled={mutation.isPending} className="space-y-5">
                <section className="space-y-2" aria-labelledby="import-source">
                  <h2 id="import-source" className="font-semibold">
                    1. Source
                  </h2>
                  <Label htmlFor="projects-import-file">CSV or JSON file</Label>
                  <input
                    key={fileInputKey}
                    id="projects-import-file"
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    className="block w-full rounded-md border bg-background p-2 text-sm"
                    onChange={(event) =>
                      void selectFile(event.target.files?.[0])
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Processed in this browser for preview; file contents are not
                    stored in localStorage or sent to a third party. Frontend
                    limit: 2 MB and 2,000 rows.
                  </p>
                  {fileName && <p className="text-sm">Selected: {fileName}</p>}
                </section>

                <details className="rounded-md border p-3">
                  <summary className="cursor-pointer font-medium">
                    View or download a format example
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1 text-sm">
                      <span className="block">Example</span>
                      <select
                        aria-label="Template resource"
                        className="w-full rounded-md border bg-background p-2"
                        value={templateResource}
                        onChange={(event) => {
                          const value = event.target.value as TemplateResource;
                          setTemplateResource(value);
                          if (value === "package") setTemplateFormat("json");
                        }}
                      >
                        {PROJECT_IMPORT_RESOURCES.map((value) => (
                          <option key={value} value={value}>
                            {RESOURCE_LABELS[value]}
                          </option>
                        ))}
                        <option value="package">Project package</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="block">Format</span>
                      <select
                        aria-label="Template format"
                        className="w-full rounded-md border bg-background p-2"
                        value={
                          templateResource === "package"
                            ? "json"
                            : templateFormat
                        }
                        disabled={templateResource === "package"}
                        onChange={(event) =>
                          setTemplateFormat(
                            event.target.value as "csv" | "json",
                          )
                        }
                      >
                        <option value="csv">CSV</option>
                        <option value="json">JSON</option>
                      </select>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="self-end"
                      onClick={() =>
                        downloadTemplate(templateResource, templateFormat)
                      }
                    >
                      <Download aria-hidden="true" /> Download template
                    </Button>
                  </div>
                  <pre className="mt-3 max-h-52 overflow-auto rounded bg-muted p-3 text-xs">
                    {template}
                  </pre>
                </details>

                {source?.kind === "single" && (
                  <section className="space-y-3" aria-labelledby="import-map">
                    <h2 id="import-map" className="font-semibold">
                      2. Resource and field mapping
                    </h2>
                    <label className="block max-w-sm space-y-1 text-sm">
                      <span className="block">What are you importing?</span>
                      <select
                        aria-label="Import resource"
                        required
                        className="w-full rounded-md border bg-background p-2"
                        value={resource}
                        onChange={(event) =>
                          chooseResource(
                            event.target.value as ProjectImportResource,
                          )
                        }
                      >
                        <option value="">Choose a resource</option>
                        {PROJECT_IMPORT_RESOURCES.map((value) => (
                          <option key={value} value={value}>
                            {RESOURCE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {resource && (
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-left text-sm">
                          <caption className="sr-only">
                            Map source fields to ILTO fields
                          </caption>
                          <thead className="bg-muted text-xs">
                            <tr>
                              <th className="p-2">Source field</th>
                              <th className="p-2">ILTO field</th>
                            </tr>
                          </thead>
                          <tbody>
                            {source.fields.map((field) => (
                              <tr key={field} className="border-t">
                                <td className="p-2 font-mono text-xs">
                                  {field}
                                </td>
                                <td className="p-2">
                                  <select
                                    aria-label={`Map ${field}`}
                                    className="w-full rounded-md border bg-background p-2"
                                    value={mapping[field] ?? ""}
                                    onChange={(event) => {
                                      setPrepared(null);
                                      setMapping((current) => ({
                                        ...current,
                                        [field]: event.target.value || null,
                                      }));
                                    }}
                                  >
                                    <option value="">Ignore field</option>
                                    {importFields(resource).map((target) => (
                                      <option
                                        key={target.key}
                                        value={target.key}
                                      >
                                        {target.label}
                                        {target.required ? " *" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {mappingMessage && (
                      <p role="alert" className="text-sm text-destructive">
                        {mappingMessage}
                      </p>
                    )}
                  </section>
                )}

                {source?.kind === "package" && (
                  <section
                    className="space-y-1"
                    aria-labelledby="package-found"
                  >
                    <h2 id="package-found" className="font-semibold">
                      2. JSON package recognized
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {PROJECT_IMPORT_RESOURCES.map(
                        (value) =>
                          `${RESOURCE_LABELS[value]}: ${source.resources[value].length}`,
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
                    disabled={
                      !data ||
                      (source.kind === "single" &&
                        (!resource || Boolean(mappingMessage)))
                    }
                  >
                    Build preview
                  </Button>
                )}

                {prepared && (
                  <section
                    className="space-y-3"
                    aria-labelledby="import-preview"
                  >
                    <div>
                      <h2 id="import-preview" className="font-semibold">
                        3. Preview
                      </h2>
                      <p className="text-sm">
                        {prepared.rows.length} rows detected · {prepared.valid}{" "}
                        valid · {prepared.warnings} warnings ·{" "}
                        {prepared.invalid} invalid
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This is client-side pre-validation. The backend remains
                        authoritative for ownership, duplicates, relationships,
                        constraints, and transactionality.
                      </p>
                    </div>
                    <div className="max-h-80 overflow-auto rounded-md border">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <caption className="sr-only">
                          Projects import preview
                        </caption>
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="p-2">Row</th>
                            <th className="p-2">Resource</th>
                            <th className="p-2">Name/title</th>
                            <th className="p-2">Relationship</th>
                            <th className="p-2">Category</th>
                            <th className="p-2">Priority</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shownRows.map((row) => (
                            <tr
                              key={`${row.resource}-${row.row}`}
                              className="border-t align-top"
                            >
                              <td className="p-2">{row.row}</td>
                              <td className="p-2">{row.resource}</td>
                              <td className="p-2">{row.label}</td>
                              <td className="p-2">{row.relationship}</td>
                              <td className="p-2">{row.category || "—"}</td>
                              <td className="p-2">{row.priority || "—"}</td>
                              <td className="p-2">{row.taskStatus || "—"}</td>
                              <td className="p-2">
                                <span className="font-semibold uppercase">
                                  {row.status}
                                </span>
                                {row.issues.map((issue) => (
                                  <span key={issue} className="mt-1 block">
                                    {issue}
                                  </span>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {prepared.rows.length > PREVIEW_ROW_LIMIT && (
                      <p className="text-xs text-muted-foreground">
                        Showing the first {PREVIEW_ROW_LIMIT} rows; all{" "}
                        {prepared.rows.length} rows were validated and are
                        included in the summary.
                      </p>
                    )}
                    {prepared.invalid > 0 && (
                      <p role="alert" className="text-sm text-destructive">
                        Resolve every invalid row before importing. Invalid rows
                        are never silently discarded.
                      </p>
                    )}
                    {mutation.error && (
                      <p role="alert" className="text-sm text-destructive">
                        {importError(mutation.error)}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" onClick={close}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={prepared.invalid > 0 || mutation.isPending}
                        onClick={confirmImport}
                      >
                        {mutation.isPending
                          ? "Importing…"
                          : `Confirm import (${prepared.valid + prepared.warnings})`}
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
                  The backend confirmed the batch and Projects data was
                  refreshed.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PROJECT_IMPORT_RESOURCES.map((value) => (
                  <div key={value} className="rounded-md border p-3">
                    <dt className="text-xs text-muted-foreground">
                      {RESOURCE_LABELS[value]}
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
                  {result.warnings.map((warning, index) => (
                    <li
                      key={`${warning.resource}-${warning.row}-${warning.code}-${index}`}
                    >
                      {warning.resource} row {warning.row}: {warning.message}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end">
                <Button type="button" onClick={close}>
                  Done
                </Button>
              </div>
            </section>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

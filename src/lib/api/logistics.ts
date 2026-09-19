import { getArray } from "./resource.ts";
/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId } from "./resource.ts";
import type {
  Trip,
  DocumentRecord,
  ChecklistTemplate,
  ChecklistItem,
  LogisticsEvent,
} from "./types.ts";

export function getTrips(options: ApiRequestOptions = {}): Promise<Trip[]> {
  return getArray<Trip>(`/logistics/trips`, options);
}

export function getChecklists(
  options: ApiRequestOptions = {},
): Promise<ChecklistTemplate[]> {
  return getArray<ChecklistTemplate>(`/logistics/checklists`, options);
}

export function getDocuments(
  options: ApiRequestOptions = {},
): Promise<DocumentRecord[]> {
  return getArray<DocumentRecord>(`/logistics/documents`, options);
}

export function getLogisticsEvents(
  options: ApiRequestOptions = {},
): Promise<LogisticsEvent[]> {
  return getArray<LogisticsEvent>(`/logistics/events`, options);
}

export type CreateTripInput = Omit<Trip, "id">;
export type UpdateTripInput = Partial<CreateTripInput>;

export function createTrip(
  input: CreateTripInput,
  options: ApiRequestOptions = {},
): Promise<Trip> {
  return apiClient.post<Trip>("/logistics/trips", input, options);
}

export function updateTrip(
  id: string,
  input: UpdateTripInput,
  options: ApiRequestOptions = {},
): Promise<Trip> {
  return apiClient.patch<Trip>(
    `/logistics/trips/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteTrip(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/logistics/trips/${encodeId(id)}`, options);
}

export type CreateDocumentInput = Omit<
  DocumentRecord,
  "id" | "days_until_expiry" | "status"
>;
export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export function createDocument(
  input: CreateDocumentInput,
  options: ApiRequestOptions = {},
): Promise<DocumentRecord> {
  return apiClient.post<DocumentRecord>("/logistics/documents", input, options);
}

export function updateDocument(
  id: string,
  input: UpdateDocumentInput,
  options: ApiRequestOptions = {},
): Promise<DocumentRecord> {
  return apiClient.patch<DocumentRecord>(
    `/logistics/documents/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteDocument(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/logistics/documents/${encodeId(id)}`, options);
}

export type CreateLogisticsEventInput = Omit<LogisticsEvent, "id">;
export type UpdateLogisticsEventInput = Partial<CreateLogisticsEventInput>;

export function createLogisticsEvent(
  input: CreateLogisticsEventInput,
  options: ApiRequestOptions = {},
): Promise<LogisticsEvent> {
  return apiClient.post<LogisticsEvent>("/logistics/events", input, options);
}

export function updateLogisticsEvent(
  id: string,
  input: UpdateLogisticsEventInput,
  options: ApiRequestOptions = {},
): Promise<LogisticsEvent> {
  return apiClient.patch<LogisticsEvent>(
    `/logistics/events/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteLogisticsEvent(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/logistics/events/${encodeId(id)}`, options);
}

export function updateChecklistItem(
  checklistId: string,
  itemId: string,
  input: Pick<ChecklistItem, "completed">,
  options: ApiRequestOptions = {},
): Promise<ChecklistItem> {
  return apiClient.patch<ChecklistItem>(
    `/logistics/checklists/${encodeId(checklistId)}/items/${encodeId(itemId)}`,
    { completed: input.completed },
    options,
  );
}

export function resetChecklist(
  id: string,
  options: ApiRequestOptions = {},
): Promise<ChecklistTemplate> {
  return apiClient.post<ChecklistTemplate>(
    `/logistics/checklists/${encodeId(id)}/reset`,
    {},
    options,
  );
}

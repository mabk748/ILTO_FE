import { getArray } from "./resource.ts";
/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId } from "./resource.ts";
import type {
  CareerMilestone,
  Certification,
  WorkDeadline,
  ComplianceItem,
} from "./types.ts";

export function getCareerMilestones(
  options: ApiRequestOptions = {},
): Promise<CareerMilestone[]> {
  return getArray<CareerMilestone>(`/work/career-milestones`, options);
}

export function getCertifications(
  options: ApiRequestOptions = {},
): Promise<Certification[]> {
  return getArray<Certification>(`/work/certifications`, options);
}

export function getDeadlines(
  options: ApiRequestOptions = {},
): Promise<WorkDeadline[]> {
  return getArray<WorkDeadline>(`/work/deadlines`, options);
}

export function getComplianceItems(
  options: ApiRequestOptions = {},
): Promise<ComplianceItem[]> {
  return getArray<ComplianceItem>(`/work/compliance`, options);
}

export type DeadlineStatusInput = "pending" | "completed";
export type CreateDeadlineInput = Omit<WorkDeadline, "id" | "status"> & {
  status: DeadlineStatusInput;
};
export type UpdateDeadlineInput = Partial<CreateDeadlineInput>;

export function createDeadline(
  input: CreateDeadlineInput,
  options: ApiRequestOptions = {},
): Promise<WorkDeadline> {
  return apiClient.post<WorkDeadline>("/work/deadlines", input, options);
}

export function updateDeadline(
  id: string,
  input: UpdateDeadlineInput,
  options: ApiRequestOptions = {},
): Promise<WorkDeadline> {
  return apiClient.patch<WorkDeadline>(
    `/work/deadlines/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteDeadline(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/work/deadlines/${encodeId(id)}`, options);
}

export type CreateCertificationInput = Omit<Certification, "id">;
export type UpdateCertificationInput = Partial<CreateCertificationInput>;

export function createCertification(
  input: CreateCertificationInput,
  options: ApiRequestOptions = {},
): Promise<Certification> {
  return apiClient.post<Certification>("/work/certifications", input, options);
}

export function updateCertification(
  id: string,
  input: UpdateCertificationInput,
  options: ApiRequestOptions = {},
): Promise<Certification> {
  return apiClient.patch<Certification>(
    `/work/certifications/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteCertification(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/work/certifications/${encodeId(id)}`, options);
}

export function updateComplianceItem(
  id: string,
  input: Pick<ComplianceItem, "completed">,
  options: ApiRequestOptions = {},
): Promise<ComplianceItem> {
  return apiClient.patch<ComplianceItem>(
    `/work/compliance/${encodeId(id)}`,
    { completed: input.completed },
    options,
  );
}

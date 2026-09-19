import { getArray } from "./resource.ts";
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId } from "./resource.ts";
import type { DomainName } from "./types.ts";

export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationStatus = "unread" | "read" | "dismissed";
export type WritableNotificationStatus = Exclude<NotificationStatus, "unread">;

export interface Notification {
  id: string;
  domain: DomainName;
  title: string;
  body: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  created_at: string;
  action_url?: string;
}

export function getNotifications(
  options: ApiRequestOptions = {},
): Promise<Notification[]> {
  return getArray<Notification>("/notifications", options);
}
export function markNotificationRead(
  id: string,
  options: ApiRequestOptions = {},
): Promise<Notification> {
  return updateNotificationStatus(id, "read", options);
}
export function dismissNotification(
  id: string,
  options: ApiRequestOptions = {},
): Promise<Notification> {
  return updateNotificationStatus(id, "dismissed", options);
}

export function updateNotificationStatus(
  id: string,
  status: WritableNotificationStatus,
  options: ApiRequestOptions = {},
): Promise<Notification> {
  return apiClient.patch<Notification>(
    `/notifications/${encodeId(id)}`,
    { status },
    options,
  );
}
export function markAllRead(options: ApiRequestOptions = {}): Promise<void> {
  return apiClient.post("/notifications/read-all", {}, options);
}

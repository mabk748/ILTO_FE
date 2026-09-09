/**
 * Notifications API — aggregates cross-domain alerts
 *
 * INTEGRATION GUIDE:
 * Replace mock generation with: GET /api/v1/notifications
 */

import type { DomainName } from "./types.ts";

export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationStatus = "unread" | "read" | "dismissed";

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

const SIMULATED_DELAY = 150;
const delay = (): Promise<void> =>
  new Promise((r) => setTimeout(r, SIMULATED_DELAY));

const now = new Date();
const ago = (h: number) =>
  new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

const mockNotifications: Notification[] = [
  {
    id: "n1",
    domain: "projects",
    title: "Milestone overdue",
    body: "v0.1 — Data & Monitoring Engines was due Aug 1. 37 days past deadline.",
    severity: "critical",
    status: "unread",
    created_at: ago(2),
    action_url: "/projects",
  },
  {
    id: "n2",
    domain: "projects",
    title: "Sprint ending soon",
    body: "Sprint 2 — Domains ends in 3 days. 2 tasks still in progress.",
    severity: "warning",
    status: "unread",
    created_at: ago(6),
    action_url: "/projects",
  },
  {
    id: "n3",
    domain: "infrastructure",
    title: "Node offline",
    body: "raspberrypi-node has been offline for 4 hours. Last seen 04:31.",
    severity: "critical",
    status: "unread",
    created_at: ago(4),
    action_url: "/infrastructure",
  },
  {
    id: "n4",
    domain: "health",
    title: "Rest day tomorrow",
    body: "Your training plan schedules a rest day. Consider foam rolling or light stretching.",
    severity: "info",
    status: "read",
    created_at: ago(12),
    action_url: "/health",
  },
  {
    id: "n5",
    domain: "finances",
    title: "Budget limit approaching",
    body: "Subscriptions category is at 91% of monthly budget (£182 / £200).",
    severity: "warning",
    status: "unread",
    created_at: ago(8),
    action_url: "/finances",
  },
  {
    id: "n6",
    domain: "finances",
    title: "Bill due in 3 days",
    body: "Rent — £850 due on the 5th. Mark as paid once processed.",
    severity: "warning",
    status: "read",
    created_at: ago(24),
    action_url: "/finances",
  },
  {
    id: "n7",
    domain: "learning",
    title: "7 cards due for review",
    body: "Your spaced-repetition queue has 7 cards overdue. Best reviewed before midnight.",
    severity: "info",
    status: "unread",
    created_at: ago(1),
    action_url: "/learning",
  },
  {
    id: "n8",
    domain: "work",
    title: "Deadline in 48 hours",
    body: "Architecture Review Presentation is due in 2 days. Status: pending.",
    severity: "warning",
    status: "unread",
    created_at: ago(3),
    action_url: "/work",
  },
  {
    id: "n9",
    domain: "social",
    title: "Follow-up overdue",
    body: "You were meant to reach out to James Carter 5 days ago.",
    severity: "warning",
    status: "read",
    created_at: ago(48),
    action_url: "/social",
  },
  {
    id: "n10",
    domain: "logistics",
    title: "Document expiring soon",
    body: "Passport expires in 14 days. Start renewal process now.",
    severity: "critical",
    status: "unread",
    created_at: ago(10),
    action_url: "/logistics",
  },
  {
    id: "n11",
    domain: "infrastructure",
    title: "High CPU usage",
    body: "dev-workstation sustained 87% CPU for 20 minutes. Possible runaway process.",
    severity: "warning",
    status: "read",
    created_at: ago(18),
    action_url: "/infrastructure",
  },
  {
    id: "n12",
    domain: "health",
    title: "HRV drop detected",
    body: "HRV has dropped 18% over the last 3 days. Consider recovery focus.",
    severity: "info",
    status: "read",
    created_at: ago(36),
    action_url: "/health",
  },
];

export async function getNotifications(): Promise<Notification[]> {
  await delay();
  return mockNotifications.map((notification) => ({ ...notification }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await delay();
  const index = mockNotifications.findIndex(
    (notification) => notification.id === id,
  );
  if (index >= 0) {
    mockNotifications[index] = { ...mockNotifications[index], status: "read" };
  }
}

export async function markAllRead(): Promise<void> {
  await delay();
  for (let index = 0; index < mockNotifications.length; index += 1) {
    const notification = mockNotifications[index];
    if (notification.status === "unread") {
      mockNotifications[index] = { ...notification, status: "read" };
    }
  }
}

export async function dismissNotification(id: string): Promise<void> {
  await delay();
  const index = mockNotifications.findIndex(
    (notification) => notification.id === id,
  );
  if (index >= 0) {
    mockNotifications[index] = {
      ...mockNotifications[index],
      status: "dismissed",
    };
  }
}

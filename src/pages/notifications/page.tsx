import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, X, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  getNotifications,
  markAllRead,
  markNotificationRead,
  dismissNotification,
} from "@/lib/api/notifications.ts";
import type {
  Notification,
  NotificationSeverity,
} from "@/lib/api/notifications.ts";
import type { DomainName } from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const DOMAIN_LABELS: Record<DomainName, string> = {
  projects: "Projects",
  infrastructure: "Infrastructure",
  health: "Health",
  finances: "Finances",
  learning: "Learning",
  work: "Work",
  social: "Social",
  appearance: "Appearance",
  logistics: "Logistics",
};

const SEVERITY_STYLES: Record<
  NotificationSeverity,
  { dot: string; badge: string }
> = {
  critical: {
    dot: "bg-destructive",
    badge: "bg-destructive/20 text-destructive border-destructive/30",
  },
  warning: {
    dot: "bg-orange-400",
    badge: "bg-orange-400/20 text-orange-400 border-orange-400/30",
  },
  info: {
    dot: "bg-primary",
    badge: "bg-primary/20 text-primary border-primary/30",
  },
};

const ALL_DOMAINS: (DomainName | "all")[] = [
  "all",
  "projects",
  "infrastructure",
  "health",
  "finances",
  "learning",
  "work",
  "social",
  "appearance",
  "logistics",
];

function NotificationCard({
  notification,
  onRead,
  onDismiss,
}: {
  notification: Notification;
  onRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}) {
  const sev = SEVERITY_STYLES[notification.severity];
  const isUnread = notification.status === "unread";

  return (
    <div
      className={cn(
        "relative flex gap-4 px-4 py-4 border-b border-border last:border-0 transition-colors",
        isUnread ? "bg-card" : "bg-muted/10",
      )}
    >
      {/* Unread dot */}
      <div className="shrink-0 mt-1.5">
        {isUnread ? (
          <div className={cn("w-2 h-2 rounded-full", sev.dot)} />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
              sev.badge,
            )}
          >
            {notification.severity.toUpperCase()}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
            {DOMAIN_LABELS[notification.domain]}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        <p
          className={cn(
            "text-sm font-semibold leading-snug",
            !isUnread && "text-muted-foreground",
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {notification.body}
        </p>

        {notification.action_url && (
          <Link
            to={notification.action_url}
            className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
            onClick={() => void onRead(notification.id)}
          >
            View in {DOMAIN_LABELS[notification.domain]}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-col gap-1">
        {isUnread && (
          <button
            onClick={() => void onRead(notification.id)}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Mark notification as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => void onDismiss(notification.id)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [filterDomain, setFilterDomain] = useState<DomainName | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getNotifications();
      setNotifications(data.filter((n) => n.status !== "dismissed"));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n)),
      );
    } catch {
      toast.error("Could not mark the notification as read");
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error("Could not dismiss the notification");
    }
  };

  const handleMarkAllRead = async () => {
    setActionPending(true);
    try {
      await markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          status: n.status === "unread" ? "read" : n.status,
        })),
      );
    } catch {
      toast.error("Could not mark all notifications as read");
    } finally {
      setActionPending(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterDomain !== "all" && n.domain !== filterDomain) return false;
    if (filterStatus === "unread" && n.status !== "unread") return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary shrink-0" />
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Notifications
          </h1>
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground border-0">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleMarkAllRead()}
            disabled={actionPending}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status filter */}
        <div className="flex gap-2">
          {(["all", "unread"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md border font-medium cursor-pointer transition-colors",
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {s === "all" ? "All" : "Unread"}
              {s === "unread" && unreadCount > 0 && ` (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Domain filter */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDomain(d)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded border font-medium cursor-pointer transition-colors",
                filterDomain === d
                  ? "bg-secondary text-secondary-foreground border-primary/50"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
              )}
            >
              {d === "all" ? "All domains" : DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-lg border border-border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border last:border-0 p-4">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-destructive/40 p-8 text-center">
          <p className="text-sm font-semibold">Could not load notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
          <Button className="mt-4" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold">No notifications</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filterStatus === "unread"
              ? "You're all caught up."
              : "Nothing to show for the current filter."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {filtered.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onRead={handleRead}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

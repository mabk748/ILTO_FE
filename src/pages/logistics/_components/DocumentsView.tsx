import { format } from "date-fns";
import type { DocumentRecord, DocumentType } from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";
import { AlertTriangle, ShieldAlert, FileText } from "lucide-react";
import LogisticsResourceControls from "./LogisticsResourceControls.tsx";

const typeLabel: Record<DocumentType, string> = {
  passport: "Passport",
  id_card: "ID Card",
  drivers_license: "Driver's License",
  visa: "Visa",
  insurance: "Insurance",
  subscription: "Subscription",
  certification: "Certification",
  other: "Other",
};

const statusStyle: Record<DocumentRecord["status"], string> = {
  expired: "bg-red-500/20 text-red-400 border-red-500/40",
  expiring_soon: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  valid: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
};

const statusLabel: Record<DocumentRecord["status"], string> = {
  expired: "Expired",
  expiring_soon: "Expiring soon",
  valid: "Valid",
};

function expiryPill(doc: DocumentRecord) {
  return statusStyle[doc.status];
}

function expiryLabel(doc: DocumentRecord) {
  return statusLabel[doc.status];
}

interface Props {
  documents: DocumentRecord[];
}

export default function DocumentsView({ documents }: Props) {
  const expired = documents.filter((d) => d.status === "expired");
  const expiringSoon = documents.filter((d) => d.status === "expiring_soon");

  // Sort: expired first, then expiring soonest
  const sorted = [...documents].sort((a, b) => {
    const order = { expired: 0, expiring_soon: 1, valid: 2 };
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    const da = a.days_until_expiry ?? 9999;
    const db = b.days_until_expiry ?? 9999;
    return da - db;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Documents</h2>
        <LogisticsResourceControls target={{ kind: "document" }} />
      </div>
      {/* Alert banners */}
      {expired.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>
              {expired.length} document{expired.length > 1 ? "s" : ""} expired:
            </strong>{" "}
            {expired.map((d) => d.name).join(", ")}
          </span>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>{expiringSoon.length} expiring soon:</strong>{" "}
            {expiringSoon.map((d) => d.name).join(", ")}
          </span>
        </div>
      )}

      {/* Document cards */}
      {sorted.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No documents yet.
        </div>
      )}
      <div className="space-y-2">
        {sorted.map((doc) => (
          <div
            key={doc.id}
            className="bg-card border border-border rounded-lg p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {doc.name}
                  </p>
                  {doc.issuer && (
                    <p className="text-xs text-muted-foreground">
                      {doc.issuer}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {typeLabel[doc.type]}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                    expiryPill(doc),
                  )}
                >
                  {expiryLabel(doc)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {doc.expiry_date && (
                <span>
                  Expires {format(new Date(doc.expiry_date), "MMM d, yyyy")}
                </span>
              )}
              {doc.issue_date && (
                <span>
                  Issued {format(new Date(doc.issue_date), "MMM d, yyyy")}
                </span>
              )}
              <span className="text-[10px] italic">
                Start renewal {doc.renewal_lead_days}d before expiry
              </span>
              {doc.days_until_expiry !== null && (
                <span className="text-[10px] italic">
                  {doc.days_until_expiry} day
                  {Math.abs(doc.days_until_expiry) === 1 ? "" : "s"} until
                  expiry
                </span>
              )}
            </div>

            {doc.notes && (
              <p className="text-xs text-muted-foreground italic">
                {doc.notes}
              </p>
            )}
            <LogisticsResourceControls
              target={{ kind: "document", record: doc }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

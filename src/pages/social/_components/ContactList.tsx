import { useState } from "react";
import type {
  Contact,
  RelationshipType,
  ContactStatus,
} from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils.ts";
import ContactControls from "./ContactControls.tsx";

interface Props {
  contacts: Contact[];
}

const RELATIONSHIP_STYLES: Record<RelationshipType, string> = {
  professional: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  personal: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  mentor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  mentee: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  client: "bg-green-500/15 text-green-400 border-green-500/30",
};

const STATUS_DOT: Record<ContactStatus, string> = {
  active: "bg-green-400",
  dormant: "bg-yellow-400",
  lost: "bg-muted-foreground",
};

const ALL_RELATIONSHIPS: RelationshipType[] = [
  "professional",
  "personal",
  "mentor",
  "mentee",
  "client",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ContactList({ contacts }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RelationshipType | "all">("all");

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === "all" || c.relationship === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Contacts</h2>
          <p className="text-xs text-muted-foreground">
            Contact status is selected explicitly; it is not inferred from
            dates.
          </p>
        </div>
        <ContactControls />
      </div>
      <input
        type="text"
        aria-label="Search contacts"
        placeholder="Search by name or tag…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer",
            filter === "all"
              ? "bg-primary/15 text-primary border-primary/30"
              : "border-border text-muted-foreground hover:border-primary",
          )}
        >
          all
        </button>
        {ALL_RELATIONSHIPS.map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer",
              filter === r
                ? "bg-primary/15 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:border-primary",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {contacts.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No contacts yet.
            </CardContent>
          </Card>
        )}
        {contacts.length > 0 && filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No contacts match this search or relationship filter.
            </CardContent>
          </Card>
        )}
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        STATUS_DOT[c.status],
                      )}
                    />
                    <p className="font-medium text-sm">{c.name}</p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        RELATIONSHIP_STYLES[c.relationship],
                      )}
                    >
                      {c.relationship}
                    </span>
                    <ContactControls contact={c} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                    {c.last_contact && (
                      <span>
                        Last:{" "}
                        {formatDistanceToNow(new Date(c.last_contact), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                    {c.next_followup && (
                      <span>
                        Next: {format(new Date(c.next_followup), "MMM d")}
                      </span>
                    )}
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

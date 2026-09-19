import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getContacts,
  getFollowUps,
  getNetworkingGoals,
} from "@/lib/api/social.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Users } from "lucide-react";
import ContactList from "./_components/ContactList.tsx";
import FollowUpList from "./_components/FollowUpList.tsx";
import NetworkingGoals from "./_components/NetworkingGoals.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";

type Tab = "contacts" | "followups" | "goals";

const TABS: { id: Tab; label: string }[] = [
  { id: "contacts", label: "Contacts" },
  { id: "followups", label: "Follow-Ups" },
  { id: "goals", label: "Goals" },
];

export default function SocialPage() {
  const [tab, setTab] = useState<Tab>("contacts");
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["social"],
    queryFn: async ({ signal }) => {
      const [contacts, followUps, goals] = await Promise.all([
        getContacts({ signal }),
        getFollowUps(undefined, { signal }),
        getNetworkingGoals({ signal }),
      ]);
      return { contacts, followUps, goals };
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary shrink-0" />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Social
        </h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <>
          {tab === "contacts" && (
            <ContactList contacts={data?.contacts ?? []} />
          )}
          {tab === "followups" && (
            <FollowUpList followUps={data?.followUps ?? []} />
          )}
          {tab === "goals" && <NetworkingGoals goals={data?.goals ?? []} />}
        </>
      )}
    </div>
  );
}

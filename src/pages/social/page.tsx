import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getContacts,
  getFollowUps,
  getNetworkingGoals,
} from "@/lib/api/social.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Users } from "lucide-react";
import {
  ModuleHeader,
  ModulePage,
  ModuleTabs,
} from "@/components/layout/ModulePage.tsx";
import ContactList from "./_components/ContactList.tsx";
import FollowUpList from "./_components/FollowUpList.tsx";
import NetworkingGoals from "./_components/NetworkingGoals.tsx";
import LoadError from "@/components/LoadError.tsx";

type Tab = "contacts" | "followups" | "goals";

const TABS: { id: Tab; label: string; detail: string }[] = [
  { id: "contacts", label: "Contacts", detail: "Relationship context" },
  { id: "followups", label: "Follow-Ups", detail: "Next conversations" },
  { id: "goals", label: "Goals", detail: "Networking intent" },
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
    <ModulePage>
      <ModuleHeader
        title="Social"
        description="Keep relationship context visible and move the next follow-up forward."
        icon={Users}
        eyebrow="Relationship operating domain"
      />

      <ModuleTabs
        label="Social views"
        items={TABS}
        value={tab}
        onValueChange={setTab}
      />

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
    </ModulePage>
  );
}

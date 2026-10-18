import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Brain, Zap, ScrollText } from "lucide-react";
import { ModuleHeader, ModulePage } from "@/components/layout/ModulePage.tsx";
import CorrelationCharts from "./_components/CorrelationCharts.tsx";
import TriggerBuilder from "./_components/TriggerBuilder.tsx";
import TriggerLog from "./_components/TriggerLog.tsx";

export default function IntelligencePage() {
  return (
    <ModulePage>
      <ModuleHeader
        title="Intelligence"
        description="Compare confirmed cross-domain observations and manage existing automation rules."
        icon={Brain}
        eyebrow="Cross-domain intelligence"
      />

      <Tabs defaultValue="correlations">
        <TabsList
          variant="line"
          className="w-full justify-start"
          aria-label="Intelligence views"
        >
          <TabsTrigger
            value="correlations"
            className="flex items-center gap-1.5"
          >
            <Brain className="h-3.5 w-3.5" />
            Comparisons
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Trigger rules
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            Audit log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="correlations" className="mt-6">
          <CorrelationCharts />
        </TabsContent>

        <TabsContent value="triggers" className="mt-6">
          <TriggerBuilder />
        </TabsContent>

        <TabsContent value="log" className="mt-6">
          <TriggerLog />
        </TabsContent>
      </Tabs>
    </ModulePage>
  );
}

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Brain, Zap, ScrollText } from "lucide-react";
import CorrelationCharts from "./_components/CorrelationCharts.tsx";
import TriggerBuilder from "./_components/TriggerBuilder.tsx";
import TriggerLog from "./_components/TriggerLog.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export default function IntelligencePage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Brain className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-domain comparisons and automation prototypes
          </p>
        </div>
        <Badge
          variant="outline"
          className="ml-auto border-amber-500/40 text-amber-400"
        >
          Simulated demo data
        </Badge>
      </div>

      <Tabs defaultValue="correlations">
        <TabsList>
          <TabsTrigger
            value="correlations"
            className="flex items-center gap-1.5"
          >
            <Brain className="h-3.5 w-3.5" />
            Comparisons
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Rule prototypes
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            Sample log
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
    </div>
  );
}

import { useState } from "react";
import { Settings, Server, Eye, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import type { DomainName } from "@/lib/api/types.ts";
import { useSettings } from "@/components/providers/settings-context.ts";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings.ts";
import { normalizeApiBaseUrl } from "@/lib/api/config.ts";

const DOMAIN_META: { key: DomainName; label: string; description: string }[] = [
  {
    key: "projects",
    label: "Projects",
    description: "Kanban, sprints, milestones, Gantt",
  },
  {
    key: "infrastructure",
    label: "Infrastructure",
    description: "Nodes, metrics, git activity",
  },
  {
    key: "health",
    label: "Health",
    description: "Training plans, workouts, biometrics",
  },
  {
    key: "finances",
    label: "Finances",
    description: "Budget, transactions, net worth",
  },
  {
    key: "learning",
    label: "Learning",
    description: "Roadmaps, skills, SRS cards, reading",
  },
  {
    key: "work",
    label: "Work",
    description: "Career milestones, certs, deadlines",
  },
  {
    key: "social",
    label: "Social",
    description: "Contacts, follow-ups, networking",
  },
  {
    key: "appearance",
    label: "Appearance",
    description: "Wardrobe, outfits, grooming",
  },
  {
    key: "logistics",
    label: "Logistics",
    description: "Trips, documents, checklists",
  },
];

export default function SettingsPage() {
  const {
    settings: persistedSettings,
    updateSettings,
    resetSettings,
  } = useSettings();
  const [settings, setSettings] = useState(persistedSettings);

  const handleSave = () => {
    let apiBaseUrl = settings.apiBaseUrl.trim();
    try {
      if (apiBaseUrl) apiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enter a valid API URL",
      );
      return;
    }

    try {
      const nextSettings = { ...settings, apiBaseUrl };
      updateSettings(nextSettings);
      setSettings(nextSettings);
      toast.success("Settings saved");
    } catch {
      toast.error(
        "Could not save settings. Check that browser storage is available.",
      );
    }
  };

  const handleReset = () => {
    try {
      resetSettings();
      setSettings(normalizeSettings(DEFAULT_SETTINGS));
      toast.info("Settings reset to defaults");
    } catch {
      toast.error(
        "Could not reset settings. Check that browser storage is available.",
      );
    }
  };

  const toggleDomain = (key: DomainName) => {
    setSettings((prev) => ({
      ...prev,
      domainVisibility: {
        ...prev.domainVisibility,
        [key]: !prev.domainVisibility[key],
      },
    }));
  };

  const visibleCount = Object.values(settings.domainVisibility).filter(
    Boolean,
  ).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary shrink-0" />
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Settings
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1.5" />
            Save changes
          </Button>
        </div>
      </div>

      {/* API Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            API Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Save your backend base URL, including its API prefix. Leave blank to
            use the environment default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apiBaseUrl" className="text-xs font-medium">
              API Base URL
            </Label>
            <Input
              id="apiBaseUrl"
              type="url"
              placeholder="http://localhost:8001/api/v1"
              value={settings.apiBaseUrl}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  apiBaseUrl: e.target.value,
                }))
              }
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Example:{" "}
              <span className="font-mono">http://localhost:8001/api/v1</span>.
              Use localhost for both apps so session cookies work. Only save a
              backend URL you trust with your owner credentials.
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5 space-y-1">
            <p className="text-xs font-semibold">Saved API URL</p>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  persistedSettings.apiBaseUrl
                    ? "bg-orange-400"
                    : "bg-muted-foreground",
                )}
              />
              <span className="text-xs text-muted-foreground">
                {persistedSettings.apiBaseUrl ||
                  "Environment default (if configured)"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Saving a different URL clears cached data and checks the session
              on that backend. This does not sign you out of the previous
              backend.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Domain Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Domain Visibility
          </CardTitle>
          <CardDescription className="text-xs">
            Toggle which domains appear in the sidebar and dashboard.{" "}
            <span className="font-semibold text-foreground">
              {visibleCount} of {DOMAIN_META.length}
            </span>{" "}
            active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {DOMAIN_META.map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      !settings.domainVisibility[key] &&
                        "text-muted-foreground",
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={settings.domainVisibility[key]}
                  onCheckedChange={() => toggleDomain(key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center pb-4">
        Settings are stored locally in your browser.
      </p>
    </div>
  );
}

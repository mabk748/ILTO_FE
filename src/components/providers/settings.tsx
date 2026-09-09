import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  normalizeSettings,
  saveSettings,
  type ILTOSettings,
} from "@/lib/settings.ts";
import { SettingsContext } from "./settings-context.ts";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);

  const updateSettings = useCallback((nextSettings: ILTOSettings) => {
    const normalized = normalizeSettings(nextSettings);
    saveSettings(normalized);
    setSettings(normalized);
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = normalizeSettings(DEFAULT_SETTINGS);
    saveSettings(defaults);
    setSettings(defaults);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [resetSettings, settings, updateSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

import { createContext, useContext } from "react";
import type { ILTOSettings } from "@/lib/settings.ts";
import { detectedTimeZone } from "@/lib/time-zone.ts";

export interface SettingsContextValue {
  settings: ILTOSettings;
  updateSettings: (settings: ILTOSettings) => void;
  resetSettings: () => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}

/** Isolated module views may render outside the application provider in tests. */
export function useTimeZone(): string {
  return useContext(SettingsContext)?.settings.timeZone ?? detectedTimeZone();
}

import type { DomainName } from "./api/types.ts";

export const SETTINGS_STORAGE_KEY = "ilto_settings";

export const DOMAIN_NAMES: DomainName[] = [
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

export type DomainVisibility = Record<DomainName, boolean>;

export interface ILTOSettings {
  apiBaseUrl: string;
  domainVisibility: DomainVisibility;
}

export const DEFAULT_DOMAIN_VISIBILITY: DomainVisibility = {
  projects: true,
  infrastructure: true,
  health: true,
  finances: true,
  learning: true,
  work: true,
  social: true,
  appearance: true,
  logistics: true,
};

export const DEFAULT_SETTINGS: ILTOSettings = {
  apiBaseUrl: "",
  domainVisibility: DEFAULT_DOMAIN_VISIBILITY,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeSettings(value: unknown): ILTOSettings {
  const parsed = isRecord(value) ? value : {};
  const visibility = isRecord(parsed.domainVisibility)
    ? parsed.domainVisibility
    : {};

  return {
    apiBaseUrl: typeof parsed.apiBaseUrl === "string" ? parsed.apiBaseUrl : "",
    domainVisibility: Object.fromEntries(
      DOMAIN_NAMES.map((domain) => [
        domain,
        typeof visibility[domain] === "boolean"
          ? visibility[domain]
          : DEFAULT_DOMAIN_VISIBILITY[domain],
      ]),
    ) as DomainVisibility,
  };
}

export function loadSettings(): ILTOSettings {
  if (typeof window === "undefined") return normalizeSettings(DEFAULT_SETTINGS);

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw
      ? normalizeSettings(JSON.parse(raw))
      : normalizeSettings(DEFAULT_SETTINGS);
  } catch {
    return normalizeSettings(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: ILTOSettings): void {
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizeSettings(settings)),
  );
}

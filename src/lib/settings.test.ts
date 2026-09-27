import { beforeEach, describe, expect, it } from "vitest";
import {
  SETTINGS_STORAGE_KEY,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from "./settings.ts";

describe("frontend settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("fills missing domain visibility values with safe defaults", () => {
    const settings = normalizeSettings({
      apiBaseUrl: "http://localhost:8000/api/v1",
      domainVisibility: { projects: false },
    });

    expect(settings.apiBaseUrl).toBe("http://localhost:8000/api/v1");
    expect(settings.domainVisibility.projects).toBe(false);
    expect(settings.domainVisibility.health).toBe(true);
    expect(settings.domainVisibility.appearance).toBe(true);
  });

  it("recovers from malformed persisted JSON", () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, "not-json");

    expect(loadSettings().domainVisibility.projects).toBe(true);
    expect(loadSettings().apiBaseUrl).toBe("");
  });

  it("round-trips normalized settings through local storage", () => {
    const settings = normalizeSettings({
      apiBaseUrl: "https://api.example.test/v1",
      timeZone: "Africa/Casablanca",
      domainVisibility: { social: false },
    });

    saveSettings(settings);

    expect(loadSettings()).toEqual(settings);
  });

  it("preserves a valid IANA time zone", () => {
    expect(normalizeSettings({ timeZone: "Africa/Casablanca" }).timeZone).toBe(
      "Africa/Casablanca",
    );
  });

  it("replaces an invalid time zone with a valid browser fallback", () => {
    expect(
      Intl.DateTimeFormat(undefined, {
        timeZone: normalizeSettings({ timeZone: "bad-zone" }).timeZone,
      }),
    ).toBeInstanceOf(Intl.DateTimeFormat);
  });
});

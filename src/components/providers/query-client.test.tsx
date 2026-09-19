import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsProvider } from "./settings.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { useSettings } from "./settings-context.ts";
import { normalizeSettings, saveSettings } from "@/lib/settings.ts";
import { getNodes } from "@/lib/api/infrastructure.ts";

const fetchMock = vi.fn<typeof fetch>();

function Probe() {
  const { settings, updateSettings } = useSettings();
  const { data, isPending } = useQuery({
    queryKey: ["infrastructure"],
    queryFn: ({ signal }) => getNodes({ signal }),
  });
  return (
    <>
      <button
        onClick={() =>
          updateSettings({
            ...settings,
            apiBaseUrl: "https://b.example.test/api/v1",
          })
        }
      >
        Switch backend
      </button>
      <p>{isPending ? "Loading" : data?.map((node) => node.name).join(",")}</p>
    </>
  );
}

function setup() {
  return render(
    <SettingsProvider>
      <QueryClientProvider>
        <Probe />
      </QueryClientProvider>
    </SettingsProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  saveSettings(
    normalizeSettings({ apiBaseUrl: "https://a.example.test/api/v1" }),
  );
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("backend cache isolation", () => {
  it("removes cached data immediately when the saved backend changes", async () => {
    let resolveSecond!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(Response.json([{ name: "Backend A node" }]))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );
    setup();
    await screen.findByText("Backend A node");
    fireEvent.click(screen.getByRole("button", { name: "Switch backend" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Backend A node")).not.toBeInTheDocument();
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://b.example.test/api/v1/infrastructure/nodes",
    );
    resolveSecond(Response.json([{ name: "Backend B node" }]));
    await screen.findByText("Backend B node");
  });

  it("cancels pending reads from the previous backend", async () => {
    let originalSignal: AbortSignal | undefined;
    fetchMock
      .mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            originalSignal = init?.signal ?? undefined;
            originalSignal?.addEventListener(
              "abort",
              () => reject(originalSignal?.reason),
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce(Response.json([{ name: "New backend" }]));
    setup();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Switch backend" }));
    await screen.findByText("New backend");
    expect(originalSignal?.aborted).toBe(true);
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LogisticsResourceControls from "./LogisticsResourceControls.tsx";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup(children: React.ReactNode, client = new QueryClient()) {
  render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  return client;
}

describe("Logistics resource controls", () => {
  it("sends document writable fields, including null clears and a zero renewal lead, then invalidates only Logistics", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: "document-1" }, { status: 201 }),
    );
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(<LogisticsResourceControls target={{ kind: "document" }} />, client);
    fireEvent.click(screen.getByRole("button", { name: "Create document" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Disposable document" },
    });
    fireEvent.change(screen.getByLabelText("Renewal lead days"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: "Disposable document",
      type: "passport",
      issuer: null,
      issue_date: null,
      expiry_date: null,
      renewal_lead_days: 0,
      notes: "",
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["logistics"] });
  });

  it("retains failed form values and surfaces backend validation failures", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Invalid values" }, { status: 422 }),
    );
    setup(<LogisticsResourceControls target={{ kind: "event" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Disposable event" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "rejected these values",
      ),
    );
    expect(screen.getByDisplayValue("Disposable event")).toBeInTheDocument();
  });

  it("requires a deletion confirmation before issuing DELETE", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(
      <LogisticsResourceControls
        target={{
          kind: "trip",
          record: {
            id: "trip-1",
            name: "Disposable trip",
            destination: "Test city",
            status: "planned",
            departure_date: "2026-09-20T10:00:00.000Z",
            return_date: "2026-09-21T10:00:00.000Z",
            notes: "",
            tags: [],
          },
        }}
      />,
      client,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete trip: Disposable trip" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["logistics"] }),
    );
  });
});

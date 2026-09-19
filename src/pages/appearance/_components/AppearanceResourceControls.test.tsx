import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppearanceResourceControls from "./AppearanceResourceControls.tsx";

const fetchMock = vi.fn<typeof fetch>();
const item = {
  id: "item-1",
  name: "Disposable jacket",
  brand: null,
  category: "outerwear" as const,
  color: "#123456",
  season: "winter" as const,
  condition: "good" as const,
  times_worn: 0,
  last_worn: null,
  purchase_date: null,
  purchase_price: 0,
  tags: [],
  image_placeholder: "#123456",
};

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

describe("Appearance resource controls", () => {
  it("posts selected outfit items and refreshes only Appearance after confirmation", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        id: "outfit-1",
        item_ids: ["item-1"],
        date: "2026-09-17T12:00:00.000Z",
        occasion: "Work",
        rating: 5,
        notes: "",
      }),
    );
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(
      <AppearanceResourceControls
        target={{ kind: "outfit" }}
        wardrobeItems={[item]}
      />,
      client,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create outfit log" }));
    fireEvent.click(screen.getByRole("checkbox", { name: item.name }));
    fireEvent.change(screen.getByLabelText("Occasion"), {
      target: { value: "Work" },
    });
    fireEvent.change(screen.getByLabelText("Rating (1–5)"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      item_ids: ["item-1"],
      occasion: "Work",
      rating: 5,
      date: expect.stringMatching(/Z$/),
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: ["appearance"] },
    ]);
  });

  it("keeps a failed wardrobe form open and displays the API failure", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup(
      <AppearanceResourceControls
        target={{ kind: "wardrobe" }}
        wardrobeItems={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create wardrobe item" }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Disposable jacket" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(screen.getByDisplayValue("Disposable jacket")).toBeInTheDocument();
  });

  it("requires delete confirmation and invalidates Appearance only after the 204 response", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(
      <AppearanceResourceControls
        target={{ kind: "wardrobe", record: item }}
        wardrobeItems={[item]}
      />,
      client,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete wardrobe item: Disposable jacket",
      }),
    );
    expect(
      screen.getByText(/backend may reject this delete/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: ["appearance"] },
    ]);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});

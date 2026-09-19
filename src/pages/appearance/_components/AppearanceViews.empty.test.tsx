import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import AppearanceSpendView from "./AppearanceSpendView.tsx";
import GroomingRoutineList from "./GroomingRoutineList.tsx";
import WardrobeGrid from "./WardrobeGrid.tsx";

function setup(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>,
  );
}

const items = [
  {
    id: "top-1",
    name: "Top item",
    brand: null,
    category: "tops" as const,
    color: "#123456",
    season: "summer" as const,
    condition: "good" as const,
    times_worn: 0,
    last_worn: null,
    purchase_date: null,
    purchase_price: 0,
    tags: [],
    image_placeholder: "#123456",
  },
  {
    id: "bottom-1",
    name: "Bottom item",
    brand: null,
    category: "bottoms" as const,
    color: "#654321",
    season: "winter" as const,
    condition: "good" as const,
    times_worn: 0,
    last_worn: null,
    purchase_date: null,
    purchase_price: null,
    tags: [],
    image_placeholder: "#654321",
  },
];

describe("Appearance views", () => {
  it("shows useful empty states for wardrobe, grooming, outfit logs, and spend", () => {
    setup(
      <>
        <WardrobeGrid items={[]} />
        <GroomingRoutineList routines={[]} outfitLogs={[]} wardrobeItems={[]} />
        <AppearanceSpendView spend={[]} />
      </>,
    );
    expect(screen.getByText("No wardrobe items yet.")).toBeInTheDocument();
    expect(
      screen.getByText("No imported grooming routines."),
    ).toBeInTheDocument();
    expect(screen.getByText("No outfit logs yet.")).toBeInTheDocument();
    expect(
      screen.getByText("No imported appearance spending records."),
    ).toBeInTheDocument();
  });

  it("filters wardrobe cards and distinguishes a filtered empty result", () => {
    setup(<WardrobeGrid items={items} />);
    expect(
      screen.getByRole("button", { name: "Edit wardrobe item: Top item" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit wardrobe item: Bottom item" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tops" }));
    expect(
      screen.getByRole("button", { name: "Edit wardrobe item: Top item" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit wardrobe item: Bottom item" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Season:"), {
      target: { value: "winter" },
    });
    expect(
      screen.getByText("No wardrobe items match the selected filters."),
    ).toBeInTheDocument();
  });

  it("keeps a deleted wardrobe reference visible in historical outfit logs", () => {
    setup(
      <GroomingRoutineList
        routines={[]}
        wardrobeItems={[]}
        outfitLogs={[
          {
            id: "outfit-1",
            item_ids: ["deleted-item"],
            date: "2026-09-17T10:00:00.000Z",
            occasion: "Historical outfit",
            rating: 4,
            notes: "",
          },
        ]}
      />,
    );
    expect(screen.getByText("Historical outfit")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This historical outfit references a deleted wardrobe item.",
      ),
    ).toBeInTheDocument();
  });

  it("labels a retained historical outfit with no remaining wardrobe items", () => {
    setup(
      <GroomingRoutineList
        routines={[]}
        wardrobeItems={[]}
        outfitLogs={[
          {
            id: "outfit-empty-1",
            item_ids: [],
            date: "2026-09-17T10:00:00.000Z",
            occasion: "Retained outfit",
            rating: 4,
            notes: "",
          },
        ]}
      />,
    );
    expect(
      screen.getByText("No wardrobe items remain for this historical outfit."),
    ).toBeInTheDocument();
  });

  it("groups imported spend by currency without aggregating currencies", () => {
    setup(
      <AppearanceSpendView
        spend={[
          {
            id: "eur-1",
            date: "2026-09-17T10:00:00.000Z",
            item_name: "EUR item",
            category: "tops",
            amount: 10,
            currency: "EUR",
            notes: "",
          },
          {
            id: "usd-1",
            date: "2026-09-16T10:00:00.000Z",
            item_name: "USD item",
            category: "tops",
            amount: 20,
            currency: "USD",
            notes: "",
          },
        ]}
      />,
    );
    expect(screen.getByText("EUR total (all stored)")).toBeInTheDocument();
    expect(screen.getByText("USD total (all stored)")).toBeInTheDocument();
    expect(
      screen.queryByText("Total Appearance Spend (YTD)"),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: "USD" },
    });
    expect(
      screen.getByText("USD appearance spend (all stored records)"),
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import ChecklistsView from "./ChecklistsView.tsx";
import DocumentsView from "./DocumentsView.tsx";
import EventCalendar from "./EventCalendar.tsx";

function setup(children: React.ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>,
  );
}

describe("Logistics empty states", () => {
  it("makes empty imported checklists explicit", () => {
    setup(<ChecklistsView checklists={[]} />);
    expect(screen.getByText("No imported checklists yet.")).toBeInTheDocument();
  });

  it("makes empty documents explicit", () => {
    setup(<DocumentsView documents={[]} />);
    expect(screen.getByText("No documents yet.")).toBeInTheDocument();
  });

  it("makes empty events and trips explicit", () => {
    setup(<EventCalendar events={[]} trips={[]} />);
    expect(screen.getByText("No logistics events yet.")).toBeInTheDocument();
    expect(screen.getByText("No trips yet.")).toBeInTheDocument();
  });

  it("retains events whose backend trip link is null", () => {
    setup(
      <EventCalendar
        trips={[]}
        events={[
          {
            id: "event-1",
            title: "Unlinked historical event",
            type: "appointment",
            date: "2026-09-20T10:00:00.000Z",
            end_date: null,
            linked_trip_id: null,
            notes: "",
            completed: false,
          },
        ]}
      />,
    );
    expect(screen.getByText("Unlinked historical event")).toBeInTheDocument();
  });
});

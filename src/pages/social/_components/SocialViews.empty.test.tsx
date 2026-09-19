import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import ContactList from "./ContactList.tsx";
import FollowUpList from "./FollowUpList.tsx";
import NetworkingGoals from "./NetworkingGoals.tsx";

function setup(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>,
  );
}

describe("Social views", () => {
  it("shows explicit empty contacts, follow-ups, and goal states", () => {
    setup(
      <>
        <ContactList contacts={[]} />
        <FollowUpList followUps={[]} />
        <NetworkingGoals goals={[]} />
      </>,
    );
    expect(screen.getByText("No contacts yet.")).toBeInTheDocument();
    expect(screen.getByText("No follow-up prompts yet.")).toBeInTheDocument();
    expect(screen.getByText("No networking goals yet.")).toBeInTheDocument();
  });

  it("distinguishes an empty search result from an empty contact collection", () => {
    setup(
      <ContactList
        contacts={[
          {
            id: "contact-1",
            name: "Existing contact",
            email: null,
            phone: null,
            relationship: "professional",
            status: "active",
            last_contact: null,
            next_followup: null,
            notes: "",
            tags: ["frontend"],
          },
        ]}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Search contacts" }), {
      target: { value: "missing" },
    });
    expect(
      screen.getByText("No contacts match this search or relationship filter."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No contacts yet.")).not.toBeInTheDocument();
  });

  it("clamps goal progress while displaying actual values", () => {
    setup(
      <NetworkingGoals
        goals={[
          {
            id: "goal-1",
            title: "Networking goal",
            target_contacts: 10,
            current_contacts: 15,
            due_date: "2026-09-20T10:00:00.000Z",
            status: "active",
          },
        ]}
      />,
    );
    expect(screen.getByText("15 / 10 contacts")).toBeInTheDocument();
    expect(screen.getByText("150%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Networking goal networking progress",
      }),
    ).toHaveAttribute("aria-valuenow", "100");
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DomainHealthCard } from "./page.tsx";

function TestIcon() {
  return <span aria-hidden="true" />;
}

describe("Dashboard domain score presentation", () => {
  it("renders a missing score as neutral No data instead of Critical", () => {
    render(
      <MemoryRouter>
        <DomainHealthCard
          domain="finances"
          label="Finances"
          icon={TestIcon}
          path="/finances"
          score={null}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          metrics={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("Critical")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});

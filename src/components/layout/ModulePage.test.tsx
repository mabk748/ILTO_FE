import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ModuleHeader, ModuleTabs } from "./ModulePage.tsx";

describe("module page composition", () => {
  it("exposes the module identity and header actions", () => {
    const action = vi.fn();
    render(
      <ModuleHeader
        title="Horizon"
        description="Coordinate upcoming commitments."
        icon={Activity}
        actions={<button onClick={action}>Add commitment</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Horizon" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Coordinate upcoming commitments.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Add commitment" }));
    expect(action).toHaveBeenCalledOnce();
  });

  it("keeps the current module view explicit and keyboard-operable", () => {
    function Example() {
      const [view, setView] = useState<"current" | "history">("current");
      return (
        <ModuleTabs
          label="Example views"
          value={view}
          onValueChange={setView}
          items={[
            { id: "current", label: "Current", detail: "Current records" },
            { id: "history", label: "History", detail: "Previous records" },
          ]}
        />
      );
    }

    const { container } = render(<Example />);
    const current = screen.getByRole("button", { name: /Current/ });
    const history = screen.getByRole("button", { name: /History/ });
    expect(
      screen.getByRole("navigation", { name: "Example views" }),
    ).toBeVisible();
    expect(container.querySelector("nav")).toHaveClass(
      "overflow-x-auto",
      "overflow-y-hidden",
      "scrollbar-none",
    );
    expect(current).toHaveAttribute("aria-pressed", "true");
    expect(history).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(history);
    expect(current).toHaveAttribute("aria-pressed", "false");
    expect(history).toHaveAttribute("aria-pressed", "true");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./progress.tsx";

describe("Progress accessibility", () => {
  it("exposes the normalized numeric value to assistive technology", () => {
    const { rerender } = render(
      <Progress aria-label="Completion" value={37} />,
    );
    const progress = screen.getByRole("progressbar", { name: "Completion" });
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
    expect(progress).toHaveAttribute("aria-valuenow", "37");

    rerender(<Progress aria-label="Completion" value={140} />);
    expect(progress).toHaveAttribute("aria-valuenow", "100");
    rerender(<Progress aria-label="Completion" value={-4} />);
    expect(progress).toHaveAttribute("aria-valuenow", "0");
  });

  it("uses indeterminate semantics when no finite value is available", () => {
    render(<Progress aria-label="Loading" value={Number.NaN} />);
    expect(
      screen.getByRole("progressbar", { name: "Loading" }),
    ).not.toHaveAttribute("aria-valuenow");
  });
});

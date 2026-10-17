import { render, screen } from "@testing-library/react";
import { Outlet } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

vi.mock("./components/layout/RequireOwner.tsx", () => ({
  default: () => <Outlet />,
}));
vi.mock("./components/layout/AppLayout.tsx", () => ({
  default: () => <Outlet />,
}));
vi.mock("./pages/horizon/page.tsx", () => ({
  default: () => <h1>Horizon route</h1>,
}));
vi.mock("./pages/dashboard/page.tsx", () => ({
  default: () => <h1>Dashboard route</h1>,
}));
vi.mock("./pages/projects/workspace.tsx", () => ({
  default: () => <h1>Project workspace route</h1>,
}));

describe("authenticated top-level routing", () => {
  beforeEach(() => window.history.replaceState({}, "", "/"));

  it("redirects the authenticated root experience to Horizon", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Horizon route" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/horizon");
  });

  it("keeps Dashboard directly accessible", async () => {
    window.history.replaceState({}, "", "/dashboard");
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Dashboard route" }),
    ).toBeInTheDocument();
  });

  it.each(["", "/now?task=t1", "/next", "/explore?view=board"])(
    "registers workspace deep links in the application router: %s",
    async (suffix) => {
      window.history.replaceState({}, "", `/projects/p1${suffix}`);
      render(<App />);
      expect(
        await screen.findByRole("heading", { name: "Project workspace route" }),
      ).toBeVisible();
    },
  );
});

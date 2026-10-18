import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs, TabsList, TabsTrigger } from "./tabs.tsx";

describe("Tabs overflow", () => {
  it("keeps wide navigation horizontal without a native vertical scrollbar", () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList aria-label="Views">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const list = screen.getByRole("tablist", { name: "Views" });
    expect(list).toHaveClass(
      "overflow-x-auto",
      "overflow-y-hidden",
      "scrollbar-none",
    );
    const architecture = screen.getByRole("tab", { name: "Architecture" });
    architecture.focus();
    fireEvent.focus(architecture);
    expect(architecture).toHaveFocus();
  });
});

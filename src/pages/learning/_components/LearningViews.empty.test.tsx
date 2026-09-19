import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import RoadmapList from "./RoadmapList.tsx";
import ReadingList from "./ReadingList.tsx";
import ReviewQueue from "./ReviewQueue.tsx";

describe("Learning views", () => {
  it("shows explicit roadmap, reading, and review-queue empty states", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RoadmapList roadmaps={[]} skills={[]} />
        <ReadingList entries={[]} />
        <ReviewQueue cards={[]} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("No roadmaps yet.")).toBeInTheDocument();
    expect(screen.getByText("No reading entries yet.")).toBeInTheDocument();
    expect(
      screen.getByText("No cards due for review today."),
    ).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TriggerRuleControls from "./TriggerRuleControls.tsx";

const fetchMock = vi.fn<typeof fetch>();
const rule = {
  id: "rule-1",
  name: "Disposable rule",
  description: "",
  enabled: false,
  condition: {
    domain: "finances" as const,
    metric: "budget_pct",
    operator: ">" as const,
    threshold: 0,
    unit: "%",
  },
  action: {
    type: "flag" as const,
    message: "Review budget",
    target_domain: null,
  },
  created_at: "2026-09-19T10:00:00.000Z",
  last_triggered: null,
  trigger_count: 0,
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

describe("Trigger rule controls", () => {
  it("sends a complete nested rule body with false, zero, and null then refreshes triggers", async () => {
    fetchMock.mockResolvedValue(Response.json(rule, { status: 201 }));
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(<TriggerRuleControls target={{}} />, client);
    fireEvent.click(screen.getByRole("button", { name: "Create rule" }));
    fireEvent.change(screen.getByLabelText("Rule name"), {
      target: { value: "Disposable rule" },
    });
    fireEvent.change(screen.getByLabelText("Action message"), {
      target: { value: "Review budget" },
    });
    fireEvent.change(screen.getByLabelText("Threshold"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByLabelText("Enabled"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: "Disposable rule",
      description: "",
      enabled: false,
      condition: {
        domain: "finances",
        metric: "budget_pct",
        operator: ">",
        threshold: 0,
        unit: "%",
      },
      action: {
        type: "notify",
        message: "Review budget",
        target_domain: null,
      },
    });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["triggers"] }),
    );
  });

  it("keeps a failed edit open and displays the backend validation failure", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Invalid" }, { status: 422 }),
    );
    setup(<TriggerRuleControls target={{ record: rule }} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Edit rule: Disposable rule" }),
    );
    fireEvent.change(screen.getByLabelText("Rule name"), {
      target: { value: "Still here" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "nested condition and action",
      ),
    );
    expect(screen.getByDisplayValue("Still here")).toBeInTheDocument();
  });

  it("requires delete confirmation before the backend rule-and-log cascade", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    setup(<TriggerRuleControls target={{ record: rule }} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Delete rule: Disposable rule" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/also deletes its backend audit logs/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});

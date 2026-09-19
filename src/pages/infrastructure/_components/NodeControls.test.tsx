import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NodeControls from "./NodeControls.tsx";
import type { InfraNode } from "@/lib/api/types.ts";

const fetchMock = vi.fn<typeof fetch>();
const node: InfraNode = {
  id: "node-1",
  name: "Development server",
  hostname: "dev-server",
  type: "server",
  status: "offline",
  ip_address: "192.0.2.10",
  os: "Linux",
  last_seen: null,
};

function setup(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Infrastructure node controls", () => {
  it("posts writable metadata and closes only after server confirmation", async () => {
    fetchMock.mockResolvedValue(Response.json(node, { status: 201 }));
    setup(<NodeControls />);
    fireEvent.click(screen.getByRole("button", { name: "Create node" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Name"), {
      target: { value: node.name },
    });
    fireEvent.change(dialog.getByLabelText("Hostname"), {
      target: { value: node.hostname },
    });
    fireEvent.change(dialog.getByLabelText("IP address"), {
      target: { value: node.ip_address },
    });
    fireEvent.change(dialog.getByLabelText("Operating system"), {
      target: { value: node.os },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: node.name,
      hostname: node.hostname,
      type: node.type,
      ip_address: node.ip_address,
      os: node.os,
    });
  });

  it("keeps a delete dialog open and explains a stored-history conflict", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Stored measurements exist" }, { status: 409 }),
    );
    setup(<NodeControls node={node} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Delete node: Development server" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "stored measurements",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});

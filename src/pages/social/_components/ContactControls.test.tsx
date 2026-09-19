import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContactControls from "./ContactControls.tsx";

const fetchMock = vi.fn<typeof fetch>();

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

describe("Contact controls", () => {
  it("keeps the create form open and reports failed writes", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup(<ContactControls />);
    fireEvent.click(screen.getByRole("button", { name: "Create contact" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Disposable contact" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(screen.getByDisplayValue("Disposable contact")).toBeInTheDocument();
  });

  it("requires confirmation for a contact delete and refreshes Social consumers", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(
      <ContactControls
        contact={{
          id: "contact-1",
          name: "Disposable contact",
          email: null,
          phone: null,
          relationship: "professional",
          status: "active",
          last_contact: null,
          next_followup: null,
          notes: "",
          tags: [],
        }}
      />,
      client,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete contact: Disposable contact",
      }),
    );
    expect(screen.getByText(/dependent follow-up prompts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual(
      expect.arrayContaining([
        { queryKey: ["social"] },
        { queryKey: ["dashboard"] },
      ]),
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
